import crypto from "crypto";
import { NextResponse } from "next/server";
import { resolveSubReseller, verifySameOrigin } from "@/lib/api-helpers";
import { createExpayPixCharge, ExpayApiError } from "@/lib/expay-client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  createChargeRecord,
  flushStore,
  listChargesForReseller,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  const charges = listChargesForReseller(reseller.id, 30);
  return NextResponse.json({ charges });
}

export async function POST(req: Request) {
  if (!req.headers.get("authorization") && !verifySameOrigin(req)) {
    return NextResponse.json(
      { error: "Origem da requisição não autorizada." },
      { status: 403 }
    );
  }

  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  const rl = checkRateLimit(
    `subcharge:${reseller.id}:${getClientIp(req)}`,
    10,
    60_000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas cobranças geradas. Aguarde um momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(Number(body?.amount).toFixed(2));
    if (!Number.isFinite(amount) || amount < 1 || amount > 50_000) {
      return NextResponse.json(
        { error: "Valor inválido. Informe entre R$ 1,00 e R$ 50.000,00." },
        { status: 400 }
      );
    }

    const localId = crypto.randomUUID();
    const reference = `gamely-${localId}`;

    const expayRes = await createExpayPixCharge({
      amount,
      reference,
      idempotencyKey: localId,
      customer: {
        name: reseller.name,
        email: reseller.email,
      },
    });

    const charge = createChargeRecord({
      id: localId,
      chargeId: expayRes.chargeId,
      reference,
      subResellerId: reseller.id,
      subResellerName: reseller.name,
      amount,
      status: expayRes.status,
      pixCopyPaste: expayRes.pixCopyPaste,
      pixQrCodeBase64: expayRes.pixQrCodeBase64,
      expiresAt: expayRes.expiresAt,
      creditedAt: null,
    });
    await flushStore();

    return NextResponse.json({ charge }, { status: 201 });
  } catch (err) {
    if (err instanceof ExpayApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 500 ? 502 : err.status }
      );
    }
    return NextResponse.json(
      { error: "Erro ao gerar cobrança PIX." },
      { status: 500 }
    );
  }
}
