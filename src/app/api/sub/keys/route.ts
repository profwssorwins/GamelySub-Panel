import { NextResponse } from "next/server";
import { resolveSubReseller } from "@/lib/api-helpers";
import { listKeyRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;

  const records = listKeyRecords({
    subResellerId: reseller.id,
    q,
    limit: 150,
  }).map((h) => ({
    id: h.id,
    codes: h.codes,
    gameNames: h.gameNames,
    appIds: h.appIds,
    quantity: h.quantity,
    isCombo: h.isCombo,
    chargedAmount: h.chargedResellerAmount,
    createdAt: h.createdAt,
  }));

  return NextResponse.json({ records });
}
