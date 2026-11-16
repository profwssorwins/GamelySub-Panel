import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  ChargeStatus,
  GamelySettings,
  GamelyStoreData,
  KeyHistoryEntry,
  PaymentChargeRecord,
  SubReseller,
} from "./types";
import { generateSubApiKey, hashPassword } from "./auth";

const PRIMARY_DATA_DIR = path.join(process.cwd(), "data");
const FALLBACK_DATA_DIR = path.join(os.tmpdir(), "gamely-data");

let resolvedDataDir: string | null = null;
let memoryFallbackStore: GamelyStoreData | null = null;

function getStorePath(): string | null {
  if (resolvedDataDir) {
    return path.join(resolvedDataDir, "gamely-store.json");
  }
  for (const dir of [PRIMARY_DATA_DIR, FALLBACK_DATA_DIR]) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.accessSync(dir, fs.constants.W_OK);
      resolvedDataDir = dir;
      return path.join(dir, "gamely-store.json");
    } catch {
      // Tenta próximo diretório (ex: /tmp em ambientes read-only como Vercel)
    }
  }
  return null;
}

function defaultStore(): GamelyStoreData {
  return {
    settings: {
      cubycApiUrl: process.env.CUBYC_API_URL?.trim() || "http://localhost:3000",
      cubycApiKey: process.env.CUBYC_API_KEY?.trim() || "",
      brandName: "Gamely",
      defaultMarkupPrice: 2.5,
      expayApiUrl:
        process.env.EXPAY_API_URL?.trim() ||
        "https://api.expaybrasil.com/api/v1",
      expayApiKey: process.env.EXPAY_API_KEY?.trim() || "",
      expayWebhookSecret: process.env.EXPAY_WEBHOOK_SECRET?.trim() || "",
    },
    resellers: [],
    history: [],
    charges: [],
  };
}

function ensureStoreFile(): string | null {
  const storePath = getStorePath();
  if (!storePath) return null;
  try {
    if (!fs.existsSync(storePath)) {
      const initial = memoryFallbackStore || defaultStore();
      fs.writeFileSync(storePath, JSON.stringify(initial, null, 2), "utf8");
    }
    return storePath;
  } catch {
    return null;
  }
}

export function readStore(): GamelyStoreData {
  const storePath = ensureStoreFile();
  if (!storePath) {
    if (!memoryFallbackStore) memoryFallbackStore = defaultStore();
    return memoryFallbackStore;
  }
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<GamelyStoreData>;
    const defaults = defaultStore();
    const loaded: GamelyStoreData = {
      settings: {
        cubycApiUrl:
          parsed.settings?.cubycApiUrl || defaults.settings.cubycApiUrl,
        cubycApiKey:
          parsed.settings?.cubycApiKey !== undefined
            ? parsed.settings.cubycApiKey
            : defaults.settings.cubycApiKey,
        brandName: parsed.settings?.brandName || defaults.settings.brandName,
        defaultMarkupPrice:
          typeof parsed.settings?.defaultMarkupPrice === "number"
            ? parsed.settings.defaultMarkupPrice
            : defaults.settings.defaultMarkupPrice,
        expayApiUrl:
          parsed.settings?.expayApiUrl || defaults.settings.expayApiUrl,
        expayApiKey:
          parsed.settings?.expayApiKey !== undefined
            ? parsed.settings.expayApiKey
            : defaults.settings.expayApiKey,
        expayWebhookSecret:
          parsed.settings?.expayWebhookSecret !== undefined
            ? parsed.settings.expayWebhookSecret
            : defaults.settings.expayWebhookSecret,
      },
      resellers: Array.isArray(parsed.resellers) ? parsed.resellers : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      charges: Array.isArray(parsed.charges) ? parsed.charges : [],
    };
    memoryFallbackStore = loaded;
    return loaded;
  } catch {
    if (!memoryFallbackStore) memoryFallbackStore = defaultStore();
    return memoryFallbackStore;
  }
}

