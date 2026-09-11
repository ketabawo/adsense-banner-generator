import type { ExecutionPlan, PlanChange } from '$lib/types/plan';
export function planValue(field: PlanChange['field'], value: string) {
  return field === 'name' ? value : new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 6 }).format(Number(value) / 1000000);
}
export const planStates: Record<ExecutionPlan['state'], string> = {
  sending: '反映送信中', resolved: '手動確認で終了', executing: '反映処理中', unknown: '結果不明・再照合が必要', applied: '反映確認済み', draft: '未承認', approved: '承認済み・未反映', cancelled: '取り消し済み', stale: '現在値が変わったため承認不可'
};
