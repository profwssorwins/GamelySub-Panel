import { NextResponse } from "next/server";
import { getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", getSessionCookieOptions(0, req));
  return res;
}
