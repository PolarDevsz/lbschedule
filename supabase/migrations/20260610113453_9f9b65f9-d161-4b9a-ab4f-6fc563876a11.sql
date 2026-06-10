
CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  details text,
  due_date timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY assignments_public_read ON public.assignments
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY assignments_auth_insert ON public.assignments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY assignments_owner_update ON public.assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY assignments_owner_delete ON public.assignments
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER assignments_set_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX assignments_subject_id_idx ON public.assignments(subject_id);
CREATE INDEX assignments_due_date_idx ON public.assignments(due_date);
