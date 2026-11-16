import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findResellerById, hydrateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  if (session.role === "admin") {
    return NextResponse.json({
      authenticated: true,
      role: "admin",
    });
  }

  if (session.role === "reseller" && session.resellerId) {
    await hydrateStore();
    const reseller = findResellerById(session.resellerId);
    if (!reseller || reseller.status !== "active") {
      return NextResponse.json({ authenticated: false });
    }
    return NextResponse.json({
      authenticated: true,
      role: "reseller",
      reseller: {
        id: reseller.id,
        name: reseller.name,
        email: reseller.email,
        planName: reseller.planName,
        balance: reseller.balance,
        keyPrice: reseller.keyPrice,
      },
    });
  }

  return NextResponse.json({ authenticated: false });
}