export function writeStore(data: GamelyStoreData): void {
  memoryFallbackStore = data;
  const storePath = ensureStoreFile();
  if (!storePath) return;
  try {
    const tmpPath = `${storePath}.${crypto.randomBytes(4).toString("hex")}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(tmpPath, storePath);
  } catch {
    // Mantém em memória caso escrita falhe
  }
}

export function getEffectiveSettings(): GamelySettings {
  const store = readStore();
  return {
    cubycApiUrl:
      store.settings.cubycApiUrl ||
      process.env.CUBYC_API_URL?.trim() ||
      "http://localhost:3000",
    cubycApiKey:
      store.settings.cubycApiKey || process.env.CUBYC_API_KEY?.trim() || "",
    brandName: store.settings.brandName || "Gamely",
    defaultMarkupPrice: store.settings.defaultMarkupPrice ?? 2.5,
    expayApiUrl:
      store.settings.expayApiUrl ||
      process.env.EXPAY_API_URL?.trim() ||
      "https://api.expaybrasil.com/api/v1",
    expayApiKey:
      store.settings.expayApiKey || process.env.EXPAY_API_KEY?.trim() || "",
    expayWebhookSecret:
      store.settings.expayWebhookSecret ||
      process.env.EXPAY_WEBHOOK_SECRET?.trim() ||
      "",
  };
}

export function updateSettings(partial: Partial<GamelySettings>): GamelySettings {
  const store = readStore();
  store.settings = {
    ...store.settings,
    ...partial,
  };
  writeStore(store);
  return store.settings;
}

export function listResellers(): SubReseller[] {
  return readStore().resellers;
}

export function findResellerById(id: string): SubReseller | undefined {
  return readStore().resellers.find((r) => r.id === id);
}

export function findResellerByApiKey(apiKey: string): SubReseller | undefined {
  return readStore().resellers.find((r) => r.apiKey === apiKey);
}

export function findResellerByEmail(email: string): SubReseller | undefined {
  const normalized = email.trim().toLowerCase();
  return readStore().resellers.find((r) => r.email === normalized);
}

export function sanitizeReseller(r: SubReseller): Omit<SubReseller, "passwordHash"> & { hasPassword: boolean } {
  const { passwordHash, ...rest } = r;
  return {
    ...rest,
    hasPassword: Boolean(passwordHash),
  };
}

export function createReseller(input: {
  name: string;
  email: string;
  password?: string;
  planName?: string;
  keyPrice: number;
  initialBalance?: number;
  notes?: string;
}): SubReseller {
  const store = readStore();
  const now = new Date().toISOString();
  const reseller: SubReseller = {
    id: `GM-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    ...(input.password?.trim()
      ? { passwordHash: hashPassword(input.password.trim()) }
      : {}),
    planName: (input.planName || "Padrão").trim(),
    keyPrice: Math.max(0, Number(input.keyPrice) || 0),
    balance: Math.max(0, Number(input.initialBalance) || 0),
    status: "active",
    apiKey: generateSubApiKey(),
    totalKeysGenerated: 0,
    notes: input.notes?.trim() || "",
    createdAt: now,
    updatedAt: now,
  };
  store.resellers.unshift(reseller);
  writeStore(store);
  return reseller;
}

export function updateReseller(
  id: string,
  patch: Partial<
    Pick<
      SubReseller,
      "name" | "email" | "passwordHash" | "planName" | "keyPrice" | "status" | "notes" | "balance" | "apiKey"
    >
  >
): SubReseller | null {
  const store = readStore();
  const idx = store.resellers.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const current = store.resellers[idx];
  const updated: SubReseller = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  store.resellers[idx] = updated;
  writeStore(store);
  return updated;
}

