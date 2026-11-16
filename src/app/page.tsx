"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import PanelShell from "@/components/PanelShell";
import {
  Wallet,
  Users,
  KeyRound,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import type { KeyHistoryEntry } from "@/lib/types";

interface OverviewData {
  brandName: string;
  persistentStorage?: boolean;
  cubyc: {
    connected: boolean;
    error?: string;
    account?: {
      id: string;
      name: string;
      plan: string;
      balance: number;
      status: string;
      canGenKeys: boolean;
    };
    tokenName?: string;
    balance?: number;
    plan?: {
      name: string;
      keyPrice: number;
    };
  };
  metrics: {
    totalResellers: number;
    activeResellers: number;
    totalResellersBalance: number;
    totalKeysGenerated: number;
    totalChargedResellers: number;
  };
  history: KeyHistoryEntry[];
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    setLoading(true);
    try {
      const res = await fetch("/api/panel/overview", { cache: "no-store" });
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <PanelShell
      title="Dashboard"
      subtitle="Visão geral da infraestrutura Cubyc e operação Gamely"
    >
      <div className="space-y-6">
        {data && data.persistentStorage === false && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-200">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong>Armazenamento efêmero detectado (Vercel sem banco compartilhado):</strong>{" "}
              cada função serverless usa seu próprio <code>/tmp</code>. Conecte um{" "}
              <strong>Upstash Redis / Vercel KV</strong> nas variáveis de ambiente da Vercel (
              <code>KV_REST_API_URL</code> e <code>KV_REST_API_TOKEN</code> ou{" "}
              <code>UPSTASH_REDIS_REST_URL</code> e <code>UPSTASH_REDIS_REST_TOKEN</code>) para que sub-revendedores, saldos e configurações sejam compartilhados entre todas as rotas.
            </div>
          </div>
        )}

        {/* Status da Infraestrutura Cubyc */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            {data?.cubyc.connected ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white">
                  Conexão com Infraestrutura Cubyc
                </h2>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    data?.cubyc.connected
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {loading
                    ? "Verificando..."
                    : data?.cubyc.connected
                    ? "Conectado"
                    : "Desconectado"}
                </span>
              </div>
              {data?.cubyc.connected ? (
                <p className="text-xs text-zinc-400 mt-1">
                  Conta: <span className="text-zinc-200">{data.cubyc.account?.name}</span> · Plano:{" "}
                  <span className="text-blue-300">{data.cubyc.plan?.name || data.cubyc.account?.plan}</span> · Custo por ativação:{" "}
                  <span className="text-emerald-300 font-medium">
                    R$ {(data.cubyc.plan?.keyPrice ?? 0).toFixed(2)}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-zinc-400 mt-1">
                  {data?.cubyc.error || "Configure sua API Key da Cubyc para começar."}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadOverview}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white"
            >
              Configurar API
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Saldo na Cubyc</span>
              <Wallet className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              R$ {(data?.cubyc.balance ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Saldo mestre da infraestrutura
            </div>
          </div>

          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Sub-revendedores</span>
              <Users className="h-4 w-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data?.metrics.activeResellers ?? 0}{" "}
              <span className="text-sm font-normal text-zinc-500">
                / {data?.metrics.totalResellers ?? 0}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Saldo interno clientes: R$ {(data?.metrics.totalResellersBalance ?? 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Keys Geradas (recentes)</span>
              <KeyRound className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {data?.metrics.totalKeysGenerated ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Painel + Sub-API white-label
            </div>
          </div>

          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Faturamento Sub-revenda</span>
              <TrendingUp className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              R$ {(data?.metrics.totalChargedResellers ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Total debitado de sub-revendedores
            </div>
          </div>
        </div>

        {/* Atalhos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/keys"
            className="bg-[#080b12] hover:border-blue-500/40 border border-zinc-800/80 rounded-2xl p-5 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Gerar ou Consultar Keys
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Emita keys simples ou combos via Cubyc e consulte ativações ao vivo.
            </p>
          </Link>

          <Link
            href="/catalog"
            className="bg-[#080b12] hover:border-blue-500/40 border border-zinc-800/80 rounded-2xl p-5 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Explorar Catálogo
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Busque jogos por nome ou AppID, filtre por Denuvo/API e gere direto.
            </p>
          </Link>

          <Link
            href="/resellers"
            className="bg-[#080b12] hover:border-blue-500/40 border border-zinc-800/80 rounded-2xl p-5 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Gerenciar Sub-revendedores
              </span>
              <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Cadastre clientes, defina preço por key, saldo e chave API Gamely.
            </p>
          </Link>
        </div>

        {/* Histórico recente */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Histórico Recente de Geração
            </h3>
            <span className="text-xs text-zinc-500">
              Últimos {data?.history.length ?? 0} lotes
            </span>
          </div>

          {!data?.history.length ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              Nenhuma key gerada ainda neste painel.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Jogos</th>
                    <th className="px-5 py-3 font-medium">Qtd</th>
                    <th className="px-5 py-3 font-medium">Cliente / Origem</th>
                    <th className="px-5 py-3 font-medium">Cobrado Cliente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {data.history.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/30">
                      <td className="px-5 py-3 text-zinc-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-zinc-200">
                        {item.gameNames.length > 0
                          ? item.gameNames.join(", ")
                          : `AppIDs: ${item.appIds.join(", ")}`}
                      </td>
                      <td className="px-5 py-3 text-zinc-200 font-medium">
                        {item.quantity}
                      </td>
                      <td className="px-5 py-3">
                        {item.subResellerName ? (
                          <span className="inline-flex items-center gap-1.5 text-blue-300">
                            {item.subResellerName}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              {item.source === "sub_api" ? "Sub-API" : "Painel"}
                            </span>
                          </span>
                        ) : (
                          <span className="text-zinc-400">Uso próprio (Painel)</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-emerald-400 font-medium">
                        R$ {item.chargedResellerAmount.toFixed(2)}
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
