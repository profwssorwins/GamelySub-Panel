import { NextResponse } from "next/server";
import { handleApiError, requireAdmin } from "@/lib/api-helpers";
import { searchCubycGames } from "@/lib/cubyc-client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(req.url);
    const data = await searchCubycGames({
      q: searchParams.get("q") || undefined,
      api: searchParams.get("api") || undefined,
      denuvo: searchParams.get("denuvo") || undefined,
      nsfw: searchParams.get("nsfw") || undefined,
      type: searchParams.get("type") || undefined,
      limit: Number(searchParams.get("limit") || "48"),
    });
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}
