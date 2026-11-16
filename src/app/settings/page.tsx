"use client";

import React, { useEffect, useState } from "react";
import PanelShell from "@/components/PanelShell";
import {
  Save,
  PlugZap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

export default function SettingsPage() {
  const [cubycApiUrl, setCubycApiUrl] = useState("http://localhost:3000");
  const [cubycApiKey, setCubycApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [brandName, setBrandName] = useState("Gamely");
  const [defaultMarkupPrice, setDefaultMarkupPrice] = useState("2.50");

  // ExPay Brasil
  const [expayApiUrl, setExpayApiUrl] = useState(
    "https://api.expaybrasil.com/api/v1"
  );
  const [expayApiKey, setExpayApiKey] = useState("");
  const [maskedExpayKey, setMaskedExpayKey] = useState("");
  const [expayWebhookSecret, setExpayWebhookSecret] = useState("");
  const [maskedWebhookSecret, setMaskedWebhookSecret] = useState("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/panel/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.settings) {
          setCubycApiUrl(d.settings.cubycApiUrl || "http://localhost:3000");
          setMaskedKey(d.settings.cubycApiKeyMasked || "");
          setBrandName(d.settings.brandName || "Gamely");
          setDefaultMarkupPrice(String(d.settings.defaultMarkupPrice ?? 2.5));
          setExpayApiUrl(
            d.settings.expayApiUrl || "https://api.expaybrasil.com/api/v1"
          );
          setMaskedExpayKey(d.settings.expayApiKeyMasked || "");
          setMaskedWebhookSecret(d.settings.expayWebhookSecretMasked || "");
        }
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/panel/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cubycApiUrl,
          ...(cubycApiKey.trim() ? { cubycApiKey: cubycApiKey.trim() } : {}),
          brandName,
          defaultMarkupPrice: Number(defaultMarkupPrice),
          expayApiUrl,
          ...(expayApiKey.trim() ? { expayApiKey: expayApiKey.trim() } : {}),
          ...(expayWebhookSecret.trim()
            ? { expayWebhookSecret: expayWebhookSecret.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: "err", text: data?.error || "Erro ao salvar." });
      } else {
        setMaskedKey(data.settings.cubycApiKeyMasked || "");
        setCubycApiKey("");
        setMaskedExpayKey(data.settings.expayApiKeyMasked || "");
        setExpayApiKey("");
        setMaskedWebhookSecret(data.settings.expayWebhookSecretMasked || "");
        setExpayWebhookSecret("");
        setFeedback({ type: "ok", text: "Configurações salvas com sucesso." });
      }
    } catch {
      setFeedback({ type: "err", text: "Erro de rede ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/panel/settings", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: "err",
          text: data?.error || "Falha ao conectar na Cubyc.",
        });
      } else {
        setFeedback({
          type: "ok",
          text: `Conectado! Conta: ${data.account?.name || "Ativa"} · Plano: ${data.plan?.name} · Saldo: R$ ${Number(
            data.balance || 0
          ).toFixed(2)} (R$ ${Number(data.plan?.keyPrice || 0).toFixed(2)}/key)`,
        });
      }
    } catch {
      setFeedback({ type: "err", text: "Erro de rede ao testar conexão." });
    } finally {
      setTesting(false);
    }
  }

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/expay`
      : "/api/webhooks/expay";

  async function handleCopyWebhook() {
    await navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  return (
    <PanelShell
      title="Configurações"
      subtitle="Conecte a infraestrutura Cubyc e o gateway ExPay Brasil (PIX)"
    >
      <div className="max-w-2xl bg-[#080b12] border border-zinc-800/80 rounded-2xl p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Infraestrutura Cubyc */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-blue-400">
              Infraestrutura Cubyc
            </h2>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                URL da API Cubyc
              </label>
              <input
                type="url"
                value={cubycApiUrl}
                onChange={(e) => setCubycApiUrl(e.target.value)}
                placeholder="https://cubyc.com.br"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                API Key Cubyc (cy_... ou sk_...)
              </label>
              <input
                type="password"
                value={cubycApiKey}
                onChange={(e) => setCubycApiKey(e.target.value)}
                placeholder={
                  maskedKey
                    ? `Atual: ${maskedKey} (deixe vazio para manter)`
                    : "Cole aqui a API Key gerada no painel Cubyc"
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Nome da Marca (White-label)
                </label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Preço Padrão por Key (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={defaultMarkupPrice}
                  onChange={(e) => setDefaultMarkupPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Gateway ExPay Brasil */}
          <div className="border-t border-zinc-800/80 pt-5 space-y-4">
            <h2 className="text-sm font-semibold text-blue-400">
              Gateway ExPay Brasil (Recarga PIX dos Sub-revendedores)
            </h2>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                URL Base ExPay API v1
              </label>
              <input
                type="url"
                value={expayApiUrl}
                onChange={(e) => setExpayApiUrl(e.target.value)}
                placeholder="https://api.expaybrasil.com/api/v1"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  X-API-Key do Merchant (ExPay)
                </label>
                <input
                  type="password"
                  value={expayApiKey}
                  onChange={(e) => setExpayApiKey(e.target.value)}
                  placeholder={
                    maskedExpayKey
                      ? `Atual: ${maskedExpayKey}`
                      : "Cole sua X-API-Key da ExPay"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Webhook Secret HMAC (opcional)
                </label>
                <input
                  type="password"
                  value={expayWebhookSecret}
                  onChange={(e) => setExpayWebhookSecret(e.target.value)}
                  placeholder={
                    maskedWebhookSecret
                      ? `Atual: ${maskedWebhookSecret}`
                      : "Segredo HMAC para validar webhooks"
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 flex items-center justify-between gap-2 text-xs">
              <div className="truncate">
                <span className="text-zinc-500 block text-[10px]">
                  URL de Webhook para configurar na ExPay
                </span>
                <span className="font-mono text-blue-300">{webhookUrl}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shrink-0 cursor-pointer"
              >
                {copiedWebhook ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copiar
              </button>
            </div>
          </div>

          {feedback && (
            <div
              className={`flex items-start gap-2.5 text-xs rounded-xl px-3.5 py-3 border ${
                feedback.type === "ok"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-300"
              }`}
            >
              {feedback.type === "ok" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </button>

            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-medium cursor-pointer"
            >
              <PlugZap className="h-4 w-4 text-emerald-400" />
              {testing ? "Testando..." : "Testar Conexão Cubyc"}
            </button>
          </div>
        </form>
      </div>
    </PanelShell>
  );
}
