ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;
ALTER TABLE public.schedules REPLICA IDENTITY FULL;
ALTER TABLE public.assignments REPLICA IDENTITY FULL;