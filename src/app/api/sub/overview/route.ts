import { NextResponse } from "next/server";
import { resolveSubReseller } from "@/lib/api-helpers";
import { listHistoryForReseller } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  // Remove qualquer campo interno de custo da infraestrutura
  const history = listHistoryForReseller(reseller.id, 30).map((h) => ({
    id: h.id,
    codes: h.codes,
    gameNames: h.gameNames,
    appIds: h.appIds,
    quantity: h.quantity,
    isCombo: h.isCombo,
    chargedAmount: h.chargedResellerAmount,
    createdAt: h.createdAt,
  }));

  return NextResponse.json({
    reseller: {
      id: reseller.id,
      name: reseller.name,
      email: reseller.email,
      planName: reseller.planName,
      keyPrice: reseller.keyPrice,
      balance: reseller.balance,
      apiKey: reseller.apiKey,
      totalKeysGenerated: reseller.totalKeysGenerated,
    },
    history,
  });
}
