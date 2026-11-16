import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { listKeyRecords } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const subResellerId = searchParams.get("subResellerId") || undefined;
  const q = searchParams.get("q") || undefined;

  const records = listKeyRecords({ subResellerId, q, limit: 150 });
  return NextResponse.json({ records });
}
