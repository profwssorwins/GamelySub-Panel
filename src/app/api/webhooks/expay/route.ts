import crypto from "crypto";
import { NextResponse } from "next/server";
import { getExpayCharge } from "@/lib/expay-client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  findChargeByIdOrChargeId,
  flushStore,
  getEffectiveSettings,
  hydrateStore,
  markChargePaidAndCreditOnce,
  updateChargeStatus,
} from "@/lib/store";
import { ChargeStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function verifyHmacSignature(
  rawBody: string,
  secret: string,
  headerValue: string | null
): boolean {
  if (!headerValue) return false;
  const cleaned = headerValue.replace(/^sha256=/i, "").trim();
  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(cleaned, "utf8");
  const b = Buffer.from(expectedHex, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`wh:expay:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  const rawBody = await req.text();
  await hydrateStore();
  const settings = getEffectiveSettings();

  if (settings.expayWebhookSecret) {
    const sig =
      req.headers.get("x-expay-signature") ||
      req.headers.get("x-webhook-signature") ||
      req.headers.get("x-signature") ||
      req.headers.get("x-hub-signature-256");

    if (!verifyHmacSignature(rawBody, settings.expayWebhookSecret, sig)) {
      return NextResponse.json(
        { error: "Assinatura HMAC ausente ou inválida." },
        { status: 401 }
      );
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const dataObj =
    (payload.data as Record<string, unknown> | undefined) || payload;
  const chargeIdentifier = String(
    dataObj.charge_id || dataObj.id || dataObj.reference || ""
  ).trim();

  if (!chargeIdentifier) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const localCharge = findChargeByIdOrChargeId(chargeIdentifier);
  if (!localCharge) {
    return NextResponse.json({ received: true, unknown: true });
  }

  // Zero-trust: confirma o status real da cobrança direto na API ExPay
  try {
    const verified = await getExpayCharge(localCharge.chargeId);
    if (verified.status === "paid") {
      markChargePaidAndCreditOnce(localCharge.id);
      await flushStore();
    } else if (
      ["failed", "refunded", "expired", "canceled"].includes(verified.status)
    ) {
      updateChargeStatus(localCharge.id, verified.status as ChargeStatus);
      await flushStore();
    }
  } catch {
    // Se a API ExPay falhar momentaneamente, retorna 502 para o gateway tentar novamente
    return NextResponse.json(
      { error: "Falha ao validar cobrança no gateway." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    received: true,
    request_id: crypto.randomUUID(),
  });
}