export function adjustResellerBalance(
  id: string,
  delta: number
): SubReseller | null {
  const store = readStore();
  const idx = store.resellers.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  const current = store.resellers[idx];
  const nextBalance = Math.max(0, Number((current.balance + delta).toFixed(2)));
  const updated: SubReseller = {
    ...current,
    balance: nextBalance,
    updatedAt: new Date().toISOString(),
  };
  store.resellers[idx] = updated;
  writeStore(store);
  return updated;
}

export function deleteReseller(id: string): boolean {
  const store = readStore();
  const before = store.resellers.length;
  store.resellers = store.resellers.filter((r) => r.id !== id);
  if (store.resellers.length === before) return false;
  writeStore(store);
  return true;
}

export function reserveResellerBalance(
  id: string,
  amount: number
):
  | { ok: true; reseller: SubReseller }
  | { ok: false; error: string; status: number } {
  const store = readStore();
  const idx = store.resellers.findIndex((r) => r.id === id);
  if (idx === -1) {
    return { ok: false, error: "Sub-revendedor não encontrado.", status: 404 };
  }
  const r = store.resellers[idx];
  if (r.status !== "active") {
    return { ok: false, error: "Sub-revendedor está suspenso.", status: 403 };
  }
  const safeAmount = Math.max(0, Number(amount.toFixed(2)));
  if (r.balance < safeAmount) {
    return {
      ok: false,
      error: `Saldo insuficiente. Necessário: R$ ${safeAmount.toFixed(
        2
      )}, disponível: R$ ${r.balance.toFixed(2)}.`,
      status: 402,
    };
  }
  const updated: SubReseller = {
    ...r,
    balance: Math.max(0, Number((r.balance - safeAmount).toFixed(2))),
    updatedAt: new Date().toISOString(),
  };
  store.resellers[idx] = updated;
  writeStore(store);
  return { ok: true, reseller: updated };
}

