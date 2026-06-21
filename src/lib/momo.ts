import { DEFAULT_CURRENCY } from "./currency";

export const DEFAULT_MOMO_NUMBER = "0203907314";
export const DEFAULT_MOMO_RECIPIENT = "RAHAMATU NUHU";

export interface MomoInfo {
  number: string;
  recipientName: string;
  provider: string;
  currency: string;
}

export const DEFAULT_MOMO_INFO: MomoInfo = {
  number: DEFAULT_MOMO_NUMBER,
  recipientName: DEFAULT_MOMO_RECIPIENT,
  provider: "Mobile Money",
  currency: DEFAULT_CURRENCY,
};