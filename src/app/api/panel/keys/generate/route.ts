import { NextResponse } from "next/server";
import { handleApiError, requireAdmin } from "@/lib/api-helpers";
import { generateCubycKeys } from "@/lib/cubyc-client";
import {
  flushStore,
  recordKeyGeneration,
  refundResellerBalance,
  reserveResellerBalance,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  let reservedResellerId: string | null = null;
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
        { error: "Informe entre 1 e 50 AppIDs válidos." },
        { status: 400 }
      );
    }

    const subResellerId =
      typeof body?.subResellerId === "string" && body.subResellerId.trim()
        ? body.subResellerId.trim()
        : null;

    let subResellerName: string | null = null;
    let unitKeyPrice = 0;

    if (subResellerId) {
      // Primeiro lê o preço e reserva atomicamente antes de chamar a Cubyc
      const { findResellerById } = await import("@/lib/store");
      const target = findResellerById(subResellerId);
      if (!target) {
        return NextResponse.json(
          { error: "Sub-revendedor não encontrado." },
          { status: 404 }
        );
      }
      unitKeyPrice = target.keyPrice;
      const toReserve = Number((unitKeyPrice * quantity).toFixed(2));
      const reservation = reserveResellerBalance(subResellerId, toReserve);
      if (!reservation.ok) {
        return NextResponse.json(
          { error: reservation.error },
          { status: reservation.status }
        );
      }
      reservedResellerId = subResellerId;
      reservedAmount = toReserve;
      subResellerName = reservation.reseller.name;
    }

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
    const actualCharge = reservedResellerId
      ? Number((unitKeyPrice * actualCount).toFixed(2))
      : 0;

    // Estorna diferença caso tenham sido geradas menos keys que o reservado
    if (reservedResellerId && reservedAmount > actualCharge) {
      refundResellerBalance(
        reservedResellerId,
        Number((reservedAmount - actualCharge).toFixed(2))
      );
    }

    const firstKey = cubycRes.keys?.[0];
    const historyEntry = recordKeyGeneration(
      {
        codes: (cubycRes.keys || []).map((k) => k.code),
        gameNames: firstKey?.gameNames || [],
        appIds: firstKey?.gameIds || appIds,
        quantity: actualCount,
        apiSource: "AUTO",
        isCombo: cubycRes.isCombo,
        cubycCostCents: cubycRes.totalCents || 0,
        chargedResellerAmount: actualCharge,
        subResellerId: reservedResellerId,
        subResellerName,
        source: "panel",
      },
      reservedResellerId && actualCount > 0
        ? { resellerId: reservedResellerId, count: actualCount }
        : undefined
    );
    await flushStore();

    return NextResponse.json({
      ...cubycRes,
      chargedResellerAmount: actualCharge,
      historyEntry,
    });
  } catch (err) {
    if (reservedResellerId && reservedAmount > 0) {
      refundResellerBalance(reservedResellerId, reservedAmount);
      await flushStore();
    }
    return handleApiError(err);
  }
}
