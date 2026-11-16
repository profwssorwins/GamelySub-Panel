"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Hash } from "lucide-react";
import { GamelyLogo } from "@/components/GamelyLogo";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"reseller" | "admin">("reseller");

  const [resellerId, setResellerId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("id")?.trim();
    if (idParam) {
      setMode("reseller");
      setResellerId(idParam);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "admin"
          ? { mode: "admin", password }
          : { mode: "reseller", id: resellerId };

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Falha ao autenticar.");
      } else {
        router.replace(data.role === "admin" ? "/" : "/panel");
      }
    } catch {
      setError("Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#07090e] px-4 relative overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.15),transparent_50%)]"
        aria-hidden="true"
      />

      <div className="w-full max-w-md bg-[#0b0e15]/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="animate-gamely-float mb-3">
            <GamelyLogo size={48} showText={false} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Gamely
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {mode === "reseller"
              ? "Portal do Revendedor"
              : "Acesso Administrativo"}
          </p>
        </div>

        {/* Seletor de perfil */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.06] mb-6">
          <button
            type="button"
            onClick={() => {
              setMode("reseller");
              setError("");
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === "reseller"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Sub-revendedor
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("admin");
              setError("");
            }}
            className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              mode === "admin"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Administrador
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "reseller" ? (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                ID do Sub-revendedor
              </label>
              <div className="relative">
                <Hash className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={resellerId}
                  onChange={(e) => setResellerId(e.target.value)}
                  placeholder="Ex: GM-A1B2C3D4"
                  autoComplete="off"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5">
                Insira o ID enviado pelo administrador para acessar seu painel.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Senha do Administrador
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha admin"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            {loading ? "Entrando..." : "Entrar no Painel"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
