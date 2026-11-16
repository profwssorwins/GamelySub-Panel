import { NextResponse } from "next/server";
import { resolveSubReseller } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  return NextResponse.json({
    success: true,
    reseller: {
      id: reseller.id,
      name: reseller.name,
      planName: reseller.planName,
      keyPrice: reseller.keyPrice,
      balance: reseller.balance,
      totalKeysGenerated: reseller.totalKeysGenerated,
    },
  });
}
