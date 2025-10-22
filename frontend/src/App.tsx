import Hero from "@/components/Hero";
import TenantSelector from "@/components/TenantSelector";
import { useState } from "react";

export default function App() {
  const [tenantId, setTenantId] = useState<string>("");
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Hero />
      <div className="container mx-auto py-12 space-y-12">
        <TenantSelector tenantId={tenantId} setTenantId={setTenantId} />
      </div>
    </div>
  );
}
