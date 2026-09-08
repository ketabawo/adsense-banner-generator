export type AdsAccount = {
  customerId: string;
  loginCustomerId: string | null;
  name: string;
  currencyCode: string;
  timeZone: string;
};
export type AdsConnectionStatus = { configured: boolean; authorized: boolean; customerId: string | null; loginCustomerId: string | null };
