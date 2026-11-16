"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  ShieldAlert,
  KeyRound,
  Gamepad2,
  Layers,
  X,
  Copy,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import type { CubycGame, SubReseller } from "@/lib/types";

const POPULAR_TAGS = [
  "Ação",
  "RPG",
  "Aventura",
  "Estratégia",
  "Simulador",
  "Mundo Aberto",
  "Cooperativo",
  "Terror",
  "Indie",
  "Sobrevivência",
  "Multijogador",
  "Anime",
];

const PAGE_SIZE = 24;

export default function CatalogBrowser({
  searchEndpoint,
  generateEndpoint,
  isAdmin = false,
}: {
  searchEndpoint: string;
  generateEndpoint: string;
  isAdmin?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [apiFilter, setApiFilter] = useState("");
  const [denuvoFilter, setDenuvoFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showNsfw, setShowNsfw] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const [games, setGames] = useState<CubycGame[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Combo selection
  const [comboGames, setComboGames] = useState<CubycGame[]>([]);

  // Quick Generate Modal
  const [modalGames, setModalGames] = useState<CubycGame[] | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [expirationType, setExpirationType] = useState<"never" | "duration">("never");
  const [expirationDays, setExpirationDays] = useState("7");
  const [subResellerId, setSubResellerId] = useState("");
  const [resellers, setResellers] = useState<SubReseller[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  async function fetchGames(qValue = query) {
    setError("");
    const qs = new URLSearchParams();
    if (qValue.trim()) qs.set("q", qValue.trim());
    if (isAdmin && apiFilter) qs.set("api", apiFilter);
    if (denuvoFilter) qs.set("denuvo", denuvoFilter);
    if (typeFilter) qs.set("type", typeFilter);
    if (showNsfw) qs.set("nsfw", "true");
    qs.set("limit", "200");

    const cacheKey = `gamely_cat:${searchEndpoint}?${qs.toString()}`;
    try {
      const rawCached = sessionStorage.getItem(cacheKey);
      if (rawCached) {
        const parsed = JSON.parse(rawCached) as {
          exp: number;
          results: CubycGame[];
          total: number;
        };
        if (parsed.exp > Date.now()) {
          setGames(parsed.results || []);
          setTotal(parsed.total || 0);
          setPage(1);
          return;
        }
      }
    } catch {
      // ignore storage errors
    }

    setLoading(true);
    try {
      const res = await fetch(`${searchEndpoint}?${qs.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Erro ao buscar catálogo.");
        setGames([]);
        setTotal(0);
      } else {
        const results = data.results || [];
        const totalCount = data.total || 0;
        setGames(results);
        setTotal(totalCount);
        setPage(1);
        if (results.length > 0) {
          try {
            sessionStorage.setItem(
              cacheKey,
              JSON.stringify({
                exp: Date.now() + 5 * 60 * 1000,
                results,
                total: totalCount,
              })
            );
          } catch {
            // ignore storage quota errors
          }
        }
      }
    } catch {
      setError("Erro de rede ao consultar catálogo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGames(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFilter, denuvoFilter, typeFilter, showNsfw]);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/panel/resellers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.resellers)) setResellers(d.resellers);
      })
      .catch(() => {});
  }, [isAdmin]);

  const filteredByTag = useMemo(() => {
    if (!selectedTag) return games;
    const tagLower = selectedTag.toLowerCase();
    return games.filter((g) =>
      (g.tags || []).some((t) => t.toLowerCase().includes(tagLower))
    );
  }, [games, selectedTag]);

  const totalPages = Math.max(1, Math.ceil(filteredByTag.length / PAGE_SIZE));
  const pagedGames = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredByTag.slice(start, start + PAGE_SIZE);
  }, [filteredByTag, page]);

  function toggleCombo(game: CubycGame) {
    setComboGames((prev) =>
      prev.some((x) => x.id === game.id)
        ? prev.filter((x) => x.id !== game.id)
        : [...prev, game]
    );
  }

  function openGenerateModal(targetGames: CubycGame[]) {
    setModalGames(targetGames);
    setQuantity("1");
    setGenError("");
    setGeneratedKeys([]);
    setCopiedAll(false);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!modalGames || modalGames.length === 0) return;

    setGenerating(true);
    setGenError("");
    setGeneratedKeys([]);

    try {
      const appIds = modalGames.map((g) => Number(g.id)).filter((n) => n > 0);
      const payload: Record<string, unknown> = {
        ...(appIds.length === 1 ? { appId: appIds[0] } : { appIds }),
        quantity: Number(quantity) || 1,
        ...(isAdmin && subResellerId ? { subResellerId } : {}),
        ...(expirationType === "duration"
          ? { expiration: { type: "duration", days: Number(expirationDays) || 7 } }
          : {}),
      };

      const res = await fetch(generateEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data?.error || "Não foi possível gerar as keys.");
      } else {
        setGeneratedKeys(
          (data.keys || []).map((k: { code: string }) => k.code)
        );
      }
    } catch {
      setGenError("Erro de rede ao gerar keys.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopyAll() {
    if (generatedKeys.length === 0) return;
    await navigator.clipboard.writeText(generatedKeys.join("\n"));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  function resetFilters() {
    setQuery("");
    setApiFilter("");
    setDenuvoFilter("");
    setTypeFilter("");
    setShowNsfw(false);
    setSelectedTag(null);
    setPage(1);
    fetchGames("");
  }

  return (
    <div className="space-y-5">
      {/* Barra de busca e filtros estilo Cubyc */}
      <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-4 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchGames(query);
          }}
          className="flex flex-col md:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome do jogo ou AppID Steam..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Tipo: Todos</option>
            <option value="game">Apenas Jogos</option>
            <option value="dlc">Apenas DLCs</option>
          </select>

          <select
            value={denuvoFilter}
            onChange={(e) => setDenuvoFilter(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">DRM: Todos</option>
            <option value="false">Sem Denuvo</option>
            <option value="true">Com Denuvo</option>
          </select>

          {isAdmin && (
            <select
              value={apiFilter}
              onChange={(e) => setApiFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
            >
              <option value="">API: Todas</option>
              <option value="hubcap">Hubcap (API 2)</option>
              <option value="ryuu">Ryuu (API 1)</option>
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowNsfw((v) => !v)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium cursor-pointer ${
              showNsfw
                ? "bg-rose-500/15 border-rose-500/30 text-rose-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {showNsfw ? "+18 Visível" : "+18 Oculto"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
          >
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>

        {/* Pills de Categorias / Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setSelectedTag(null);
              setPage(1);
            }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
              selectedTag === null
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            Todos
          </button>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setSelectedTag((prev) => (prev === tag ? null : tag));
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                selectedTag === tag
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {tag}
            </button>
          ))}
          {(query || apiFilter || denuvoFilter || typeFilter || showNsfw || selectedTag) && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Barra de Combo */}
      {comboGames.length > 0 && (
        <div className="bg-blue-950/40 border border-blue-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300">
              <Layers className="h-4 w-4" />
              Combo ({comboGames.length} jogos):
            </span>
            {comboGames.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200"
              >
                {g.name}
                <button
                  type="button"
                  onClick={() => toggleCombo(g)}
                  className="text-zinc-400 hover:text-rose-400 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setComboGames([])}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => openGenerateModal(comboGames)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              Gerar Key Combo
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Contagem & Paginação */}
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <span>
          Exibindo {pagedGames.length} de {filteredByTag.length} carregados (Total na busca:{" "}
          {total.toLocaleString("pt-BR")})
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              Página {page} de {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid de Jogos */}
      {pagedGames.length === 0 && !loading && !error ? (
        <div className="bg-[#080b12] border border-zinc-800/80 rounded-2xl p-12 text-center text-sm text-zinc-500">
          Nenhum jogo encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pagedGames.map((g) => {
            const inCombo = comboGames.some((x) => x.id === g.id);
            const imgSrc =
              g.banner ||
              g.poster ||
              `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.id}/header.jpg`;

            return (
              <div
                key={`${g.id}-${g.name}`}
                className={`bg-[#080b12] border rounded-2xl overflow-hidden flex flex-col transition-colors ${
                  inCombo
                    ? "border-blue-500/70"
                    : "border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="aspect-[16/9] bg-zinc-900 relative overflow-hidden">
                  <img
                    src={imgSrc}
                    alt={g.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-transparent to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    {g.type?.toLowerCase() === "dlc" && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/90 text-white text-[10px] font-bold">
                        DLC
                      </span>
                    )}
                    {g.nsfw && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/90 text-white text-[10px] font-bold">
                        +18
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1.5">
                    {g.hasDenuvo && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-black text-[10px] font-bold">
                        <ShieldAlert className="h-3 w-3" />
                        Denuvo
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md bg-black/75 text-zinc-200 text-[10px] font-mono border border-white/10">
                      #{g.id}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {g.name}
                    </h3>
                    {g.tags && g.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {g.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {isAdmin && g.apiSource && (
                      <p className="text-[11px] text-zinc-500 mt-1.5">
                        Fonte: {g.apiSource}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openGenerateModal([g])}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Gerar Key
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCombo(g)}
                      title="Adicionar ao Combo"
                      className={`px-3 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        inCombo
                          ? "bg-blue-600/25 border-blue-500 text-blue-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Geração Rápida */}
      {modalGames && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md bg-[#080b12] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                  <Gamepad2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    {modalGames.length > 1
                      ? `Gerar Combo (${modalGames.length} jogos)`
                      : modalGames[0].name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    AppID(s): {modalGames.map((g) => g.id).join(", ")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalGames(null)}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Expiração
                  </label>
                  <select
                    value={expirationType}
                    onChange={(e) =>
                      setExpirationType(e.target.value as "never" | "duration")
                    }
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="never">Sem expiração</option>
                    <option value="duration">Por dias</option>
                  </select>
                </div>
              </div>

              {expirationType === "duration" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Dias de validade
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Atribuir a Sub-revendedor (opcional)
                  </label>
                  <select
                    value={subResellerId}
                    onChange={(e) => setSubResellerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Uso próprio</option>
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.id}) — R$ {r.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {genError && (
                <div className="flex items-start gap-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{genError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={generating}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium cursor-pointer"
              >
                {generating ? "Gerando..." : "Confirmar e Gerar"}
              </button>
            </form>

            {generatedKeys.length > 0 && (
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-emerald-400">
                    {generatedKeys.length} key(s) gerada(s)!
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyAll}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                  >
                    {copiedAll ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono max-h-40 overflow-y-auto select-all">
                  {generatedKeys.join("\n")}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
