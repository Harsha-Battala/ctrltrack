CREATE TYPE public.job_status AS ENUM (
  'applied',
  'recruiter_action',
  'interview',
  'reviewed',
  'offer',
  'rejected'
);

ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS job_company TEXT,
  ADD COLUMN IF NOT EXISTS job_role TEXT,
  ADD COLUMN IF NOT EXISTS job_status public.job_status,
  ADD COLUMN IF NOT EXISTS job_resume_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_applied_date DATE;

CREATE INDEX IF NOT EXISTS idx_items_job_status ON public.items(job_status) WHERE job_status IS NOT NULL;
