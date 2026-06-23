-- Add category column to clusters so the AI-derived classification
-- is persisted and readable directly from the DB (instead of being
-- re-derived from text via regex on every render).

ALTER TABLE clusters
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN ('musteri', 'operasyon', 'personel'));
