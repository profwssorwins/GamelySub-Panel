import crypto from "crypto";
import { getEffectiveSettings } from "./store";
import { ChargeStatus } from "./types";

export class ExpayApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface ExpayChargeResponse {
  charge_id?: string;
  id: string;
  reference?: string | null;
  amount: number;
  currency: string;
  payment_method: "pix" | "boleto" | "credit_card";
  status: ChargeStatus;
  pix_data?: {
    qr_code?: string;
    qr_code_base64?: string;
    copy_paste?: string;
  } | null;
  expires_at?: string | null;
  paid_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

async function expayFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const settings = getEffectiveSettings();
  const apiKey = settings.expayApiKey.trim();
  if (!apiKey) {
    throw new ExpayApiError(
      "Gateway PIX não configurado. Contate o administrador.",
      503,
      "MISSING_EXPAY_KEY"
    );
  }

  let baseUrl = settings.expayApiUrl.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    baseUrl = "https://api.expaybrasil.com/api/v1";
  }
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Request-Id": crypto.randomUUID(),
        ...((init.headers as Record<string, string>) || {}),
      },
      cache: "no-store",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Falha de rede";
    throw new ExpayApiError(
      `Falha ao comunicar com o gateway de pagamento: ${msg}`,
      502,
      "EXPAY_UNREACHABLE"
    );
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ExpayApiError(
      body?.error || body?.message || `Erro HTTP ${res.status} no gateway`,
      res.status,
      body?.code
    );
  }

  return body as T;
}

export async function createExpayPixCharge(input: {
  amount: number;
  reference: string;
  idempotencyKey: string;
  customer?: {
    name?: string;
    email?: string;
    document?: string;
  };
}): Promise<{
  chargeId: string;
  status: ChargeStatus;
  pixCopyPaste: string;
  pixQrCodeBase64: string;
  expiresAt: string | null;
}> {
  const data = await expayFetch<ExpayChargeResponse>("/charges", {
    method: "POST",
    headers: {
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      amount: Number(input.amount.toFixed(2)),
      currency: "BRL",
      payment_method: "pix",
      reference: input.reference,
      ...(input.customer ? { customer: input.customer } : {}),
    }),
  });

  const chargeId = data.charge_id || data.id;
  const pixCopyPaste =
    data.pix_data?.copy_paste || data.pix_data?.qr_code || "";
  const pixQrCodeBase64 = data.pix_data?.qr_code_base64 || "";

  return {
    chargeId,
    status: data.status || "pending",
    pixCopyPaste,
    pixQrCodeBase64,
    expiresAt: data.expires_at ?? null,
  };
}

export async function getExpayCharge(
  chargeId: string
): Promise<ExpayChargeResponse> {
  return expayFetch<ExpayChargeResponse>(
    `/charges/${encodeURIComponent(chargeId.trim())}`,
    { method: "GET" }
  );
}
