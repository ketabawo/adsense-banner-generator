ALTER TABLE execution_plans DROP CONSTRAINT execution_plans_state_check;
ALTER TABLE execution_plans ADD CHECK (state IN ('draft','approved','cancelled','stale','executing','unknown','applied'));
CREATE UNIQUE INDEX execution_plans_active_campaign ON execution_plans(customer_id, campaign_id) WHERE state IN ('executing','unknown');
CREATE TABLE plan_action_log (
  id bigserial PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES execution_plans(id) ON DELETE CASCADE,
  state text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX plan_action_log_plan ON plan_action_log(plan_id, id);
-- Existing rows are snapshots, not reconstructed historical events.
INSERT INTO plan_action_log(plan_id,state) SELECT id, 'snapshot:' || state FROM execution_plans;
CREATE FUNCTION record_plan_action() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO plan_action_log(plan_id,state) VALUES(NEW.id,NEW.state);
  ELSIF OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO plan_action_log(plan_id,state) VALUES(NEW.id,NEW.state);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER execution_plan_action AFTER INSERT OR UPDATE ON execution_plans FOR EACH ROW EXECUTE FUNCTION record_plan_action();
