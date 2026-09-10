import { providerErrorCode } from './errors';
import { env } from '$env/dynamic/private';
import { adsAccessToken } from './oauth';
import type { AdsAccount } from '$lib/types/google-ads';

const BASE = 'https://googleads.googleapis.com/v25';
export class AdsError extends Error {
  constructor(public readonly code: string) { super(code); }
}
const messages: Record<string, string> = {
  REQUIRED: '入稿に必要な項目が不足しています。（REQUIRED）',
  LAYOUT_PROBLEM: 'Google Adsが画像のレイアウトを受け付けませんでした。画像の内容や形式を確認してください。（LAYOUT_PROBLEM）',
  IMAGE_TOO_LARGE: '入稿画像の容量が上限を超えています。（IMAGE_TOO_LARGE）',
  INVALID_IMAGE: 'Google Adsが画像を読み取れませんでした。（INVALID_IMAGE）',
  UNEXPECTED_SIZE: 'Google Adsが画像サイズを受け付けませんでした。（UNEXPECTED_SIZE）',
  SERVICE_DISABLED: 'Google CloudでGoogle Ads APIが無効です。OAuthクライアントを作成したプロジェクトの「APIとサービス → ライブラリ」でGoogle Ads APIを有効にしてから、一覧を取得し直してください。（SERVICE_DISABLED）',
  ACCESS_TOKEN_SCOPE_INSUFFICIENT: 'Google Adsの権限が不足しています。「権限を再取得」からアクセスを許可してください。',
  DEVELOPER_TOKEN_INVALID: 'Developer Tokenが無効です。APIセンターの値と.envの設定を確認してください。（DEVELOPER_TOKEN_INVALID）',
  DEVELOPER_TOKEN_NOT_APPROVED: 'Developer Tokenはテスト用アカウント限定です。接続先とAPIセンターのアクセスレベルを確認してください。（DEVELOPER_TOKEN_NOT_APPROVED）',
  DEVELOPER_TOKEN_PROHIBITED: 'Developer TokenとGoogle Cloudプロジェクトの組み合わせが拒否されました。（DEVELOPER_TOKEN_PROHIBITED）',
  PROJECT_DISABLED: 'Google CloudプロジェクトがGoogle Ads APIの利用を許可されていません。（PROJECT_DISABLED）',
  USER_PERMISSION_DENIED: 'ログイン中のGoogleアカウントに対象のGoogle Adsアカウントへのアクセス権限がありません。（USER_PERMISSION_DENIED）',
  CUSTOMER_NOT_ENABLED: '対象のGoogle Adsアカウントが有効ではありません。（CUSTOMER_NOT_ENABLED）',
  GOOGLE_ACCOUNT_USER_AND_ADS_USER_MISMATCH: 'ログイン中のGoogleアカウントにGoogle Adsへのアクセスが登録されていません。',
  AUTH: 'Google Adsへの接続をやり直してください。権限が失効している可能性があります。',
  CONFIG: 'Developer Tokenを設定してください。',
  PERMISSION: 'Google Adsのアクセス権限を確認してください。テスト用アカウントとAPIの有効化設定も確認してください。',
  TEST_ONLY: '接続先にはテスト用広告アカウントを選んでください。',
  INVALID: 'アカウントIDが正しくありません。一覧を取得し直してください。',
  LIMIT: '取得件数またはAPI利用回数の上限に達しました。時間をおいて再度お試しください。',
  UPSTREAM: 'Google Adsから情報を取得できませんでした。時間をおいて再度お試しください。'
};
export function adsErrorMessage(error: unknown) { return messages[error instanceof AdsError ? error.code : 'UPSTREAM'] ?? messages.UPSTREAM; }
export function customerId(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{10}$/.test(value)) throw new AdsError('INVALID');
  return value;
}

type Customer = { id?: string; descriptiveName?: string; manager?: boolean; testAccount?: boolean; currencyCode?: string; timeZone?: string; status?: string };
export type AdsReportRow = { campaign?: { id?: string; name?: string; status?: string; campaignBudget?: string; advertisingChannelType?: string }; campaignBudget?: { resourceName?: string; amountMicros?: string; explicitlyShared?: boolean; referenceCount?: string; period?: string }; segments?: { date?: string }; metrics?: { impressions?: string; clicks?: string; costMicros?: string; conversions?: number } };
type Row = AdsReportRow & { customer?: Customer; customerClient?: Customer & { clientCustomer?: string } };
type ApiResponse = { resourceNames?: string[]; results?: Row[]; nextPageToken?: string; mutateOperationResponses?: Record<string, { resourceName?: string }>[] };

