-- 009_add_delivery_normalized_tables.sql
-- Observer v2: normalized delivery orders, reviews, and daily metrics.

-- These tables intentionally do not store API keys, partner secrets, card data,
-- or raw payment credentials. Source credentials remain in sources.credentials
-- or a future vault reference; these tables store only operational facts.

CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('getir', 'trendyol', 'yemeksepeti', 'csv')),
  external_order_id TEXT NOT NULL,
  external_store_id TEXT,
  status TEXT NOT NULL,
  ordered_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  gross_amount NUMERIC(12,2) CHECK (gross_amount IS NULL OR gross_amount >= 0),
  net_amount NUMERIC(12,2) CHECK (net_amount IS NULL OR net_amount >= 0),
  discount_amount NUMERIC(12,2) CHECK (discount_amount IS NULL OR discount_amount >= 0),
  payment_type TEXT,
  payment_provider TEXT,
  cancel_reason TEXT,
  prep_duration_minutes NUMERIC(8,2) CHECK (prep_duration_minutes IS NULL OR prep_duration_minutes >= 0),
  delivery_duration_minutes NUMERIC(8,2) CHECK (delivery_duration_minutes IS NULL OR delivery_duration_minutes >= 0),
  raw_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_record_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, platform, external_order_id)
);

CREATE INDEX IF NOT EXISTS delivery_orders_workspace_idx ON delivery_orders(workspace_id);
CREATE INDEX IF NOT EXISTS delivery_orders_branch_idx ON delivery_orders(branch_id);
CREATE INDEX IF NOT EXISTS delivery_orders_source_idx ON delivery_orders(source_id);
CREATE INDEX IF NOT EXISTS delivery_orders_platform_idx ON delivery_orders(platform);
CREATE INDEX IF NOT EXISTS delivery_orders_ordered_at_idx ON delivery_orders(ordered_at DESC);
CREATE INDEX IF NOT EXISTS delivery_orders_status_idx ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS delivery_orders_branch_day_idx
  ON delivery_orders(branch_id, platform, ordered_at DESC);

DROP TRIGGER IF EXISTS delivery_orders_updated_at ON delivery_orders;
CREATE TRIGGER delivery_orders_updated_at BEFORE UPDATE ON delivery_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS delivery_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('getir', 'trendyol', 'yemeksepeti', 'csv')),
  external_review_id TEXT,
  external_order_id TEXT,
  external_store_id TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL,
  rating_overall NUMERIC(3,2) CHECK (rating_overall IS NULL OR (rating_overall >= 0 AND rating_overall <= 5)),
  rating_food NUMERIC(3,2) CHECK (rating_food IS NULL OR (rating_food >= 0 AND rating_food <= 5)),
  rating_service NUMERIC(3,2) CHECK (rating_service IS NULL OR (rating_service >= 0 AND rating_service <= 5)),
  rating_delivery NUMERIC(3,2) CHECK (rating_delivery IS NULL OR (rating_delivery >= 0 AND rating_delivery <= 5)),
  comment_text TEXT,
  answer_status TEXT,
  classification JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_record_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, platform, external_review_id)
);

CREATE INDEX IF NOT EXISTS delivery_reviews_workspace_idx ON delivery_reviews(workspace_id);
CREATE INDEX IF NOT EXISTS delivery_reviews_branch_idx ON delivery_reviews(branch_id);
CREATE INDEX IF NOT EXISTS delivery_reviews_source_idx ON delivery_reviews(source_id);
CREATE INDEX IF NOT EXISTS delivery_reviews_platform_idx ON delivery_reviews(platform);
CREATE INDEX IF NOT EXISTS delivery_reviews_reviewed_at_idx ON delivery_reviews(reviewed_at DESC);
CREATE INDEX IF NOT EXISTS delivery_reviews_external_order_idx ON delivery_reviews(workspace_id, platform, external_order_id);
CREATE INDEX IF NOT EXISTS delivery_reviews_classification_gin_idx ON delivery_reviews USING GIN (classification);

DROP TRIGGER IF EXISTS delivery_reviews_updated_at ON delivery_reviews;
CREATE TRIGGER delivery_reviews_updated_at BEFORE UPDATE ON delivery_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE IF NOT EXISTS delivery_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('getir', 'trendyol', 'yemeksepeti', 'csv')),
  metric_date DATE NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0 CHECK (order_count >= 0),
  cancel_count INTEGER NOT NULL DEFAULT 0 CHECK (cancel_count >= 0),
  cancel_rate NUMERIC(6,5) NOT NULL DEFAULT 0 CHECK (cancel_rate >= 0 AND cancel_rate <= 1),
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  net_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  avg_rating NUMERIC(3,2) CHECK (avg_rating IS NULL OR (avg_rating >= 0 AND avg_rating <= 5)),
  bad_review_count INTEGER NOT NULL DEFAULT 0 CHECK (bad_review_count >= 0),
  avg_prep_duration_minutes NUMERIC(8,2) CHECK (avg_prep_duration_minutes IS NULL OR avg_prep_duration_minutes >= 0),
  avg_delivery_duration_minutes NUMERIC(8,2) CHECK (avg_delivery_duration_minutes IS NULL OR avg_delivery_duration_minutes >= 0),
  dominant_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_record_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (workspace_id, branch_id, platform, metric_date)
);

CREATE INDEX IF NOT EXISTS delivery_daily_metrics_workspace_idx ON delivery_daily_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS delivery_daily_metrics_branch_idx ON delivery_daily_metrics(branch_id);
CREATE INDEX IF NOT EXISTS delivery_daily_metrics_source_idx ON delivery_daily_metrics(source_id);
CREATE INDEX IF NOT EXISTS delivery_daily_metrics_platform_idx ON delivery_daily_metrics(platform);
CREATE INDEX IF NOT EXISTS delivery_daily_metrics_date_idx ON delivery_daily_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS delivery_daily_metrics_topics_gin_idx ON delivery_daily_metrics USING GIN (dominant_topics);

DROP TRIGGER IF EXISTS delivery_daily_metrics_updated_at ON delivery_daily_metrics;
CREATE TRIGGER delivery_daily_metrics_updated_at BEFORE UPDATE ON delivery_daily_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_daily_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_orders_via_workspace" ON delivery_orders;
DROP POLICY IF EXISTS "delivery_reviews_via_workspace" ON delivery_reviews;
DROP POLICY IF EXISTS "delivery_daily_metrics_via_workspace" ON delivery_daily_metrics;

CREATE POLICY "delivery_orders_via_workspace" ON delivery_orders
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "delivery_reviews_via_workspace" ON delivery_reviews
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

CREATE POLICY "delivery_daily_metrics_via_workspace" ON delivery_daily_metrics
  FOR ALL USING (
    is_workspace_member(workspace_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  delivery_orders,
  delivery_reviews,
  delivery_daily_metrics
TO authenticated;
