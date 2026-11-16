import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { createReseller, listResellers, sanitizeReseller } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  return NextResponse.json({
    resellers: listResellers().map(sanitizeReseller),
  });
}

export async function POST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password.trim() : "";

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nome e e-mail do sub-revendedor são obrigatórios." },
      { status: 400 }
    );
  }

  const keyPrice = Number(body?.keyPrice);
  if (!Number.isFinite(keyPrice) || keyPrice < 0) {
    return NextResponse.json(
      { error: "Preço por key inválido." },
      { status: 400 }
    );
  }

  const initialBalance = Number(body?.initialBalance || 0);
  const reseller = createReseller({
    name,
    email,
    password: password || undefined,
    planName: typeof body?.planName === "string" ? body.planName : "Padrão",
    keyPrice,
    initialBalance: Number.isFinite(initialBalance) ? initialBalance : 0,
    notes: typeof body?.notes === "string" ? body.notes : "",
  });

  return NextResponse.json({ reseller: sanitizeReseller(reseller) }, { status: 201 });
}
