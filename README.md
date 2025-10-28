# KhawarizMind Platform

This repository contains the KhawarizMind backend microservices and React frontend.

## Persistence layer

The backend services share a SQLite-backed persistence layer. By default a SQLite database file (`khawarizmind.db`) is created under the runtime `Data/` folder when any service starts. Services can override the connection string using the `DB_CONNECTION_STRING` environment variable or the `Database:ConnectionString` entry in their `appsettings.json` files.

> **Production recommendation:** Store the SQLite file on durable storage or replace the connection string with an external relational database (e.g., PostgreSQL) by updating the connection string and EF Core provider packages.

### Changing the connection string

1. Set the environment variable before starting a service:
   ```bash
   export DB_CONNECTION_STRING="Data Source=/var/lib/khawarizmind/app.db"
   ```
2. Alternatively, edit `appsettings.json` per service and set `Database:ConnectionString`.
3. The connection string is resolved centrally in `DocumentManagementSystem.Infrastructure.Persistence` to ensure every service uses the same value.

## Integration secrets configuration

Integration secrets (API keys, webhook secrets, etc.) are read from configuration by the Integration Service using `IntegrationSecretsOptions`.

* Configure secrets through environment variables:
  * `INTEGRATION_API_KEY`
  * `INTEGRATION_WEBHOOK_SECRET`
* or supply them in configuration files under `IntegrationSecrets:ApiKey` and `IntegrationSecrets:WebhookSecret`.

> **Secure storage guidance:** For non-development environments, load secrets from a vault provider (Azure Key Vault, AWS Secrets Manager, HashiCorp Vault, etc.) and project them into the environment variables above instead of committing plain-text values.

The `/integration/health` endpoint reports whether required secrets are configured.

## Local development prerequisites

* .NET 8 SDK
* Node.js 20 with npm 10
* SQLite 3 CLI (optional, for inspecting the database file)

## Running tests and quality checks

* Backend build & tests:
  ```bash
  dotnet test KhawarizMind.sln
  ```
* Frontend unit tests:
  ```bash
  cd KhawarizMind-frontend
  npm test -- --watchAll=false
  ```
* Frontend linting:
  ```bash
  cd KhawarizMind-frontend
  npm run lint
  ```

## Continuous Integration

GitHub Actions workflow `.github/workflows/ci.yml` executes:

1. `dotnet test KhawarizMind.sln`
2. `npm test -- --watchAll=false`
3. `npm run lint`

## Deployment notes

1. Provision configuration management capable of supplying the database connection string and integration secrets as environment variables.
2. Ensure shared storage (local path or managed database) is accessible to each backend service before startup.
3. Start backend services in the following order:
   1. **AuthService** – initializes the shared database and authentication layer.
   2. **IntegrationService** – validates integration secrets on startup.
   3. Remaining services (DocumentService, WorkflowService, etc.) once the shared database is available.
4. Start the React frontend after backend APIs are healthy.

Refer to individual service `appsettings.json` files for additional service-specific configuration.
