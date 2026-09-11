export type CampaignSettings = {
  customerId: string;
  campaignId: string;
  name: string;
  status: string;
  currency: 'JPY';
  budgetResource: string;
  budgetMicros: string;
  fetchedAt: string;
};
export type PlanChange = { field: 'name' | 'dailyBudget'; before: string; after: string };
export type ExecutionPlan = {
  id: string;
  customerId: string;
  campaignId: string;
  state: 'draft' | 'approved' | 'cancelled' | 'stale' | 'executing' | 'unknown' | 'applied' | 'sending' | 'resolved';
  before: CampaignSettings;
  changes: PlanChange[];
  reason: string;
  createdAt: string;
  decidedAt: string | null;
  recovery?: { reason: string; settings: CampaignSettings } | null;
};

export type PlanAction = { id: string; planId: string; state: string; occurredAt: string };
