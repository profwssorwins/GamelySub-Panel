"use client";

import React, { useEffect, useState } from "react";
import PanelShell from "@/components/PanelShell";
import {
  Search,
  CheckCircle2,
  Clock,
  Users,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";
import type {
  CubycKeyLookupResponse,
  KeyHistoryEntry,
  SubReseller,
} from "@/lib/types";

interface AdminKeyLookupResponse extends CubycKeyLookupResponse {
  localRecord?: {
    id: string;
    subResellerId: string | null;
    subResellerName: string | null;
    chargedResellerAmount: number;
    source: string;
    createdAt: string;
  } | null;
}

export default function KeysPage() {
  const [lookupCode, setLookupCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] =
    useState<AdminKeyLookupResponse | null>(null);

  // Local DB records
  const [records, setRecords] = useState<KeyHistoryEntry[]>([]);
  const [resellers, setResellers] = useState<SubReseller[]>([]);
  const [filterResellerId, setFilterResellerId] = useState("");
  const [filterQuery, setFilterQuery] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadRecords(resellerId = filterResellerId, q = filterQuery) {
    setLoadingRecords(true);
    try {
      const qs = new URLSearchParams();
      if (resellerId) qs.set("subResellerId", resellerId);
      if (q.trim()) qs.set("q", q.trim());

      const res = await fetch(`/api/panel/keys?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (Array.isArray(data?.records)) {
        setRecords(data.records);
      }
    } finally {
      setLoadingRecords(false);
    }
  }

  useEffect(() => {
    fetch("/api/panel/resellers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => Array.isArray(d?.resellers) && setResellers(d.resellers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadRecords(filterResellerId, filterQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterResellerId]);

  async function runLookup(codeToSearch: string) {
    if (!codeToSearch.trim()) return;
    setLookupCode(codeToSearch.trim());
    setLookingUp(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const res = await fetch(
        `/api/panel/keys/${encodeURIComponent(codeToSearch.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data?.error || "Key não encontrada.");
      } else {
        setLookupResult(data);
      }
    } catch {
      setLookupError("Erro de rede ao consultar key.");
    } finally {
      setLookingUp(false);
    }
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <PanelShell
      title="Consultar Keys"
      subtitle="Consulte ativações ao vivo e veja os sub-revendedores vinculados no banco local"
    >
      <div className="space-y-6">
        {/* Consultar Key */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Search className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Consultar Status de Key
              </h2>
              <p className="text-xs text-zinc-400">
                Verifique o status na infraestrutura Cubyc e o sub-revendedor vinculado no DB local
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runLookup(lookupCode);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              placeholder="Cole o código da key..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={lookingUp}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium cursor-pointer"
            >
              {lookingUp ? "Consultando..." : "Consultar"}
            </button>
          </form>

          {lookupError && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className="rounded-xl bg-zinc-900/70 border border-zinc-800 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-mono text-zinc-200 font-semibold">
                  {lookupResult.code}
                </span>
                {lookupResult.status === "redeemed" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resgatada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    Disponível
                  </span>
                )}
              </div>

              <div className="text-zinc-400">
                Jogo(s):{" "}
                <span className="text-zinc-200">
                  {lookupResult.games
                    .map((g) => `${g.name} (#${g.appId})`)
                    .join(", ")}
                </span>
              </div>

              <div className="text-zinc-400">
                Custo Cubyc:{" "}
                <span className="text-zinc-200">
                  R$ {(lookupResult.chargedCents / 100).toFixed(2)}
                </span>
              </div>

              {lookupResult.localRecord ? (
                <div className="flex items-center gap-2 text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    Sub-revendedor vinculado:{" "}
                    <strong>
                      {lookupResult.localRecord.subResellerName || "Uso próprio"}
                    </strong>
                    {lookupResult.localRecord.subResellerId && (
                      <span className="font-mono text-zinc-400 ml-1">
                        ({lookupResult.localRecord.subResellerId})
                      </span>
                    )}
                  </span>
                </div>
              ) : (
                <div className="text-zinc-500">
                  Sem vínculo no DB local (gerada fora deste painel).
                </div>
              )}

              {lookupResult.redeemed && (
                <div className="border-t border-zinc-800 pt-2.5 space-y-1 text-zinc-400">
                  <div>
                    Resgatada em:{" "}
                    <span className="text-zinc-200">
                      {new Date(lookupResult.redeemed.redeemedAt).toLocaleString(
                        "pt-BR"
                      )}
                    </span>
                  </div>
                  {lookupResult.redeemed.activations?.[0] && (
                    <div>
                      IP / País:{" "}
                      <span className="text-zinc-200">
                        {lookupResult.redeemed.activations[0].ip || "—"} (
                        {lookupResult.redeemed.activations[0].countryCode || "—"})
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Keys do DB Local */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                Keys Geradas (DB Local)
              </h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadRecords(filterResellerId, filterQuery);
              }}
              className="flex flex-wrap gap-2"
            >
              <select
                value={filterResellerId}
                onChange={(e) => setFilterResellerId(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">Todos os sub-revendedores</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.id})
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrar por código ou jogo..."
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs text-white cursor-pointer"
              >
                Filtrar
              </button>
            </form>
          </div>

          {loadingRecords ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Carregando registros...
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Nenhuma key encontrada no DB local. Gere keys pelo Catálogo.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Sub-revendedor (ID)</th>
                    <th className="px-5 py-3 font-medium">Jogos</th>
                    <th className="px-5 py-3 font-medium">Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {records.map((batch) => (
                    <tr key={batch.id} className="hover:bg-zinc-900/30 align-top">
                      <td className="px-5 py-3 text-zinc-400 whitespace-nowrap">
                        {new Date(batch.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {batch.subResellerId ? (
                          <div>
                            <div className="text-blue-300 font-medium">
                              {batch.subResellerName}
                            </div>
                            <div className="font-mono text-[10px] text-zinc-500">
                              {batch.subResellerId}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500">Uso próprio</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-zinc-200">
                        {batch.gameNames.length > 0
                          ? batch.gameNames.join(", ")
                          : `AppIDs: ${batch.appIds.join(", ")}`}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {batch.codes.map((code) => (
                            <div
                              key={code}
                              className="inline-flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 font-mono text-[11px] text-zinc-200"
                            >
                              <button
                                type="button"
                                onClick={() => runLookup(code)}
                                title="Consultar status"
                                className="hover:text-blue-300 cursor-pointer"
                              >
                                {code}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopy(code)}
                                title="Copiar"
                                className="text-zinc-500 hover:text-white cursor-pointer"
                              >
                                {copiedCode === code ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ))}
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
