"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { GamelyLogo } from "./GamelyLogo";
import {
  AnimatedDashboardIcon,
  AnimatedGamepadIcon,
  AnimatedKeyIcon,
  AnimatedLogoutIcon,
} from "./AnimatedIcons";

const NAV_ITEMS = [
  { href: "/panel", label: "Visão Geral", icon: AnimatedDashboardIcon },
  { href: "/panel/catalog", label: "Catálogo de Jogos", icon: AnimatedGamepadIcon },
  { href: "/panel/keys", label: "Consultar Keys", icon: AnimatedKeyIcon },
];

// Cache em memória da sessão para evitar tela de loading a cada troca de página
let cachedResellerSession: {
  id: string;
  name: string;
  balance: number;
} | null = null;

export default function ResellerShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(!cachedResellerSession);
  const [resellerName, setResellerName] = useState(
    cachedResellerSession?.name || ""
  );
  const [resellerId, setResellerId] = useState(cachedResellerSession?.id || "");
  const [resellerBalance, setResellerBalance] = useState<number | null>(
    cachedResellerSession ? cachedResellerSession.balance : null
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function initSession() {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlId = params.get("id")?.trim();

        if (urlId) {
          cachedResellerSession = null;
          setChecking(true);
          const loginRes = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "reseller", id: urlId }),
          });
          if (!loginRes.ok) {
            if (active) router.replace("/login");
            return;
          }
          window.history.replaceState({}, "", pathname);
        }

        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await meRes.json();
        if (!active) return;

        if (!data?.authenticated) {
          cachedResellerSession = null;
          router.replace("/login");
        } else if (data.role === "admin") {
          cachedResellerSession = null;
          router.replace("/");
        } else {
          const rName = data.reseller?.name || "";
          const rId = data.reseller?.id || "";
          const rBal =
            typeof data.reseller?.balance === "number"
              ? data.reseller.balance
              : 0;

          cachedResellerSession = { id: rId, name: rName, balance: rBal };
          setResellerName(rName);
          setResellerId(rId);
          setResellerBalance(rBal);
          setChecking(false);
        }
      } catch {
        if (active) {
          cachedResellerSession = null;
          router.replace("/login");
        }
      }
    }

    initSession();
    return () => {
      active = false;
    };
  }, [router, pathname]);

  async function handleLogout() {
    cachedResellerSession = null;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05070b] text-zinc-400 text-sm">
        Carregando painel...
      </div>
    );
  }

  const renderNavLinks = (onNavigate?: () => void) =>
    NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      const isActive =
        item.href === "/panel"
          ? pathname === "/panel"
          : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
            isActive
              ? "bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-white border border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
              : "text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
          }`}
        >
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-blue-400" />
          )}
          <span
            className={`${
              isActive
                ? "text-blue-400"
                : "text-zinc-500 group-hover:text-blue-300"
            } transition-colors`}
          >
            <Icon className="w-4 h-4" active={isActive} />
          </span>
          <span>{item.label}</span>
        </Link>
      );
    });

  return (
    <div className="min-h-screen flex bg-[#05070b] text-white relative overflow-x-hidden">
      {/* Ambient blue glow */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.11),transparent_45%),radial-gradient(ellipse_at_bottom_left,_rgba(37,99,235,0.06),transparent_45%)]"
        aria-hidden="true"
      />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-68 md:flex-col border-r border-white/[0.07] bg-[#080b12]/95 backdrop-blur-xl relative z-10">
        <div className="h-18 flex items-center px-5 border-b border-white/[0.07]">
          <GamelyLogo subtitle="Portal do Revendedor" />
        </div>

        <div className="px-4 pt-5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Menu Principal
        </div>

        <nav className="flex-1 px-3 space-y-1">{renderNavLinks()}</nav>

        <div className="p-3 border-t border-white/[0.07] space-y-2">
          {resellerId && (
            <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] flex items-center justify-between">
              <span className="text-zinc-500">Seu ID</span>
              <span className="font-mono text-blue-400 font-semibold">
                {resellerId}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <AnimatedLogoutIcon className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-[#080b12] border-r border-white/10 flex flex-col z-10">
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.07]">
              <GamelyLogo size={34} subtitle="Portal do Revendedor" />
              <button
                onClick={() => setMobileOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {renderNavLinks(() => setMobileOpen(false))}
            </nav>
            <div className="p-3 border-t border-white/[0.07]">
              <button
                onClick={handleLogout}
                className="group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-rose-300"
              >
                <AnimatedLogoutIcon className="h-4 w-4" />
                Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="h-18 border-b border-white/[0.07] bg-[#080b12]/70 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base md:text-lg font-semibold text-white tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-zinc-400 hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {resellerName && (
              <span className="text-zinc-300 font-medium hidden sm:inline">
                {resellerName}
              </span>
            )}
            {resellerBalance !== null && (
              <span className="px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold">
                R$ {resellerBalance.toFixed(2)}
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
