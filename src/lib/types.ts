export interface CubycAccountResponse {
  account: {
    id: string;
    name: string;
    plan: string;
    balance: number;
    status: string;
    canGenKeys: boolean;
    hasExternalIntegration: boolean;
  };
  token: {
    name: string;
    createdAt: string;
  };
}

export interface CubycBalanceResponse {
  success: boolean;
  balance: number;
  plan: {
    name: string;
    keyPrice: number;
    supportLevel?: string;
    advantages?: string[];
  };
}

export interface CubycGame {
  id: string;
  name: string;
  banner?: string;
  poster?: string;
  hasDenuvo: boolean;
  nsfw?: boolean;
  type?: string;
  tags?: string[];
  apiSource: string;
}

export interface CubycGeneratedKey {
  id: string;
  code: string;
  gameIds: number[];
  gameNames: string[];
  isCombo: boolean;
  chargedCents: number;
}

export interface CubycKeyLookupResponse {
  code: string;
  status: "available" | "redeemed";
  isCombo: boolean;
  games: Array<{ appId: string; name: string }>;
  chargedCents: number;
  createdAt: string;
  redeemed: null | {
    steamId64: string | null;
    redeemedAt: string;
    steamUser: string | null;
    activations: Array<{
      appId: string;
      gameName: string;
      activatedAt: string;
      ip: string | null;
      countryCode: string | null;
      region: string | null;
      city: string | null;
    }>;
  };
  revokedAt: string | null;
}

export interface SubReseller {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  planName: string;
  keyPrice: number; // Preço cobrado pela Gamely por key (em BRL)
  balance: number; // Saldo interno na Gamely (em BRL)
  status: "active" | "suspended";
  apiKey: string; // Prefixo gm_
  totalKeysGenerated: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KeyHistoryEntry {
  id: string;
  codes: string[];
  gameNames: string[];
  appIds: number[];
  quantity: number;
  apiSource: string;
  isCombo: boolean;
  cubycCostCents: number;
  chargedResellerAmount: number;
  subResellerId: string | null;
  subResellerName: string | null;
  source: "panel" | "sub_api";
  createdAt: string;
}

export interface GamelySettings {
  cubycApiUrl: string;
  cubycApiKey: string;
  brandName: string;
  defaultMarkupPrice: number;
  expayApiUrl: string;
  expayApiKey: string;
  expayWebhookSecret: string;
}

export type ChargeStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "expired"
  | "canceled";

export interface PaymentChargeRecord {
  id: string;
  chargeId: string;
  reference: string;
  subResellerId: string;
  subResellerName: string;
  amount: number;
  status: ChargeStatus;
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  expiresAt?: string | null;
  creditedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GamelyStoreData {
  settings: GamelySettings;
  resellers: SubReseller[];
  history: KeyHistoryEntry[];
  charges: PaymentChargeRecord[];
}
