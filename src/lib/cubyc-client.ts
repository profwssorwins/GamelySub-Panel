import { getEffectiveSettings } from "./store";
import {
  CubycAccountResponse,
  CubycBalanceResponse,
  CubycGame,
  CubycGeneratedKey,
  CubycKeyLookupResponse,
} from "./types";

export class CubycApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function fetchWithAuthRedirects(
  url: string,
  init: RequestInit,
  rawKey: string,
  hopsLeft = 3
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${rawKey}`,
    "x-api-key": rawKey,
    ...((init.headers as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...init,
    headers,
    redirect: "manual",
    cache: "no-store",
  });

  if (
    hopsLeft > 0 &&
    [301, 302, 303, 307, 308].includes(res.status)
  ) {
    const location = res.headers.get("location");
    if (location) {
      const nextUrl = new URL(location, url).toString();
      // Em 303, muda para GET sem body
      const nextInit: RequestInit =
        res.status === 303
          ? { method: "GET", headers: init.headers }
          : init;
      return fetchWithAuthRedirects(nextUrl, nextInit, rawKey, hopsLeft - 1);
    }
  }

  return res;
}

function normalizeCubycBaseUrl(rawUrl: string): string {
  let baseUrl = rawUrl.trim().replace(/\/+$/, "");
  if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  return baseUrl;
}

async function cubycFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const settings = getEffectiveSettings();
  const rawKey = settings.cubycApiKey.replace(/^Bearer\s+/i, "").trim();

  if (!rawKey) {
    throw new CubycApiError(
      "API Key da Cubyc não configurada. Acesse Configurações para inserir sua chave (cy_... ou sk_...).",
      400,
      "MISSING_CUBYC_KEY"
    );
  }

  const baseUrl = normalizeCubycBaseUrl(settings.cubycApiUrl);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetchWithAuthRedirects(url, init, rawKey);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Falha de rede";
    throw new CubycApiError(
      `Não foi possível conectar à infraestrutura Cubyc (${baseUrl}): ${msg}`,
      502,
      "CUBYC_UNREACHABLE"
    );
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new CubycApiError(
      body?.message || body?.error || `Erro HTTP ${res.status} na Cubyc`,
      res.status,
      body?.code
    );
  }

  return body as T;
}

export async function getCubycAccount(): Promise<CubycAccountResponse> {
  return cubycFetch<CubycAccountResponse>("/api/v1/account");
}

export async function getCubycBalance(): Promise<CubycBalanceResponse> {
  return cubycFetch<CubycBalanceResponse>("/api/v1/balance");
}

interface CatalogSearchResult {
  success: boolean;
  query: string | null;
  total: number;
  limit: number;
  results: CubycGame[];
}

const CATALOG_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos
const CATALOG_CACHE_MAX_ENTRIES = 200;
const catalogCache = new Map<
  string,
  { expiresAt: number; data: CatalogSearchResult }
>();

export async function searchCubycGames(params: {
  q?: string;
  api?: string;
  denuvo?: string;
  nsfw?: string;
  type?: string;
  limit?: number;
}): Promise<CatalogSearchResult> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.api) qs.set("api", params.api);
  if (params.denuvo) qs.set("denuvo", params.denuvo);
  if (params.nsfw) qs.set("nsfw", params.nsfw);
  if (params.type) qs.set("type", params.type);
  if (params.limit) qs.set("limit", String(params.limit));

  const settings = getEffectiveSettings();
  const cacheKey = `${settings.cubycApiUrl}::${qs.toString()}`;
  const now = Date.now();
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  let data: CatalogSearchResult | null = null;
  let lastError: unknown = null;

  // 1. Tenta /api/v1/games/search
  try {
    const res = await cubycFetch<Record<string, unknown>>(
      `/api/v1/games/search?${qs.toString()}`
    );
    const rawList = (res.results || res.games || res.catalog) as
      | Array<Record<string, unknown>>
      | undefined;
    if (Array.isArray(rawList)) {
      data = {
        success: true,
        query: params.q || null,
        total: Number(res.total ?? rawList.length),
        limit: Number(res.limit ?? params.limit ?? 200),
        results: rawList.map((g) => ({
          id: String(g.id ?? g.appid ?? ""),
          name: String(g.name ?? "Sem nome"),
          banner: g.banner ? String(g.banner) : undefined,
          poster: g.poster ? String(g.poster) : undefined,
          hasDenuvo: Boolean(g.hasDenuvo),
          nsfw: Boolean(g.nsfw),
          type: g.type ? String(g.type) : "game",
          tags: Array.isArray(g.tags) ? g.tags.map(String) : [],
          apiSource: g.apiSource ? String(g.apiSource) : "Cubyc",
        })),
      };
    }
  } catch (err) {
    lastError = err;
    console.error("[Gamely] /api/v1/games/search falhou:", err);
  }

  // 2. Fallback para /api/games/catalog-sources (caso /api/v1/games/search não esteja disponível)
  if (!data) {
    try {
      const baseUrl = normalizeCubycBaseUrl(settings.cubycApiUrl);
      const fallbackQs = new URLSearchParams();
      if (params.q) fallbackQs.set("search", params.q);
      fallbackQs.set("limit", String(params.limit || 200));
      const fallbackRes = await fetch(
        `${baseUrl}/api/games/catalog-sources?${fallbackQs.toString()}`,
        { cache: "no-store" }
      );
      if (fallbackRes.ok) {
        const fbJson = (await fallbackRes.json()) as Record<string, unknown>;
        const rawGames = Array.isArray(fbJson.games)
          ? (fbJson.games as Array<Record<string, unknown>>)
          : [];
        const qLower = (params.q || "").toLowerCase().trim();
        const filtered = rawGames.filter((g) => {
          if (qLower) {
            const nameMatch = String(g.name || "")
              .toLowerCase()
              .includes(qLower);
            const idMatch = String(g.appid || g.id || "").includes(qLower);
            if (!nameMatch && !idMatch) return false;
          }
          if (params.denuvo === "true" && !g.hasDenuvo) return false;
          if (params.denuvo === "false" && g.hasDenuvo) return false;
          if (params.nsfw !== "true" && g.nsfw) return false;
          if (
            params.type &&
            String(g.type || "game").toLowerCase() !== params.type.toLowerCase()
          ) {
            return false;
          }
          return true;
        });

        data = {
          success: true,
          query: params.q || null,
          total: filtered.length,
          limit: params.limit || 200,
          results: filtered.slice(0, params.limit || 200).map((g) => ({
            id: String(g.appid ?? g.id ?? ""),
            name: String(g.name ?? "Sem nome"),
            banner: g.banner ? String(g.banner) : undefined,
            poster: g.poster ? String(g.poster) : undefined,
            hasDenuvo: Boolean(g.hasDenuvo),
            nsfw: Boolean(g.nsfw),
            type: g.type ? String(g.type) : "game",
            tags: Array.isArray(g.tags) ? g.tags.map(String) : [],
            apiSource: g.apiSource ? String(g.apiSource) : "Cubyc",
          })),
        };
      }
    } catch (fbErr) {
      console.error("[Gamely] Fallback /api/games/catalog-sources falhou:", fbErr);
    }
  }

  if (!data) {
    throw lastError instanceof Error
      ? lastError
      : new CubycApiError("Não foi possível carregar o catálogo.", 502);
  }

  if (data.results.length > 0) {
    if (catalogCache.size >= CATALOG_CACHE_MAX_ENTRIES) {
      const oldestKey = catalogCache.keys().next().value;
      if (oldestKey) catalogCache.delete(oldestKey);
    }
    catalogCache.set(cacheKey, {
      expiresAt: now + CATALOG_CACHE_TTL_MS,
      data,
    });
  }

  return data;
}

export async function generateCubycKeys(payload: {
  appId?: number;
  appIds?: number[];
  quantity: number;
  apiSource?: string;
  expiration?: {
    type: "never" | "duration";
    hours?: number;
    days?: number;
  };
  keyLength?: number;
}): Promise<{
  generated: number;
  totalCents: number;
  chargedCentsPerKey: number;
  gamesPerKey: number;
  isCombo: boolean;
  keys: CubycGeneratedKey[];
  skippedDuplicates?: number;
}> {
  return cubycFetch("/api/v1/keys/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function lookupCubycKey(
  code: string
): Promise<CubycKeyLookupResponse> {
  return cubycFetch<CubycKeyLookupResponse>(
    `/api/v1/keys/${encodeURIComponent(code.trim())}`
  );
}
