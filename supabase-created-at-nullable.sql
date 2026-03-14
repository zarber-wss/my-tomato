-- 让「未来待办」能正确同步：todos.created_at 允许为 NULL
-- 在 Supabase Dashboard → SQL Editor 中执行此语句即可

ALTER TABLE public.todos
  ALTER COLUMN created_at DROP NOT NULL;
