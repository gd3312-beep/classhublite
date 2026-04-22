DO $$
DECLARE
  bootstrap_admin_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('public.backfill_existing_auth_users', 0));

  INSERT INTO public.profiles (id, email)
  SELECT u.id, u.email
  FROM auth.users AS u
  LEFT JOIN public.profiles AS p
    ON p.id = u.id
  WHERE p.id IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  ) THEN
    SELECT u.id
    INTO bootstrap_admin_id
    FROM auth.users AS u
    ORDER BY u.created_at ASC, u.id ASC
    LIMIT 1;

    IF bootstrap_admin_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (bootstrap_admin_id, 'admin')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'user'::public.app_role
  FROM auth.users AS u
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = u.id
  )
  ON CONFLICT DO NOTHING;
END;
$$;
