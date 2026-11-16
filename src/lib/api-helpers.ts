import { NextResponse } from "next/server";
import { extractBearerToken, getSession, isAdminAuthenticated } from "./auth";
import { CubycApiError } from "./cubyc-client";
import { findResellerByApiKey, findResellerById } from "./store";
import { SubReseller } from "./types";

export async function requireAdmin(req?: Request): Promise<NextResponse | null> {
  if (req && !verifySameOrigin(req)) {
    return NextResponse.json(
      { error: "Origem da requisição não autorizada." },
      { status: 403 }
    );
  }
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json(
      { error: "Não autenticado como administrador." },
      { status: 401 }
    );
  }
  return null;
}

export function verifySameOrigin(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!host) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export async function resolveSubReseller(
  req: Request
): Promise<{ reseller?: SubReseller; errorResponse?: NextResponse }> {
  const bearer = extractBearerToken(req);
  if (bearer) {
    const reseller = findResellerByApiKey(bearer);
    if (!reseller || reseller.status !== "active") {
      return {
        errorResponse: NextResponse.json(
          { error: "Token inválido ou conta suspensa." },
          { status: 401 }
        ),
      };
    }
    return { reseller };
  }

  const session = await getSession();
  if (session?.role === "reseller" && session.resellerId) {
    const reseller = findResellerById(session.resellerId);
    if (!reseller || reseller.status !== "active") {
      return {
        errorResponse: NextResponse.json(
          { error: "Conta não encontrada ou suspensa." },
          { status: 401 }
        ),
      };
    }
    return { reseller };
  }

  return {
    errorResponse: NextResponse.json(
      { error: "Não autenticado." },
      { status: 401 }
    ),
  };
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof CubycApiError) {
    return NextResponse.json(
      { error: err.message, code: err.code || "CUBYC_ERROR" },
      { status: err.status }
    );
  }
  const msg = err instanceof Error ? err.message : "Erro interno no servidor";
  return NextResponse.json({ error: msg }, { status: 500 });
}

export function handleSubApiError(err: unknown): NextResponse {
  if (err instanceof CubycApiError) {
    // Nunca vazar o nome "Cubyc" ou URLs internas para o sub-revendedor
    const sanitized = err.message
      .replace(/cubyc/gi, "Gamely")
      .replace(/https?:\/\/[^\s)]+/gi, "serviço");
    const status = err.status >= 500 || err.status === 401 || err.status === 403
      ? 503
      : err.status;
    return NextResponse.json(
      {
        error:
          status === 503
            ? "Serviço temporariamente indisponível. Tente novamente em instantes."
            : sanitized,
      },
      { status }
    );
  }
  return NextResponse.json(
    { error: "Erro interno no servidor." },
    { status: 500 }
  );
}
