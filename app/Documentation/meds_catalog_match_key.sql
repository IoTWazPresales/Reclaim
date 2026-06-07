-- Phase 5: persist stable catalogue link on user meds (apply in Supabase SQL editor)
-- Safe to run multiple times.

ALTER TABLE meds
  ADD COLUMN IF NOT EXISTS catalog_match_key text;

COMMENT ON COLUMN meds.catalog_match_key IS
  'Stable MedCatalogItem.id (e.g. sertraline). Set on upsert/backfill; exact-name fallback when null.';
