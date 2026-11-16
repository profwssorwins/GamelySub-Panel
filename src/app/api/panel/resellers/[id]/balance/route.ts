import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { adjustResellerBalance, flushStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount);

  if (
    !Number.isFinite(amount) ||
    amount === 0 ||
    Math.abs(amount) > 1_000_000
  ) {
    return NextResponse.json(
      { error: "Valor inválido para ajuste de saldo." },
      { status: 400 }
    );
  }

  const updated = adjustResellerBalance(id, amount);
  if (!updated) {
    return NextResponse.json(
      { error: "Sub-revendedor não encontrado." },
      { status: 404 }
    );
  }
  await flushStore();

  return NextResponse.json({ reseller: updated });
}
