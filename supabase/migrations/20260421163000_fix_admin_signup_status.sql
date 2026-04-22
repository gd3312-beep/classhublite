CREATE OR REPLACE FUNCTION public.get_admin_signup_status()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'signupOpen',
    NOT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE role = 'admin'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_signup_status() TO anon, authenticated;
