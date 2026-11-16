import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { getCubycAccount, getCubycBalance } from "@/lib/cubyc-client";
import { getEffectiveSettings, listHistory, listResellers } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const settings = getEffectiveSettings();
  const resellers = listResellers();
  const history = listHistory(25);

  let cubyc: {
    connected: boolean;
    error?: string;
    account?: Awaited<ReturnType<typeof getCubycAccount>>["account"];
    tokenName?: string;
    balance?: number;
    plan?: Awaited<ReturnType<typeof getCubycBalance>>["plan"];
  } = { connected: false };

  if (settings.cubycApiKey) {
    try {
      const [accRes, balRes] = await Promise.allSettled([
        getCubycAccount(),
        getCubycBalance(),
      ]);

      const acc = accRes.status === "fulfilled" ? accRes.value : null;
      const bal = balRes.status === "fulfilled" ? balRes.value : null;

      if (acc || bal) {
        cubyc = {
          connected: true,
          account: acc?.account,
          tokenName: acc?.token?.name,
          balance: bal?.balance ?? acc?.account?.balance,
          plan: bal?.plan,
        };
      } else {
        const firstErr =
          accRes.status === "rejected"
            ? accRes.reason
            : balRes.status === "rejected"
            ? balRes.reason
            : null;
        cubyc = {
          connected: false,
          error:
            firstErr instanceof Error
              ? firstErr.message
              : "Erro ao conectar na Cubyc",
        };
      }
    } catch (err: unknown) {
      cubyc = {
        connected: false,
        error: err instanceof Error ? err.message : "Erro ao conectar na Cubyc",
      };
    }
  } else {
    cubyc = {
      connected: false,
      error: "API Key da Cubyc não configurada.",
    };
  }

  const totalResellers = resellers.length;
  const activeResellers = resellers.filter((r) => r.status === "active").length;
  const totalResellersBalance = resellers.reduce((acc, r) => acc + r.balance, 0);
  const totalKeysGenerated = history.reduce((acc, h) => acc + h.quantity, 0);
  const totalChargedResellers = history.reduce(
    (acc, h) => acc + h.chargedResellerAmount,
    0
  );

  return NextResponse.json({
    brandName: settings.brandName,
    cubyc,
    metrics: {
      totalResellers,
      activeResellers,
      totalResellersBalance: Number(totalResellersBalance.toFixed(2)),
      totalKeysGenerated,
      totalChargedResellers: Number(totalChargedResellers.toFixed(2)),
    },
    history,
  });
}
