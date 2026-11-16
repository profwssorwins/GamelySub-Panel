"use client";

import React, { useEffect, useState } from "react";
import PanelShell from "@/components/PanelShell";
import {
  UserPlus,
  Wallet,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Power,
  Code2,
  ExternalLink,
  Link2,
  CheckCircle2,
} from "lucide-react";
import type { SubReseller } from "@/lib/types";

export default function ResellersPage() {
  const [resellers, setResellers] = useState<SubReseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showApiDocs, setShowApiDocs] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [planName, setPlanName] = useState("Padrão");
  const [keyPrice, setKeyPrice] = useState("2.50");
  const [initialBalance, setInitialBalance] = useState("0");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdReseller, setCreatedReseller] = useState<SubReseller | null>(null);

  async function loadResellers() {
    setLoading(true);
    try {
      const res = await fetch("/api/panel/resellers", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data?.resellers)) {
        setResellers(data.resellers);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResellers();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/panel/resellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          planName,
          keyPrice: Number(keyPrice),
          initialBalance: Number(initialBalance),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erro ao criar sub-revendedor.");
      } else {
        setCreatedReseller(data.reseller || null);
        setName("");
        setEmail("");
        setInitialBalance("0");
        await loadResellers();
      }
    } catch {
      setError("Erro de rede ao criar sub-revendedor.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAdjustBalance(reseller: SubReseller, sign: 1 | -1) {
    const raw = window.prompt(
      `${sign === 1 ? "Adicionar" : "Debitar"} saldo (R$) para ${reseller.name}:`,
      "50.00"
    );
    if (!raw) return;
    const val = Number(raw.replace(",", "."));
    if (!Number.isFinite(val) || val <= 0) return;

    await fetch(`/api/panel/resellers/${reseller.id}/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: val * sign }),
    });
    await loadResellers();
  }

  async function handleToggleStatus(reseller: SubReseller) {
    const nextStatus = reseller.status === "active" ? "suspended" : "active";
    await fetch(`/api/panel/resellers/${reseller.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await loadResellers();
  }

  async function handleRegenerateKey(reseller: SubReseller) {
    if (!window.confirm(`Gerar nova API Key para ${reseller.name}? A chave anterior deixará de funcionar.`)) {
      return;
    }
    await fetch(`/api/panel/resellers/${reseller.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerateApiKey: true }),
    });
    await loadResellers();
  }

  async function handleDelete(reseller: SubReseller) {
    if (!window.confirm(`Remover sub-revendedor ${reseller.name}?`)) return;
    await fetch(`/api/panel/resellers/${reseller.id}`, { method: "DELETE" });
    await loadResellers();
  }

  async function copyText(tag: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopiedId(tag);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getPanelUrl(id: string) {
    if (typeof window === "undefined") return `/panel?id=${id}`;
    return `${window.location.origin}/panel?id=${encodeURIComponent(id)}`;
  }

  return (
    <PanelShell
      title="Sub-revendedores"
      subtitle="Gerencie clientes da Gamely, saldos internos, preços por key e API white-label"
    >
      <div className="space-y-6">
        {/* Novo sub-revendedor */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <UserPlus className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">
                Cadastrar Novo Sub-revendedor
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowApiDocs((v) => !v)}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
            >
              <Code2 className="h-3.5 w-3.5 text-blue-400" />
              {showApiDocs ? "Ocultar Docs Sub-API" : "Ver Docs Sub-API"}
            </button>
          </div>

          {showApiDocs && (
            <div className="mb-5 p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <div className="font-semibold text-blue-300">
                Endpoints White-Label para seus Sub-revendedores (Bearer gm_...)
              </div>
              <ul className="space-y-1 font-mono text-[11px] text-zinc-400">
                <li>GET /api/sub/balance — Consulta saldo e plano na Gamely</li>
                <li>GET /api/sub/games/search?q=... — Busca jogos no catálogo</li>
                <li>POST /api/sub/keys/generate — Gera keys debitando do saldo interno do sub-revendedor</li>
              </ul>
            </div>
          )}

          <form
            onSubmit={handleCreate}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome / Loja"
              required
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="Plano (ex: Gold)"
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              value={keyPrice}
              onChange={(e) => setKeyPrice(e.target.value)}
              placeholder="Preço/key (R$)"
              required
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                placeholder="Saldo inicial"
                className="w-28 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={creating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
              >
                {creating ? "..." : "Criar"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2">
              {error}
            </div>
          )}

          {createdReseller && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Sub-revendedor cadastrado: {createdReseller.name}
                </span>
                <button
                  type="button"
                  onClick={() => setCreatedReseller(null)}
                  className="text-zinc-400 hover:text-white cursor-pointer"
                >
                  Fechar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex items-center justify-between gap-2 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-[10px] text-zinc-500">ID de Acesso</div>
                    <div className="font-mono text-white font-semibold">
                      {createdReseller.id}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(`created-id`, createdReseller.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    {copiedId === "created-id" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copiar ID
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-2">
                  <div className="truncate">
                    <div className="text-[10px] text-zinc-500">Link Direto do Painel</div>
                    <div className="font-mono text-blue-300 truncate">
                      {getPanelUrl(createdReseller.id)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(`created-link`, getPanelUrl(createdReseller.id))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white shrink-0 cursor-pointer"
                  >
                    {copiedId === "created-link" ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Link2 className="h-3.5 w-3.5" />
                    )}
                    Copiar Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lista */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Clientes Cadastrados ({resellers.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Carregando sub-revendedores...
            </div>
          ) : resellers.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Nenhum sub-revendedor cadastrado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-medium">ID</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Plano / Preço Key</th>
                    <th className="px-5 py-3 font-medium">Saldo Interno</th>
                    <th className="px-5 py-3 font-medium">Keys</th>
                    <th className="px-5 py-3 font-medium">API Key Gamely</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {resellers.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-900/30">
                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 font-mono text-[11px] text-blue-300">
                          <span>{r.id}</span>
                          <button
                            onClick={() => copyText(`id-${r.id}`, r.id)}
                            title="Copiar ID"
                            className="text-zinc-400 hover:text-white cursor-pointer"
                          >
                            {copiedId === `id-${r.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-white">{r.name}</div>
                        <div className="text-[11px] text-zinc-500">{r.email}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-zinc-200">{r.planName}</div>
                        <div className="text-[11px] text-blue-300">
                          R$ {r.keyPrice.toFixed(2)} / key
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-emerald-400">
                        R$ {r.balance.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-300">
                        {r.totalKeysGenerated}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="inline-flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 font-mono text-[11px] text-zinc-300">
                          <span>{r.apiKey.slice(0, 11)}••••</span>
                          <button
                            onClick={() => copyText(`key-${r.id}`, r.apiKey)}
                            title="Copiar API Key"
                            className="text-zinc-400 hover:text-white cursor-pointer"
                          >
                            {copiedId === `key-${r.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRegenerateKey(r)}
                            title="Regenerar API Key"
                            className="text-zinc-400 hover:text-amber-300 cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            r.status === "active"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-rose-500/15 text-rose-300"
                          }`}
                        >
                          {r.status === "active" ? "Ativo" : "Suspenso"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`/panel?id=${encodeURIComponent(r.id)}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir Painel do Sub-revendedor"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-300 hover:text-white text-[11px] font-medium transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Painel
                          </a>
                          <button
                            onClick={() => copyText(`link-${r.id}`, getPanelUrl(r.id))}
                            title="Copiar Link de Acesso"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                          >
                            {copiedId === `link-${r.id}` ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleAdjustBalance(r, 1)}
                            title="Adicionar saldo"
                            className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-medium cursor-pointer"
                          >
                            + R$
                          </button>
                          <button
                            onClick={() => handleAdjustBalance(r, -1)}
                            title="Debitar saldo"
                            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium cursor-pointer"
                          >
                            <Wallet className="h-3 w-3 inline mr-0.5" />-
                          </button>
                          <button
                            onClick={() => handleToggleStatus(r)}
                            title={r.status === "active" ? "Suspender" : "Ativar"}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                          >
                            <Power className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
                            title="Excluir"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PanelShell>
  );
}
