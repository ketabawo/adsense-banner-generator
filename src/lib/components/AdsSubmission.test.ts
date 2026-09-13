import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, expect, it, vi } from 'vitest';
import AdsSubmission from './AdsSubmission.svelte';
import { campaignDraft, adsDraft } from '../../test/fixtures';
afterEach(() => vi.unstubAllGlobals());
it('requires account review and declaration, then submits the reviewed account and image', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ customerId: '2222222222' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'record', state: 'succeeded', resources: { campaign: 'customers/2222222222/campaigns/42' } })));
  vi.stubGlobal('fetch', fetcher);
  const makeImage = vi.fn().mockResolvedValue('data:image/png;base64,example');
  render(AdsSubmission, { draft: campaignDraft(), ads: adsDraft(), makeImage });
  expect(screen.queryByText('この内容で停止状態の広告を作成')).not.toBeInTheDocument();
  await fireEvent.click(screen.getByText('接続先を確認'));
  const submit = await screen.findByText('この内容で停止状態の広告を作成');
  expect(submit).toBeDisabled();
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(submit);
  await screen.findByText(/停止状態で入稿済み/);
  const payload = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(payload).toMatchObject({ customerId: '2222222222', noEuPoliticalAds: true, images: [{ id: 'active', image: 'data:image/png;base64,example' }] });
  expect(makeImage).toHaveBeenCalledTimes(1);
});
it('shows validation errors without claiming success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ customerId: '2222222222' })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ message: '開始日を変更してください。' }), { status: 400 })));
  render(AdsSubmission, { draft: campaignDraft(), ads: adsDraft(), makeImage: async () => 'image' });
  await fireEvent.click(screen.getByText('接続先を確認'));
  await screen.findByRole('checkbox');
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(screen.getByText('この内容で停止状態の広告を作成'));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('開始日を変更してください。'));
});
it('submits the selected variants together and shows their resource names', async () => {
  const result = { id: 'record', state: 'succeeded', resources: { 'campaignResult-1': 'customers/2222222222/campaigns/42', 'adGroupResult-4': 'customers/2222222222/adGroups/7', 'campaignCriterionResult-2': 'customers/2222222222/campaignCriteria/99' }, variantResults: { rect: { state: 'succeeded', resourceName: 'customers/2222222222/adGroupAds/11' }, wide: { state: 'succeeded', resourceName: 'customers/2222222222/adGroupAds/12' } } };
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ customerId: '2222222222' }))).mockResolvedValueOnce(new Response(JSON.stringify(result)));
  vi.stubGlobal('fetch', fetcher);
  const makeImages = vi.fn().mockResolvedValue([{ id: 'rect', image: 'image-a' }, { id: 'wide', image: 'image-b' }]);
  render(AdsSubmission, { draft: campaignDraft(), ads: adsDraft(), makeImages, selectedCount: 2, selectionKey: 'rect,wide' });
  await fireEvent.click(screen.getByText('接続先を確認'));
  await screen.findByRole('checkbox');
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(screen.getByText('この内容で停止状態の広告を作成'));
  await screen.findByText(/停止状態で入稿済み/);
  expect(JSON.parse(fetcher.mock.calls[1][1].body).images).toEqual([{ id: 'rect', image: 'image-a' }, { id: 'wide', image: 'image-b' }]);
  expect(screen.getByText(/Variant rect: 成功/)).toHaveTextContent('adGroupAds/11');
  expect(screen.getByText(/Variant wide: 成功/)).toHaveTextContent('adGroupAds/12');
  expect(screen.getByText(/Campaign: customers/)).toHaveTextContent('campaigns/42');
  expect(screen.getByText(/Ad Group: customers/)).toHaveTextContent('adGroups/7');
  expect(screen.queryByText(/campaignCriteria\/99/)).not.toBeInTheDocument();
});
it('marks every selected variant as not created when preflight rejects the batch', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ customerId: '2222222222' }))).mockResolvedValueOnce(new Response(JSON.stringify({ message: '画像を確認してください。' }), { status: 400 })));
  render(AdsSubmission, { draft: campaignDraft(), ads: adsDraft(), makeImages: async () => [{ id: 'rect', image: 'image-a' }, { id: 'wide', image: 'image-b' }], selectedCount: 2 });
  await fireEvent.click(screen.getByText('接続先を確認'));
  await screen.findByRole('checkbox');
  await fireEvent.click(screen.getByRole('checkbox'));
  await fireEvent.click(screen.getByText('この内容で停止状態の広告を作成'));
  await screen.findByText('画像を確認してください。');
  expect(screen.getByText('Variant rect: 作成されませんでした')).toBeInTheDocument();
  expect(screen.getByText('Variant wide: 作成されませんでした')).toBeInTheDocument();
});
