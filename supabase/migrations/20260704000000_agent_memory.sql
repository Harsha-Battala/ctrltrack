-- Memory: recommendations the AI Coach has made, persisted across runs
CREATE TABLE public.agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'info',
  priority TEXT NOT NULL DEFAULT 'medium',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'ai_coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_recommendations TO authenticated;
GRANT ALL ON public.agent_recommendations TO service_role;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recommendations" ON public.agent_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_agent_recs_user_created ON public.agent_recommendations(user_id, created_at DESC);
CREATE TRIGGER trg_agent_recs_updated BEFORE UPDATE ON public.agent_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Trace: records each agent run's plan + tool calls, for the "agent reasoning" panel
CREATE TABLE public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own agent runs" ON public.agent_runs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own agent runs" ON public.agent_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_agent_runs_user_created ON public.agent_runs(user_id, created_at DESC);