export function refundResellerBalance(id: string, amount: number): void {
  if (amount <= 0) return;
  const store = readStore();
  const idx = store.resellers.findIndex((r) => r.id === id);
  if (idx === -1) return;
  const r = store.resellers[idx];
  store.resellers[idx] = {
    ...r,
    balance: Number((r.balance + amount).toFixed(2)),
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function recordKeyGeneration(
  entry: Omit<KeyHistoryEntry, "id" | "createdAt">,
  subResellerCountUpdate?: { resellerId: string; count: number }
): KeyHistoryEntry {
  const store = readStore();
  const fullEntry: KeyHistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (subResellerCountUpdate && subResellerCountUpdate.count > 0) {
    const idx = store.resellers.findIndex(
      (r) => r.id === subResellerCountUpdate.resellerId
    );
    if (idx !== -1) {
      const r = store.resellers[idx];
      store.resellers[idx] = {
        ...r,
        totalKeysGenerated:
          r.totalKeysGenerated + subResellerCountUpdate.count,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  store.history.unshift(fullEntry);
  // Mantém os últimos 500 registros no histórico local
  if (store.history.length > 500) {
    store.history = store.history.slice(0, 500);
  }
  writeStore(store);
  return fullEntry;
}

export function listHistory(limit = 100): KeyHistoryEntry[] {
  return readStore().history.slice(0, limit);
}

export function listHistoryForReseller(
  resellerId: string,
  limit = 50
): KeyHistoryEntry[] {
  return readStore()
    .history.filter((h) => h.subResellerId === resellerId)
    .slice(0, limit);
}

export function isKeyOwnedByReseller(code: string, resellerId: string): boolean {
  const normalized = code.trim();
  return readStore().history.some(
    (h) => h.subResellerId === resellerId && h.codes.includes(normalized)
  );
}

export function findKeyRecordByCode(code: string): KeyHistoryEntry | undefined {
  const normalized = code.trim();
  return readStore().history.find((h) => h.codes.includes(normalized));
}

export function listKeyRecords(options?: {
  subResellerId?: string;
  q?: string;
  limit?: number;
}): KeyHistoryEntry[] {
  const q = options?.q?.trim().toLowerCase() || "";
  const subResellerId = options?.subResellerId?.trim() || "";
  const limit = options?.limit ?? 100;

  return readStore()
    .history.filter((h) => {
      if (subResellerId && h.subResellerId !== subResellerId) return false;
      if (q) {
        const matchCode = h.codes.some((c) => c.toLowerCase().includes(q));
        const matchGame = h.gameNames.some((g) => g.toLowerCase().includes(q));
        const matchReseller = (h.subResellerName || "")
          .toLowerCase()
          .includes(q);
        if (!matchCode && !matchGame && !matchReseller) return false;
      }
      return true;
    })
    .slice(0, limit);
}

// ==========================================
// Cobranças ExPay (DB Local + Crédito Idempotente)
// ==========================================

export function createChargeRecord(
  input: Omit<PaymentChargeRecord, "createdAt" | "updatedAt">
): PaymentChargeRecord {
  const store = readStore();
  const now = new Date().toISOString();
  const record: PaymentChargeRecord = {
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  store.charges.unshift(record);
  if (store.charges.length > 500) {
    store.charges = store.charges.slice(0, 500);
  }
  writeStore(store);
  return record;
}

export function findChargeByIdOrChargeId(
  idOrChargeId: string
): PaymentChargeRecord | undefined {
  const target = idOrChargeId.trim();
  return readStore().charges.find(
    (c) => c.id === target || c.chargeId === target || c.reference === target
  );
}

export function listChargesForReseller(
  resellerId: string,
  limit = 30
): PaymentChargeRecord[] {
  return readStore()
    .charges.filter((c) => c.subResellerId === resellerId)
    .slice(0, limit);
}

export function markChargePaidAndCreditOnce(idOrChargeId: string): {
  found: boolean;
  alreadyCredited: boolean;
  charge?: PaymentChargeRecord;
  newBalance?: number;
} {
  const store = readStore();
  const target = idOrChargeId.trim();
  const cIdx = store.charges.findIndex(
    (c) => c.id === target || c.chargeId === target || c.reference === target
  );
  if (cIdx === -1) {
    return { found: false, alreadyCredited: false };
  }

  const charge = store.charges[cIdx];
  if (charge.status === "paid" || charge.creditedAt) {
    const r = store.resellers.find((x) => x.id === charge.subResellerId);
    return {
      found: true,
      alreadyCredited: true,
      charge,
      newBalance: r?.balance,
    };
  }

  const now = new Date().toISOString();
  const updatedCharge: PaymentChargeRecord = {
    ...charge,
    status: "paid",
    creditedAt: now,
    updatedAt: now,
  };
  store.charges[cIdx] = updatedCharge;

  let newBalance: number | undefined;
  const rIdx = store.resellers.findIndex((r) => r.id === charge.subResellerId);
  if (rIdx !== -1) {
    const r = store.resellers[rIdx];
    newBalance = Number((r.balance + charge.amount).toFixed(2));
    store.resellers[rIdx] = {
      ...r,
      balance: newBalance,
      updatedAt: now,
    };
  }

  writeStore(store);
  return {
    found: true,
    alreadyCredited: false,
    charge: updatedCharge,
    newBalance,
  };
}

export function updateChargeStatus(
  idOrChargeId: string,
  status: ChargeStatus
): PaymentChargeRecord | null {
  const store = readStore();
  const target = idOrChargeId.trim();
  const idx = store.charges.findIndex(
    (c) => c.id === target || c.chargeId === target || c.reference === target
  );
  if (idx === -1) return null;

  const current = store.charges[idx];
  // Não rebaixar cobrança já paga/creditada exceto em reembolso explícito
  if (current.status === "paid" && status !== "refunded") {
    return current;
  }

  const updated: PaymentChargeRecord = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  store.charges[idx] = updated;
  writeStore(store);
  return updated;
}
