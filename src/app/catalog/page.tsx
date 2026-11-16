"use client";

import React from "react";
import PanelShell from "@/components/PanelShell";
import CatalogBrowser from "@/components/CatalogBrowser";

export default function CatalogPage() {
  return (
    <PanelShell
      title="Catálogo de Jogos"
      subtitle="Catálogo completo da infraestrutura Cubyc com geração rápida e modo Combo"
    >
      <CatalogBrowser
        searchEndpoint="/api/panel/games/search"
        generateEndpoint="/api/panel/keys/generate"
        isAdmin={true}
      />
    </PanelShell>
  );
}
