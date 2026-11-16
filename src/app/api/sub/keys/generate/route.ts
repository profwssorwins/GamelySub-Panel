import { NextResponse } from "next/server";
import {
  handleSubApiError,
  resolveSubReseller,
  verifySameOrigin,
} from "@/lib/api-helpers";
import { generateCubycKeys } from "@/lib/cubyc-client";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  flushStore,
  recordKeyGeneration,
  refundResellerBalance,
  reserveResellerBalance,
} from "@/lib/store";

export const dynamic = "force-dynamic";

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
    `subgen:${reseller.id}:${getClientIp(req)}`,
    25,
    60_000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde alguns segundos." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } }
    );
  }

  let reservedAmount = 0;

  try {
    const body = await req.json().catch(() => ({}));
    const rawQty = Math.floor(Number(body?.quantity) || 1);
    const quantity = Math.max(1, Math.min(100, rawQty));

    const appIds: number[] = Array.isArray(body?.appIds)
      ? body.appIds
          .map((x: unknown) => Number(x))
          .filter((n: number) => Number.isInteger(n) && n > 0)
      : body?.appId
      ? [Number(body.appId)].filter((n) => Number.isInteger(n) && n > 0)
      : [];

    if (appIds.length === 0 || appIds.length > 50) {
      return NextResponse.json(
        { error: "Informe appId ou appIds válido." },
        { status: 400 }
      );
    }

    const requiredAmount = Number((reseller.keyPrice * quantity).toFixed(2));
    const reservation = reserveResellerBalance(reseller.id, requiredAmount);
    if (!reservation.ok) {
      return NextResponse.json(
        { error: reservation.error },
        { status: reservation.status }
      );
    }
    reservedAmount = requiredAmount;

    let expiration:
      | { type: "never" | "duration"; days?: number }
      | undefined;
    if (body?.expiration?.type === "duration") {
      const days = Math.max(
        1,
        Math.min(365, Math.floor(Number(body.expiration.days) || 7))
      );
      expiration = { type: "duration", days };
    }

    const cubycRes = await generateCubycKeys({
      ...(appIds.length === 1 ? { appId: appIds[0] } : { appIds }),
      quantity,
      expiration,
    });

    const actualCount = cubycRes.keys?.length || cubycRes.generated || 0;
    const chargedAmount = Number((reseller.keyPrice * actualCount).toFixed(2));

    if (reservedAmount > chargedAmount) {
      refundResellerBalance(
        reseller.id,
        Number((reservedAmount - chargedAmount).toFixed(2))
      );
    }

    const firstKey = cubycRes.keys?.[0];
    recordKeyGeneration(
      {
        codes: (cubycRes.keys || []).map((k) => k.code),
        gameNames: firstKey?.gameNames || [],
        appIds: firstKey?.gameIds || appIds,
        quantity: actualCount,
        apiSource: "AUTO",
        isCombo: cubycRes.isCombo,
        cubycCostCents: cubycRes.totalCents || 0,
        chargedResellerAmount: chargedAmount,
        subResellerId: reseller.id,
        subResellerName: reseller.name,
        source: "sub_api",
      },
      actualCount > 0 ? { resellerId: reseller.id, count: actualCount } : undefined
    );
    await flushStore();

    const remainingBalance = Number(
      (reservation.reseller.balance + (reservedAmount - chargedAmount)).toFixed(2)
    );

    return NextResponse.json({
      generated: actualCount,
      chargedAmount,
      remainingBalance,
      isCombo: cubycRes.isCombo,
      keys: (cubycRes.keys || []).map((k) => ({
        code: k.code,
        gameIds: k.gameIds,
        gameNames: k.gameNames,
        isCombo: k.isCombo,
      })),
    });
  } catch (err) {
    if (reservedAmount > 0) {
      refundResellerBalance(reseller.id, reservedAmount);
      await flushStore();
    }
    return handleSubApiError(err);
  }
}
