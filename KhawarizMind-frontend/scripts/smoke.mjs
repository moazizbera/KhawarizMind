#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const backendRoot = path.join(repoRoot, 'KhawarizMind-backend');

const services = [
  {
    name: 'ai',
    project: path.join(backendRoot, 'AIService', 'DocumentManagementSystem.AIService.csproj'),
    port: Number(process.env.KM_AI_PORT ?? 5091),
  },
  {
    name: 'workflow',
    project: path.join(backendRoot, 'WorkflowService', 'DocumentManagementSystem.WorkflowService.csproj'),
    port: Number(process.env.KM_WORKFLOW_PORT ?? 5092),
  },
];

async function startService({ name, project, port }) {
  const args = ['run', '--no-build', '--project', project, '--urls', `http://127.0.0.1:${port}`];
  const proc = spawn('dotnet', args, {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');

  const readyPattern = new RegExp(`:${port}`);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`${name} service did not start within timeout`));
    }, 20000);

    const onStdout = (data) => {
      process.stdout.write(`[${name}] ${data}`);
      if (readyPattern.test(data)) {
        cleanup();
        resolve();
      }
    };

    const onStderr = (data) => {
      process.stderr.write(`[${name}:err] ${data}`);
    };

    const onExit = (code) => {
      cleanup();
      reject(new Error(`${name} service exited early with code ${code}`));
    };

    const cleanup = () => {
      clearTimeout(timeout);
      proc.stdout.off('data', onStdout);
      proc.stderr.off('data', onStderr);
      proc.off('exit', onExit);
    };

    proc.stdout.on('data', onStdout);
    proc.stderr.on('data', onStderr);
    proc.once('exit', onExit);
  });

  return proc;
}

async function stopService({ name, proc }) {
  if (!proc || proc.killed) {
    return;
  }

  proc.kill('SIGINT');
  try {
    await Promise.race([once(proc, 'exit'), delay(3000)]);
  } catch {
    // ignore and escalate to SIGKILL
  }

  if (!proc.killed) {
    proc.kill('SIGKILL');
    await Promise.race([once(proc, 'exit'), delay(2000)]);
  }

  process.stdout.write(`[${name}] stopped\n`);
}

async function runAiSmoke(baseUrl) {
  const headers = { 'Content-Type': 'application/json', 'X-Roles': 'ai.query' };

  const promptResponse = await fetch(`${baseUrl}/api/ai/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt: 'Smoke test prompt',
      contextLabel: 'Smoke Suite',
      stream: false,
    }),
  });

  if (!promptResponse.ok) {
    throw new Error(`AI JSON query failed with status ${promptResponse.status}`);
  }

  const promptPayload = await promptResponse.json();
  if (!promptPayload.answer || typeof promptPayload.answer !== 'string') {
    throw new Error('AI JSON response missing answer');
  }

  const streamResponse = await fetch(`${baseUrl}/api/ai/query`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: 'Streamed smoke response', stream: true }),
  });

  if (!streamResponse.ok || !streamResponse.body) {
    throw new Error(`AI stream query failed with status ${streamResponse.status}`);
  }

  const reader = streamResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
  }

  if (!buffer.includes('[DONE]')) {
    throw new Error('AI stream response missing DONE sentinel');
  }

  if (!buffer.includes('"answer"')) {
    throw new Error('AI stream response missing final answer payload');
  }

  process.stdout.write('[ai] smoke checks passed\n');
}

async function runWorkflowSmoke(baseUrl) {
  const viewerHeaders = {
    Accept: 'application/json',
    'X-Roles': 'workflow.viewer',
  };

  const listResponse = await fetch(`${baseUrl}/api/workflows`, { headers: viewerHeaders });
  if (!listResponse.ok) {
    throw new Error(`Workflow list failed with status ${listResponse.status}`);
  }

  const createHeaders = {
    'Content-Type': 'application/json',
    'X-Roles': 'workflow.viewer, workflow.manager',
  };

  const createPayload = {
    name: 'Smoke workflow',
    description: 'Created by smoke.mjs',
    slaMinutes: 90,
    nodes: [
      { id: 'start', x: 20, y: 20, data: { label: 'Start' } },
      { id: 'done', x: 200, y: 120, data: { label: 'Done' } },
    ],
    edges: [{ source: 'start', target: 'done', label: 'complete' }],
  };

  const createResponse = await fetch(`${baseUrl}/api/workflows`, {
    method: 'POST',
    headers: createHeaders,
    body: JSON.stringify(createPayload),
  });

  if (createResponse.status !== 201) {
    throw new Error(`Workflow create failed with status ${createResponse.status}`);
  }

  const createdWorkflow = await createResponse.json();
  if (!createdWorkflow?.id) {
    throw new Error('Workflow create response missing id');
  }

  const activateHeaders = {
    'Content-Type': 'application/json',
    'X-Roles': 'workflow.viewer, workflow.admin',
    'X-Activated-By': 'smoke-script',
  };

  const activateResponse = await fetch(`${baseUrl}/api/workflows/${createdWorkflow.id}/activate`, {
    method: 'POST',
    headers: activateHeaders,
  });

  if (!activateResponse.ok) {
    throw new Error(`Workflow activate failed with status ${activateResponse.status}`);
  }

  const activatedWorkflow = await activateResponse.json();
  if (activatedWorkflow.status !== 'active') {
    throw new Error('Workflow activation did not set active status');
  }

  process.stdout.write('[workflow] smoke checks passed\n');
}

(async () => {
  const started = [];
  try {
    for (const service of services) {
      const proc = await startService(service);
      started.push({ ...service, proc });
    }

    await runAiSmoke(`http://127.0.0.1:${services[0].port}`);
    await runWorkflowSmoke(`http://127.0.0.1:${services[1].port}`);

    process.stdout.write('\nSmoke suite completed successfully.\n');
  } catch (error) {
    console.error('\nSmoke suite failed:', error);
    process.exitCode = 1;
  } finally {
    for (const service of started.reverse()) {
      await stopService(service);
    }
  }
})();