async function reader(subject: string) {
  const developer = env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!developer) throw new AdsError('CONFIG');
  let token: string;
  try { token = await adsAccessToken(subject); } catch { throw new AdsError('AUTH'); }
  async function request(path: string, login: string | null, body?: object): Promise<ApiResponse> {
    const headers: Record<string, string> = { authorization: `Bearer ${token}`, 'developer-token': developer, 'content-type': 'application/json' };
    if (login) headers['login-customer-id'] = customerId(login);
    let response: Response;
    try {
      response = await fetch(`${BASE}/${path}`, { method: body ? 'POST' : 'GET', headers,
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000), redirect: 'error' });
    } catch { throw new AdsError('UPSTREAM'); }
    // Never forward provider error bodies: they may contain sensitive account details.
    if (!response.ok) {
      const body = await response.json().catch(() => undefined);
      throw new AdsError(providerErrorCode(body) ?? (response.status === 401 ? 'AUTH' : response.status === 403 ? 'PERMISSION' : response.status === 429 ? 'LIMIT' : 'UPSTREAM'));
    }
    try { return await response.json(); } catch { throw new AdsError('UPSTREAM'); }
  }
  async function search(id: string, login: string | null, query: string) {
    const rows: Row[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const data = await request(`customers/${customerId(id)}/googleAds:search`, login, { query, ...(pageToken ? { pageToken } : {}) });
      rows.push(...(data.results ?? []));
      pageToken = data.nextPageToken;
      if (!pageToken) return rows;
    }
    throw new AdsError('LIMIT');
  }
  return { request, search };
}

// Call only after verifying the selected test account. No automatic retries for writes.
export async function mutateTestResources(subject: string, id: string, login: string | null, body: object) {
  return (await reader(subject)).request(`customers/${customerId(id)}/googleAds:mutate`, login, body);
}

const CUSTOMER_QUERY = 'SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account, customer.currency_code, customer.time_zone, customer.status FROM customer';
function asAccount(row: Customer, login: string | null): AdsAccount {
  if (row.testAccount !== true || row.manager === true) throw new AdsError('TEST_ONLY');
  return { customerId: customerId(row.id), loginCustomerId: login, name: row.descriptiveName || row.id!, currencyCode: row.currencyCode ?? '', timeZone: row.timeZone ?? '' };
}

export async function listTestAccounts(subject: string) {
  const api = await reader(subject);
  const data = await api.request('customers:listAccessibleCustomers', null);
  const roots = data.resourceNames ?? [];
  const accounts = new Map<string, AdsAccount>();
  let skipped = 0;
  for (const resource of roots.slice(0, 50)) {
    try {
      const match = /^customers\/(\d{10})$/.exec(resource);
      if (!match) throw new AdsError('INVALID');
      const rootId = match[1];
      const self = (await api.search(rootId, null, CUSTOMER_QUERY))[0]?.customer;
      if (!self) throw new AdsError('UPSTREAM');
      if (!self.manager) {
        const account = asAccount(self, null);
        accounts.set(`${account.customerId}:direct`, account);
      } else {
        const rows = await api.search(rootId, rootId,
          'SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.test_account, customer_client.currency_code, customer_client.time_zone, customer_client.status FROM customer_client WHERE customer_client.manager = FALSE AND customer_client.test_account = TRUE');
        for (const row of rows) {
          if (!row.customerClient) continue;
          const account = asAccount(row.customerClient, rootId);
          accounts.set(`${account.customerId}:${rootId}`, account);
        }
      }
    } catch (error) {
      if (error instanceof AdsError && ['AUTH', 'LIMIT', 'SERVICE_DISABLED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'DEVELOPER_TOKEN_INVALID', 'DEVELOPER_TOKEN_PROHIBITED', 'PROJECT_DISABLED'].includes(error.code)) throw error;
      skipped++;
    }
  }
  return { accounts: [...accounts.values()], skipped, truncated: roots.length > 50 };
}

// Rechecks access and test-account status at selection time; browser input is never trusted.
export async function verifyTestAccount(subject: string, id: string, login: string | null) {
  const api = await reader(subject);
  const row = (await api.search(customerId(id), login === null ? null : customerId(login), CUSTOMER_QUERY))[0]?.customer;
  if (!row || row.id !== id) throw new AdsError('INVALID');
  return asAccount(row, login);
}

// Read-only reporting; callers restrict campaign IDs to the authenticated owner's submissions.
export async function searchAdsReport(subject: string, id: string, login: string | null, query: string): Promise<AdsReportRow[]> {
  return (await reader(subject)).search(id, login, query);
}
