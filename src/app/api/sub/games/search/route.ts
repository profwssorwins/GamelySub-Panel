import { NextResponse } from "next/server";
import { handleSubApiError, resolveSubReseller } from "@/lib/api-helpers";
import { searchCubycGames } from "@/lib/cubyc-client";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { errorResponse } = await resolveSubReseller(req);
  if (errorResponse) return errorResponse;

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
    return handleSubApiError(err);
  }
}
