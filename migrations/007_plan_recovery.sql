ALTER TABLE execution_plans DROP CONSTRAINT execution_plans_state_check;
ALTER TABLE execution_plans ADD CHECK (state IN ('draft','approved','cancelled','stale','executing','sending','unknown','applied','resolved'));
ALTER TABLE execution_plans ADD COLUMN recovery jsonb;
ALTER TABLE execution_plans ADD CHECK ((state = 'resolved') = (recovery IS NOT NULL));
DROP INDEX execution_plans_active_campaign;
CREATE UNIQUE INDEX execution_plans_active_campaign ON execution_plans(customer_id, campaign_id) WHERE state IN ('executing','sending','unknown');
