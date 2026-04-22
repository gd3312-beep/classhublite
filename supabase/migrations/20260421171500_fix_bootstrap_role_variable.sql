CREATE OR REPLACE FUNCTION public.bootstrap_current_user()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_email TEXT := auth.jwt() ->> 'email';
  has_any_admin BOOLEAN;
  assigned_role public.app_role;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('public.bootstrap_current_user', 0));

  INSERT INTO public.profiles (id, email)
  VALUES (current_user_id, current_email)
  ON CONFLICT (id) DO UPDATE
  SET email = COALESCE(EXCLUDED.email, public.profiles.email);

  SELECT role
  INTO assigned_role
  FROM public.user_roles
  WHERE user_id = current_user_id
  ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END
  LIMIT 1;

  IF assigned_role IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE role = 'admin'
    )
    INTO has_any_admin;

    SELECT CASE
      WHEN has_any_admin THEN 'user'::public.app_role
      ELSE 'admin'::public.app_role
    END
    INTO assigned_role;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (current_user_id, assigned_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'userId', current_user_id,
    'email', current_email,
    'role', assigned_role
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_current_user() TO authenticated;
