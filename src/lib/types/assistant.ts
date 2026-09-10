export type AssistantMessage = { role: 'user' | 'assistant'; content: string };
export type Recommendation = { title: string; reason: string; nextStep: string };
export type CampaignAdvice = {
  summary: string;
  observations: string[];
  limitations: string[];
  recommendations: Recommendation[];
};
export type AssistantReply = {
  advice: CampaignAdvice;
  context: { campaignId: string; customerId: string; start: string; end: string; fetchedAt: string; testAccount: true };
};
