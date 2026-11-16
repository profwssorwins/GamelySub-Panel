"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ResellerShell from "@/components/ResellerShell";
import {
  Wallet,
  KeyRound,
  Tag,
  Copy,
  Check,
  ArrowUpRight,
  RefreshCw,
  QrCode,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { PaymentChargeRecord } from "@/lib/types";

interface ResellerOverview {
  reseller: {
    id: string;
    name: string;
    email: string;
    planName: string;
    keyPrice: number;
    balance: number;
    apiKey: string;
    totalKeysGenerated: number;
  };
  history: Array<{
    id: string;
    codes: string[];
    gameNames: string[];
    appIds: number[];
    quantity: number;
    isCombo: boolean;
    chargedAmount: number;
    createdAt: string;
  }>;
}

export default function ResellerDashboardPage() {
  const [data, setData] = useState<ResellerOverview | null>(null);
  const [charges, setCharges] = useState<PaymentChargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);

  // PIX Top-up state
  const [pixAmount, setPixAmount] = useState("25");
  const [creatingPix, setCreatingPix] = useState(false);
  const [pixError, setPixError] = useState("");
  const [activeCharge, setActiveCharge] = useState<PaymentChargeRecord | null>(
    null
  );
  const [copiedPix, setCopiedPix] = useState(false);
  const [checkingPix, setCheckingPix] = useState(false);
  const [pixSuccessMsg, setPixSuccessMsg] = useState("");

  async function loadOverview() {
    setLoading(true);
    try {
      const [ovRes, chRes] = await Promise.all([
        fetch("/api/sub/overview", { cache: "no-store" }),
        fetch("/api/sub/charges", { cache: "no-store" }),
      ]);
      if (ovRes.ok) {
        setData(await ovRes.json());
      }
      if (chRes.ok) {
        const chData = await chRes.json();
        if (Array.isArray(chData?.charges)) setCharges(chData.charges);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  async function handleCopyApiKey() {
    if (!data?.reseller.apiKey) return;
    await navigator.clipboard.writeText(data.reseller.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  async function handleCreatePix(e: React.FormEvent) {
    e.preventDefault();
    setPixError("");
    setPixSuccessMsg("");
    setCreatingPix(true);
    try {
      const res = await fetch("/api/sub/charges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(pixAmount.replace(",", ".")),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        setPixError(d?.error || "Não foi possível gerar o PIX.");
      } else {
        setActiveCharge(d.charge);
        await loadOverview();
      }
    } catch {
      setPixError("Erro de conexão ao gerar PIX.");
    } finally {
      setCreatingPix(false);
    }
  }

  async function handleCheckPix(chargeId: string) {
    setCheckingPix(true);
    setPixError("");
    setPixSuccessMsg("");
    try {
      const res = await fetch(
        `/api/sub/charges/${encodeURIComponent(chargeId)}/check`,
        { method: "POST" }
      );
      const d = await res.json();
      if (!res.ok) {
        setPixError(d?.error || "Erro ao verificar pagamento.");
      } else {
        setActiveCharge(d.charge);
        if (d.charge?.status === "paid") {
          setPixSuccessMsg(
            `Pagamento confirmado! Saldo atualizado: R$ ${Number(
              d.balance || 0
            ).toFixed(2)}`
          );
        } else {
          setPixError("Pagamento ainda pendente. Aguarde alguns segundos após pagar.");
        }
        await loadOverview();
      }
    } catch {
      setPixError("Erro de conexão ao verificar PIX.");
    } finally {
      setCheckingPix(false);
    }
  }

  async function handleCopyPixCode() {
    if (!activeCharge?.pixCopyPaste) return;
    await navigator.clipboard.writeText(activeCharge.pixCopyPaste);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  }

  const r = data?.reseller;

  return (
    <ResellerShell
      title="Visão Geral"
      subtitle="Acompanhe seu saldo, plano e recargas PIX na Gamely"
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Saldo Disponível</span>
              <Wallet className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              R$ {(r?.balance ?? 0).toFixed(2)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Crédito disponível para emissão
            </div>
          </div>

          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Seu Plano & Tarifa</span>
              <Tag className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {r?.planName || "—"}
            </div>
            <div className="text-[11px] text-blue-300 mt-1">
              R$ {(r?.keyPrice ?? 0).toFixed(2)} por key gerada
            </div>
          </div>

          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between text-zinc-400 text-xs mb-2">
              <span>Keys Geradas</span>
              <KeyRound className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {r?.totalKeysGenerated ?? 0}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Total acumulado na conta
            </div>
          </div>
        </div>

        {/* Adicionar Saldo via PIX + Atalhos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Adicionar Saldo via PIX
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Crédito instantâneo na sua conta Gamely
                  </p>
                </div>
              </div>
              <button
                onClick={loadOverview}
                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 cursor-pointer"
                title="Atualizar"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>

            <form
              onSubmit={handleCreatePix}
              className="flex flex-wrap items-center gap-2"
            >
              {["10", "25", "50", "100"].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPixAmount(preset)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
                    pixAmount === preset
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  R$ {preset}
                </button>
              ))}

              <input
                type="number"
                step="0.01"
                min="1"
                max="50000"
                value={pixAmount}
                onChange={(e) => setPixAmount(e.target.value)}
                className="w-28 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Outro"
              />

              <button
                type="submit"
                disabled={creatingPix}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
              >
                {creatingPix ? "Gerando PIX..." : "Gerar PIX"}
              </button>
            </form>

            {pixError && (
              <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{pixError}</span>
              </div>
            )}

            {pixSuccessMsg && (
              <div className="flex items-start gap-2 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{pixSuccessMsg}</span>
              </div>
            )}

            {activeCharge && activeCharge.status === "pending" && (
              <div className="rounded-xl bg-zinc-950 border border-blue-500/30 p-4 flex flex-col sm:flex-row gap-4 items-center">
                {activeCharge.pixQrCodeBase64 && (
                  <img
                    src={
                      activeCharge.pixQrCodeBase64.startsWith("data:")
                        ? activeCharge.pixQrCodeBase64
                        : `data:image/png;base64,${activeCharge.pixQrCodeBase64}`
                    }
                    alt="QR Code PIX"
                    className="w-36 h-36 rounded-xl bg-white p-1.5 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 space-y-2.5 w-full">
                  <div className="text-xs text-zinc-300">
                    Cobrança de{" "}
                    <strong className="text-white">
                      R$ {activeCharge.amount.toFixed(2)}
                    </strong>{" "}
                    aguardando pagamento:
                  </div>
                  {activeCharge.pixCopyPaste && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={activeCharge.pixCopyPaste}
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300"
                      />
                      <button
                        type="button"
                        onClick={handleCopyPixCode}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-white cursor-pointer"
                      >
                        {copiedPix ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        Copiar
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={checkingPix}
                    onClick={() => handleCheckPix(activeCharge.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {checkingPix
                      ? "Verificando..."
                      : "Já paguei · Verificar Pagamento"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/panel/catalog"
              className="flex-1 bg-[#080b12] hover:border-blue-500/40 border border-zinc-800/80 rounded-2xl p-5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Catálogo de Jogos
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Pesquise jogos, monte combos e gere suas keys na hora.
              </p>
            </Link>

            <Link
              href="/panel/keys"
              className="flex-1 bg-[#080b12] hover:border-blue-500/40 border border-zinc-800/80 rounded-2xl p-5 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Consultar Keys
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-500 group-hover:text-blue-400" />
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Veja todas as keys geradas pela sua conta e status de resgate.
              </p>
            </Link>
          </div>
        </div>

        {/* Chave de API */}
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Sua Chave de API Gamely
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Use no header <code>Authorization: Bearer ...</code> para integrar sua loja ou bot.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-300 truncate">
              {r?.apiKey || "Carregando..."}
            </div>
            <button
              onClick={handleCopyApiKey}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white cursor-pointer"
            >
              {copiedKey ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Copiada
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </>
              )}
            </button>
          </div>
        </div>

        {/* Histórico de Recargas PIX */}
        {charges.length > 0 && (
          <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Recargas PIX Recentes
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800/80">
                  <tr>
                    <th className="px-5 py-3 font-medium">Data</th>
                    <th className="px-5 py-3 font-medium">Valor</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {charges.map((ch) => (
                    <tr key={ch.id} className="hover:bg-zinc-900/30">
                      <td className="px-5 py-3 text-zinc-400">
                        {new Date(ch.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-5 py-3 text-white font-medium">
                        R$ {ch.amount.toFixed(2)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            ch.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : ch.status === "pending"
                              ? "bg-blue-500/15 text-blue-300"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {ch.status === "paid"
                            ? "Pago"
                            : ch.status === "pending"
                            ? "Pendente"
                            : ch.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {ch.status === "pending" && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveCharge(ch);
                              handleCheckPix(ch.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
                          >
                            Verificar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ResellerShell>
  );
}
