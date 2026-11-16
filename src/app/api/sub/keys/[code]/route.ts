import { NextResponse } from "next/server";
import { handleSubApiError, resolveSubReseller } from "@/lib/api-helpers";
import { lookupCubycKey } from "@/lib/cubyc-client";
import { isKeyOwnedByReseller } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  const { code } = await params;
  if (!code?.trim()) {
    return NextResponse.json(
      { error: "Código da key é obrigatório." },
      { status: 400 }
    );
  }

  // Garante que o sub-revendedor só consulte keys geradas por ele
  if (!isKeyOwnedByReseller(code, reseller.id)) {
    return NextResponse.json(
      { error: "Key não encontrada na sua conta." },
      { status: 404 }
    );
  }

  try {
    const data = await lookupCubycKey(code);
    return NextResponse.json({
      code: data.code,
      status: data.status,
      isCombo: data.isCombo,
      games: data.games,
      createdAt: data.createdAt,
      redeemed: data.redeemed,
      revokedAt: data.revokedAt,
    });
  } catch (err) {
    return handleSubApiError(err);
  }
}
