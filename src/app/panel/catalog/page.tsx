"use client";

import React from "react";
import ResellerShell from "@/components/ResellerShell";
import CatalogBrowser from "@/components/CatalogBrowser";

export default function ResellerCatalogPage() {
  return (
    <ResellerShell
      title="Catálogo de Jogos"
      subtitle="Explore jogos, filtre por categoria ou DRM e gere suas keys na hora"
    >
      <CatalogBrowser
        searchEndpoint="/api/sub/games/search"
        generateEndpoint="/api/sub/keys/generate"
        isAdmin={false}
      />
    </ResellerShell>
  );
}
