import { NextResponse } from "next/server";
import { resolveSubReseller, verifySameOrigin } from "@/lib/api-helpers";
import { ExpayApiError, getExpayCharge } from "@/lib/expay-client";
import {
  findChargeByIdOrChargeId,
  flushStore,
  markChargePaidAndCreditOnce,
  updateChargeStatus,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!req.headers.get("authorization") && !verifySameOrigin(req)) {
    return NextResponse.json(
      { error: "Origem da requisição não autorizada." },
      { status: 403 }
    );
  }

  const { reseller, errorResponse } = await resolveSubReseller(req);
  if (errorResponse || !reseller) return errorResponse!;

  const { id } = await params;
  const localCharge = findChargeByIdOrChargeId(id);
  if (!localCharge || localCharge.subResellerId !== reseller.id) {
    return NextResponse.json(
      { error: "Cobrança não encontrada." },
      { status: 404 }
    );
  }

  if (localCharge.status === "paid" && localCharge.creditedAt) {
    return NextResponse.json({
      charge: localCharge,
      balance: reseller.balance,
      credited: false,
    });
  }

  try {
    const remote = await getExpayCharge(localCharge.chargeId);
    if (remote.status === "paid") {
      const result = markChargePaidAndCreditOnce(localCharge.id);
      await flushStore();
      return NextResponse.json({
        charge: result.charge,
        balance: result.newBalance ?? reseller.balance,
        credited: !result.alreadyCredited,
      });
    }

    const updated =
      updateChargeStatus(localCharge.id, remote.status) || localCharge;
    await flushStore();
    return NextResponse.json({
      charge: updated,
      balance: reseller.balance,
      credited: false,
    });
  } catch (err) {
    if (err instanceof ExpayApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 500 ? 502 : err.status }
      );
    }
    return NextResponse.json(
      { error: "Erro ao verificar pagamento." },
      { status: 500 }
    );
  }
}
