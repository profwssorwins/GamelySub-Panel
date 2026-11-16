import { NextResponse } from "next/server";
import { handleApiError, requireAdmin } from "@/lib/api-helpers";
import { lookupCubycKey } from "@/lib/cubyc-client";
import { findKeyRecordByCode } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { code } = await params;
    if (!code?.trim()) {
      return NextResponse.json(
        { error: "Código da key é obrigatório." },
        { status: 400 }
      );
    }

    const localBatch = findKeyRecordByCode(code);
    const data = await lookupCubycKey(code);

    return NextResponse.json({
      ...data,
      localRecord: localBatch
        ? {
            id: localBatch.id,
            subResellerId: localBatch.subResellerId,
            subResellerName: localBatch.subResellerName,
            chargedResellerAmount: localBatch.chargedResellerAmount,
            source: localBatch.source,
            createdAt: localBatch.createdAt,
          }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
