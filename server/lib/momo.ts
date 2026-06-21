import { getDb } from "../db";
import { DEFAULT_CURRENCY } from "./currency";

export const DEFAULT_MOMO_NUMBER = "0203907314";
export const DEFAULT_MOMO_RECIPIENT = "RAHAMATU NUHU";

export function getMomoFromEnv() {
  return {
    number: process.env.MOMO_NUMBER || DEFAULT_MOMO_NUMBER,
    recipientName: process.env.MOMO_RECIPIENT_NAME || DEFAULT_MOMO_RECIPIENT,
  };
}

export async function getMomoInfo() {
  const env = getMomoFromEnv();
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT key, value FROM site_settings WHERE key IN ('momo_number', 'momo_recipient_name')`
    );
    const settings = Object.fromEntries(result.rows.map((row) => [row.key as string, row.value as string]));
    return {
      number: settings.momo_number || env.number,
      recipientName: settings.momo_recipient_name || env.recipientName,
      provider: "Mobile Money",
      currency: DEFAULT_CURRENCY,
    };
  } catch {
    return {
      number: env.number,
      recipientName: env.recipientName,
      provider: "Mobile Money",
      currency: DEFAULT_CURRENCY,
    };
  }
}
