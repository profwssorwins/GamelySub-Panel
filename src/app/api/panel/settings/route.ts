import { NextResponse } from "next/server";
import { handleApiError, requireAdmin } from "@/lib/api-helpers";
import { getCubycAccount, getCubycBalance } from "@/lib/cubyc-client";
import { flushStore, getEffectiveSettings, updateSettings } from "@/lib/store";

export const dynamic = "force-dynamic";

function maskKey(key: string): string {
  if (!key) return "";
  if (key.length <= 10) return "••••••••";
  return `${key.slice(0, 6)}••••••••${key.slice(-4)}`;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const s = getEffectiveSettings();
  return NextResponse.json({
    settings: {
      cubycApiUrl: s.cubycApiUrl,
      cubycApiKeyMasked: maskKey(s.cubycApiKey),
      hasCubycApiKey: Boolean(s.cubycApiKey),
      brandName: s.brandName,
      defaultMarkupPrice: s.defaultMarkupPrice,
      expayApiUrl: s.expayApiUrl,
      expayApiKeyMasked: maskKey(s.expayApiKey),
      hasExpayApiKey: Boolean(s.expayApiKey),
      expayWebhookSecretMasked: maskKey(s.expayWebhookSecret),
      hasExpayWebhookSecret: Boolean(s.expayWebhookSecret),
    },
  });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (typeof body?.cubycApiUrl === "string" && body.cubycApiUrl.trim()) {
    const rawUrl = body.cubycApiUrl.trim().replace(/\/+$/, "");
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json(
          { error: "URL da API deve usar protocolo http ou https." },
          { status: 400 }
        );
      }
      patch.cubycApiUrl = rawUrl;
    } catch {
      return NextResponse.json(
        { error: "URL da API Cubyc inválida." },
        { status: 400 }
      );
    }
  }
  if (typeof body?.cubycApiKey === "string" && body.cubycApiKey.trim()) {
    patch.cubycApiKey = body.cubycApiKey.trim();
  }
  if (typeof body?.brandName === "string" && body.brandName.trim()) {
    patch.brandName = body.brandName.trim();
  }
  if (body?.defaultMarkupPrice !== undefined) {
    const p = Number(body.defaultMarkupPrice);
    if (Number.isFinite(p) && p >= 0) {
      patch.defaultMarkupPrice = p;
    }
  }
  if (typeof body?.expayApiUrl === "string" && body.expayApiUrl.trim()) {
    const rawExpay = body.expayApiUrl.trim().replace(/\/+$/, "");
    try {
      const parsed = new URL(rawExpay);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return NextResponse.json(
          { error: "URL da API ExPay deve usar http ou https." },
          { status: 400 }
        );
      }
      patch.expayApiUrl = rawExpay;
    } catch {
      return NextResponse.json(
        { error: "URL da API ExPay inválida." },
        { status: 400 }
      );
    }
  }
  if (typeof body?.expayApiKey === "string" && body.expayApiKey.trim()) {
    patch.expayApiKey = body.expayApiKey.trim();
  }
  if (
    typeof body?.expayWebhookSecret === "string" &&
    body.expayWebhookSecret.trim()
  ) {
    patch.expayWebhookSecret = body.expayWebhookSecret.trim();
  }

  const updated = updateSettings(patch);
  await flushStore();
  return NextResponse.json({
    success: true,
    settings: {
      cubycApiUrl: updated.cubycApiUrl,
      cubycApiKeyMasked: maskKey(updated.cubycApiKey),
      hasCubycApiKey: Boolean(updated.cubycApiKey),
      brandName: updated.brandName,
      defaultMarkupPrice: updated.defaultMarkupPrice,
      expayApiUrl: updated.expayApiUrl,
      expayApiKeyMasked: maskKey(updated.expayApiKey),
      hasExpayApiKey: Boolean(updated.expayApiKey),
      expayWebhookSecretMasked: maskKey(updated.expayWebhookSecret),
      hasExpayWebhookSecret: Boolean(updated.expayWebhookSecret),
    },
  });
}

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const [accRes, balRes] = await Promise.allSettled([
      getCubycAccount(),
      getCubycBalance(),
    ]);
    const account = accRes.status === "fulfilled" ? accRes.value : null;
    const balance = balRes.status === "fulfilled" ? balRes.value : null;

    if (!account && !balance) {
      const err =
        accRes.status === "rejected"
          ? accRes.reason
          : balRes.status === "rejected"
          ? balRes.reason
          : new Error("Falha ao conectar na Cubyc");
      return handleApiError(err);
    }

    return NextResponse.json({
      success: true,
      account: account?.account,
      token: account?.token,
      balance: balance?.balance ?? account?.account?.balance ?? 0,
      plan: balance?.plan ?? { name: account?.account?.plan || "Ativo", keyPrice: 0 },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
