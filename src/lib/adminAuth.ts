import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface AdminLoginThrottleStatus {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface AdminSignupStatus {
  signupOpen: boolean;
}

export interface AdminBootstrapStatus {
  userId: string | null;
  email: string | null;
  role: "admin" | "user" | null;
}

const DEFAULT_THROTTLE_STATUS: AdminLoginThrottleStatus = {
  allowed: true,
  retryAfterSeconds: 0,
};

const DEFAULT_SIGNUP_STATUS: AdminSignupStatus = {
  signupOpen: true,
};

const DEFAULT_BOOTSTRAP_STATUS: AdminBootstrapStatus = {
  userId: null,
  email: null,
  role: null,
};

function isJsonObject(value: Json | null): value is Record<string, Json | undefined> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function parseAdminLoginThrottleStatus(payload: Json | null): AdminLoginThrottleStatus {
  if (!isJsonObject(payload)) {
    return DEFAULT_THROTTLE_STATUS;
  }

  const retryAfterSeconds =
    typeof payload.retryAfterSeconds === "number" && Number.isFinite(payload.retryAfterSeconds)
      ? Math.max(0, Math.ceil(payload.retryAfterSeconds))
      : 0;

  return {
    allowed: typeof payload.allowed === "boolean" ? payload.allowed : true,
    retryAfterSeconds,
  };
}

export function parseAdminSignupStatus(payload: Json | null): AdminSignupStatus {
  if (!isJsonObject(payload)) {
    return DEFAULT_SIGNUP_STATUS;
  }

  return {
    signupOpen: typeof payload.signupOpen === "boolean" ? payload.signupOpen : true,
  };
}

export function parseAdminBootstrapStatus(payload: Json | null): AdminBootstrapStatus {
  if (!isJsonObject(payload)) {
    return DEFAULT_BOOTSTRAP_STATUS;
  }

  return {
    userId: typeof payload.userId === "string" ? payload.userId : null,
    email: typeof payload.email === "string" ? payload.email : null,
    role: payload.role === "admin" || payload.role === "user" ? payload.role : null,
  };
}

export function formatRetryDelay(seconds: number) {
  if (seconds <= 0) return "a moment";

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

export async function getAdminLoginThrottleStatus(email: string) {
  const { data, error } = await supabase.rpc("check_admin_login_allowed", {
    email_to_check: normalizeEmail(email),
  });

  if (error) throw error;

  return parseAdminLoginThrottleStatus(data);
}

export async function recordAdminLoginAttempt(email: string, wasSuccessful: boolean) {
  const { data, error } = await supabase.rpc("record_admin_login_attempt", {
    email_to_track: normalizeEmail(email),
    was_successful: wasSuccessful,
  });

  if (error) throw error;

  return parseAdminLoginThrottleStatus(data);
}

export async function getAdminSignupStatus() {
  const { data, error } = await supabase.rpc("get_admin_signup_status");

  if (error) throw error;

  return parseAdminSignupStatus(data);
}

export async function bootstrapCurrentUser() {
  const { data, error } = await supabase.rpc("bootstrap_current_user");

  if (error) throw error;

  return parseAdminBootstrapStatus(data);
}
