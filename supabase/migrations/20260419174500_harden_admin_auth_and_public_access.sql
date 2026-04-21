ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read files" ON public.files;
DROP POLICY IF EXISTS "Admins read files" ON public.files;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read files" ON public.files
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  email TEXT PRIMARY KEY,
  failed_attempts INT NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until TIMESTAMPTZ,
  last_failed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_login_attempts FROM anon, authenticated;
CREATE OR REPLACE FUNCTION public.check_admin_login_allowed(email_to_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(trim(email_to_check));
  current_lock TIMESTAMPTZ;
  retry_after_seconds INT;
BEGIN
  IF normalized_email IS NULL OR normalized_email = '' THEN
    RETURN jsonb_build_object('allowed', false, 'retryAfterSeconds', 0);
  END IF;

  SELECT locked_until
  INTO current_lock
  FROM public.admin_login_attempts
  WHERE email = normalized_email;

  IF current_lock IS NULL OR current_lock <= now() THEN
    RETURN jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
  END IF;

  retry_after_seconds := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_lock - now())))::INT);

  RETURN jsonb_build_object(
    'allowed', false,
    'retryAfterSeconds', retry_after_seconds
  );
END;
$$;
CREATE OR REPLACE FUNCTION public.record_admin_login_attempt(email_to_track TEXT, was_successful BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email TEXT := lower(trim(email_to_track));
  next_failed_attempts INT;
  wait_seconds INT;
BEGIN
  IF normalized_email IS NULL OR normalized_email = '' THEN
    RETURN jsonb_build_object('allowed', false, 'retryAfterSeconds', 0);
  END IF;

  IF was_successful THEN
    DELETE FROM public.admin_login_attempts
    WHERE email = normalized_email;

    RETURN jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
  END IF;

  INSERT INTO public.admin_login_attempts (email, failed_attempts, locked_until, last_failed_at, updated_at)
  VALUES (normalized_email, 1, NULL, now(), now())
  ON CONFLICT (email) DO UPDATE
  SET
    failed_attempts = public.admin_login_attempts.failed_attempts + 1,
    locked_until = NULL,
    last_failed_at = now(),
    updated_at = now()
  RETURNING failed_attempts
  INTO next_failed_attempts;

  IF next_failed_attempts < 5 THEN
    RETURN jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
  END IF;

  wait_seconds := LEAST(900, 15 * POWER(2, next_failed_attempts - 5)::INT);

  UPDATE public.admin_login_attempts
  SET
    locked_until = now() + make_interval(secs => wait_seconds),
    updated_at = now()
  WHERE email = normalized_email;

  RETURN jsonb_build_object('allowed', false, 'retryAfterSeconds', wait_seconds);
END;
$$;
GRANT EXECUTE ON FUNCTION public.check_admin_login_allowed(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_admin_login_attempt(TEXT, BOOLEAN) TO anon, authenticated;
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
      FROM public.profiles
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_admin_signup_status() TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_admin BOOLEAN;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('public.handle_new_user.bootstrap_admin', 0));

  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'admin'
  )
  INTO has_admin;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_admin THEN 'user' ELSE 'admin' END)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
