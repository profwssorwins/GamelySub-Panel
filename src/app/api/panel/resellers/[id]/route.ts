import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { generateSubApiKey, hashPassword } from "@/lib/auth";
import { deleteReseller, sanitizeReseller, updateReseller } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body?.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body?.email === "string" && body.email.trim()) {
    patch.email = body.email.trim().toLowerCase();
  }
  if (typeof body?.password === "string" && body.password.trim()) {
    patch.passwordHash = hashPassword(body.password.trim());
  }
  if (typeof body?.planName === "string" && body.planName.trim()) {
    patch.planName = body.planName.trim();
  }
  if (body?.keyPrice !== undefined) {
    const kp = Number(body.keyPrice);
    if (!Number.isFinite(kp) || kp < 0) {
      return NextResponse.json(
        { error: "Preço por key inválido." },
        { status: 400 }
      );
    }
    patch.keyPrice = kp;
  }
  if (body?.status === "active" || body?.status === "suspended") {
    patch.status = body.status;
  }
  if (typeof body?.notes === "string") {
    patch.notes = body.notes;
  }
  if (body?.regenerateApiKey === true) {
    patch.apiKey = generateSubApiKey();
  }

  const updated = updateReseller(id, patch);
  if (!updated) {
    return NextResponse.json(
      { error: "Sub-revendedor não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ reseller: sanitizeReseller(updated) });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const { id } = await params;
  const ok = deleteReseller(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Sub-revendedor não encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
