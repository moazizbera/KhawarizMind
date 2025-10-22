export default function TenantSelector({ tenantId, setTenantId }: { tenantId: string; setTenantId: (id: string) => void }) {
  const tenants = [{ id: "1", name: "Company A" }, { id: "2", name: "Company B" }];
  return (
    <select value={tenantId} onChange={(e) => setTenantId(e.target.value)} className="p-2 rounded bg-gray-700 border border-gray-600">
      <option value="">Select Tenant</option>
      {tenants.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select>
  );
}
