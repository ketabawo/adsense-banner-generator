import { createHash, randomUUID } from 'node:crypto';
import { database } from '../db';
import { connectionStatus } from './connections';
import { verifyTestAccount, mutateTestResources, adsErrorMessage } from './api';
import { buildOperations, parseSubmission, SubmissionInputError } from './submission-input';

export async function submitCampaign(subject: string, body: unknown) {
  const input = parseSubmission(body);
  const connection = await connectionStatus(subject);
  if (!connection.customerId) throw new SubmissionInputError('テスト広告アカウントを接続してください。');
  if ((body as { customerId?: unknown }).customerId !== connection.customerId) throw new SubmissionInputError('接続先が変わりました。Reviewで接続先を確認し直してください。');
  const account = await verifyTestAccount(subject, connection.customerId, connection.loginCustomerId);
  if (account.currencyCode !== 'JPY') throw new SubmissionInputError('円建て（JPY）のテストアカウントを選択してください。');
  const db = database();
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const params = [subject, account.customerId, fingerprint];
  const previous = await db.query('SELECT id, state, resources FROM google_ads_submissions WHERE google_subject = $1 AND customer_id = $2 AND fingerprint = $3', params);
  if (previous.rows[0]) return previous.rows[0];
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: account.timeZone }).format(new Date());
  if (input.startDate < today) throw new SubmissionInputError('開始日は広告アカウントの今日以降にしてください。');
  const id = randomUUID();
  const mutateOperations = buildOperations(input, account.customerId, `studio-${id}`);
  // Ask Google to validate without creating anything before reserving the actual write.
  try {
    await mutateTestResources(subject, account.customerId, account.loginCustomerId, { mutateOperations, partialFailure: false, validateOnly: true });
  } catch (error) {
    throw new SubmissionInputError(`Google Adsの入稿前検証に失敗しました。広告はまだ作成していません。${adsErrorMessage(error)}`);
  }
  const inserted = await db.query(`INSERT INTO google_ads_submissions (id, google_subject, customer_id, fingerprint, state)
    VALUES ($4, $1, $2, $3, 'sending') ON CONFLICT DO NOTHING RETURNING id`, [...params, id]);
  if (!inserted.rowCount) {
    return (await db.query('SELECT id, state, resources FROM google_ads_submissions WHERE google_subject = $1 AND customer_id = $2 AND fingerprint = $3', params)).rows[0];
  }
  // Reserve durably BEFORE the network call. A crash or timeout must never trigger a replay.
  try {
    const response = await mutateTestResources(subject, account.customerId, account.loginCustomerId, {
      mutateOperations, partialFailure: false, validateOnly: false
    });
    const expected = ['campaignBudgetResult', 'campaignResult', 'campaignCriterionResult', 'campaignCriterionResult', 'adGroupResult', 'adGroupAdResult'];
    const rows = response.mutateOperationResponses;
    if (!rows || rows.length !== expected.length) throw new Error('Incomplete response');
    const resources: Record<string, string> = {};
    expected.forEach((key, index) => {
      const resource = rows[index]?.[key]?.resourceName;
      if (typeof resource !== 'string' || !resource.startsWith(`customers/${account.customerId}/`) || !/^customers\/\d{10}\/[A-Za-z]+\/[0-9~]+$/.test(resource)) throw new Error('Invalid resource');
      resources[`${key}-${index}`] = resource;
    });
    await db.query("UPDATE google_ads_submissions SET state = 'succeeded', resources = $2::jsonb, updated_at = now() WHERE id = $1", [id, JSON.stringify(resources)]);
    return { id, state: 'succeeded', resources };
  } catch {
    // Provider messages can contain private data. Ambiguous writes are kept for manual reconciliation.
    await db.query("UPDATE google_ads_submissions SET state = 'unknown', updated_at = now() WHERE id = $1", [id]);
    return { id, state: 'unknown', resources: {} };
  }
}
