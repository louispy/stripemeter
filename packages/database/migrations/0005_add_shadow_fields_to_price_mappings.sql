-- Add shadow mode fields to price_mappings
ALTER TABLE price_mappings
  ADD COLUMN IF NOT EXISTS shadow boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shadow_stripe_account text,
  ADD COLUMN IF NOT EXISTS shadow_price_id text,
  ADD COLUMN IF NOT EXISTS shadow_subscription_item_id text;

-- Optional: basic check constraints for prefixes when provided
ALTER TABLE price_mappings
  ADD CONSTRAINT chk_shadow_stripe_account_prefix CHECK (
    shadow_stripe_account IS NULL OR shadow_stripe_account LIKE 'acct_%'
  );

ALTER TABLE price_mappings
  ADD CONSTRAINT chk_shadow_price_id_prefix CHECK (
    shadow_price_id IS NULL OR shadow_price_id LIKE 'price_%'
  );

ALTER TABLE price_mappings
  ADD CONSTRAINT chk_shadow_subscription_item_id_prefix CHECK (
    shadow_subscription_item_id IS NULL OR shadow_subscription_item_id LIKE 'si_%'
  );


