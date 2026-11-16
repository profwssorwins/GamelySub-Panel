import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAdminPassword,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  timingSafeCompare,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { findResellerById, hydrateStore, listResellers } from "@/lib/store";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, 12, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas de login. Aguarde um momento." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSecs) },
      }
    );
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "admin" ? "admin" : "reseller";

  if (mode === "admin") {
    const password = typeof body?.password === "string" ? body.password : "";
    if (!password || !timingSafeCompare(password, getAdminPassword())) {
      return NextResponse.json(
        { error: "Senha de administrador incorreta." },
        { status: 401 }
      );
    }

    const token = createSessionToken("admin");
    const res = NextResponse.json({ success: true, role: "admin" });
    res.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(7 * 24 * 60 * 60)
    );
    return res;
  }

  // Modo sub-revendedor: acesso exclusivo por ID
  await hydrateStore();
  const resellerId = typeof body?.id === "string" ? body.id.trim() : "";
  if (!resellerId || resellerId.length > 64) {
    return NextResponse.json(
      { error: "Informe o ID do sub-revendedor." },
      { status: 400 }
    );
  }

  const reseller =
    findResellerById(resellerId) ||
    listResellers().find(
      (r) => r.id.toLowerCase() === resellerId.toLowerCase()
    );

  if (!reseller) {
    return NextResponse.json(
      { error: "ID de revendedor não encontrado." },
      { status: 401 }
    );
  }

  if (reseller.status !== "active") {
    return NextResponse.json(
      { error: "Sua conta está suspensa. Entre em contato com o suporte." },
      { status: 403 }
    );
  }

  const token = createSessionToken("reseller", reseller.id);
  const res = NextResponse.json({ success: true, role: "reseller" });
  res.cookies.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(7 * 24 * 60 * 60)
  );
  return res;
}
