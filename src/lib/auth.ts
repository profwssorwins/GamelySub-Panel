import crypto from "crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "gamely_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let runtimeFallbackSecret: string | null = null;

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) return envSecret;

  if (process.env.NODE_ENV === "production") {
    if (!runtimeFallbackSecret) {
      runtimeFallbackSecret = crypto.randomBytes(32).toString("hex");
    }
    return runtimeFallbackSecret;
  }

  return "gamely-dev-secret-change-in-prod";
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "gamely-admin-2026";
}

export function timingSafeCompare(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a, "utf8").digest();
  const hashB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function getSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

function signPayload(payloadB64: string): string {
  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(payloadB64)
    .digest("base64url");
}

export function createSessionToken(
  role: "admin" | "reseller",
  resellerId?: string
): string {
  const payload: SessionPayload = {
    role,
    ...(resellerId ? { resellerId } : {}),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = signPayload(payloadB64);
  return `${payloadB64}.${sig}`;
}

export interface SessionPayload {
  role: "admin" | "reseller";
  resellerId?: string;
  exp: number;
}

export function verifySessionToken(
  token: string | undefined | null
): SessionPayload | null {
  if (!token || !token.includes(".")) return false ? null : null;
  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return null;

  const expectedSig = signPayload(payloadB64);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    ) as SessionPayload;
    if (
      (parsed?.role !== "admin" && parsed?.role !== "reseller") ||
      typeof parsed?.exp !== "number" ||
      parsed.exp <= Date.now()
    ) {
      return null;
    }
    if (parsed.role === "reseller" && !parsed.resellerId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "admin";
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function generateSubApiKey(): string {
  return `gm_${crypto.randomBytes(24).toString("hex")}`;
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}
