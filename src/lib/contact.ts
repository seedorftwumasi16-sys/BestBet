/** BestBet support contact details */
export const SUPPORT_EMAIL = "support@bestbet.gh";

export interface SupportPhone {
  display: string;
  tel: string;
  label: string;
}

export const SUPPORT_PHONES: SupportPhone[] = [
  { display: "0248056114", tel: "+233248056114", label: "Support Line 1" },
  { display: "0556986467", tel: "+233556986467", label: "Support Line 2" },
];

export function toTelHref(phone: SupportPhone): string {
  return `tel:${phone.tel}`;
}

export function toMailtoHref(email = SUPPORT_EMAIL): string {
  return `mailto:${email}`;
}
