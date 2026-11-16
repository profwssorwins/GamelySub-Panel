"use client";

import React, { useEffect, useState } from "react";
import ResellerShell from "@/components/ResellerShell";
import {
  Search,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  KeyRound,
} from "lucide-react";

interface ResellerKeyLookup {
  code: string;
  status: "available" | "redeemed";
  isCombo: boolean;
  games: Array<{ appId: string; name: string }>;
  createdAt: string;
  redeemed: null | {
    redeemedAt: string;
  };
}

interface ResellerKeyBatch {
  id: string;
  codes: string[];
  gameNames: string[];
  appIds: number[];
  quantity: number;
  isCombo: boolean;
  chargedAmount: number;
  createdAt: string;
}

export default function ResellerKeysPage() {
  const [lookupCode, setLookupCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<ResellerKeyLookup | null>(
    null
  );

  const [records, setRecords] = useState<ResellerKeyBatch[]>([]);
  const [filterQuery, setFilterQuery] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadRecords(q = filterQuery) {
    setLoadingRecords(true);
    try {
      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());

      const res = await fetch(`/api/sub/keys?${qs.toString()}`, {
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
    loadRecords("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runLookup(codeToSearch: string) {
    if (!codeToSearch.trim()) return;
    setLookupCode(codeToSearch.trim());
    setLookingUp(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const res = await fetch(
        `/api/sub/keys/${encodeURIComponent(codeToSearch.trim())}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data?.error || "Key não encontrada.");
      } else {
        setLookupResult(data);
      }
    } catch {
      setLookupError("Erro de conexão ao consultar key.");
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
    <ResellerShell
      title="Consultar Keys"
      subtitle="Consulte o status das suas keys e acesse todo o histórico vinculado à sua conta"
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
                Verifique se uma key vinculada à sua conta já foi resgatada
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
              <div className="flex items-center justify-between">
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

              {lookupResult.redeemed && (
                <div className="border-t border-zinc-800 pt-2.5 text-zinc-400">
                  Resgatada em:{" "}
                  <span className="text-zinc-200">
                    {new Date(lookupResult.redeemed.redeemedAt).toLocaleString(
                      "pt-BR"
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suas Keys Geradas */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white">
                Suas Keys Geradas
              </h3>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                loadRecords(filterQuery);
              }}
              className="flex gap-2"
            >
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
              Carregando suas keys...
            </div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Você ainda não gerou nenhuma key. Acesse o Catálogo de Jogos para gerar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Jogos</th>
                    <th className="px-5 py-3 font-medium">Valor</th>
                    <th className="px-5 py-3 font-medium">Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {records.map((batch) => (
                    <tr key={batch.id} className="hover:bg-zinc-900/30 align-top">
                      <td className="px-5 py-3 text-zinc-400 whitespace-nowrap">
                        {new Date(batch.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-zinc-200">
                        {batch.gameNames.length > 0
                          ? batch.gameNames.join(", ")
                          : `AppIDs: ${batch.appIds.join(", ")}`}
                      </td>
                      <td className="px-5 py-3 text-emerald-400 font-medium whitespace-nowrap">
                        R$ {batch.chargedAmount.toFixed(2)}
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
    </ResellerShell>
  );
}
