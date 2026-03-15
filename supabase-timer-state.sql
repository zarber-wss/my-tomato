-- 番茄计时多端同步：记录当前用户的计时状态，供其他设备展示
-- 在 Supabase Dashboard → SQL Editor 中执行

CREATE TABLE IF NOT EXISTS public.timer_state (
  user_id uuid PRIMARY KEY,
  task_id uuid,
  end_at timestamptz NOT NULL,
  mode text NOT NULL DEFAULT 'pomodoro'
);

-- 启用 Realtime：Dashboard → Database → Replication → 勾选 timer_state

-- RLS（按需启用；若项目用 anon key 且无 RLS 可先不执行下面两行）
-- ALTER TABLE public.timer_state ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for timer_state" ON public.timer_state FOR ALL USING (true) WITH CHECK (true);
