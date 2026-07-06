ALTER TABLE public.daily_stats ADD COLUMN IF NOT EXISTS stat_date DATE NOT NULL DEFAULT CURRENT_DATE;
CREATE UNIQUE INDEX IF NOT EXISTS daily_stats_user_date_key ON public.daily_stats(user_id, stat_date);
CREATE INDEX IF NOT EXISTS daily_stats_user_date_desc_idx ON public.daily_stats(user_id, stat_date DESC);