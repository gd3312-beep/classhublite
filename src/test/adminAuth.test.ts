import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

import { formatRetryDelay, normalizeEmail, parseAdminLoginThrottleStatus } from "@/lib/adminAuth";

describe("adminAuth helpers", () => {
  it("normalizes emails before auth requests", () => {
    expect(normalizeEmail("  Admin@Example.COM ")).toBe("admin@example.com");
  });

  it("parses server throttle responses safely", () => {
    expect(parseAdminLoginThrottleStatus({ allowed: false, retryAfterSeconds: 75 })).toEqual({
      allowed: false,
      retryAfterSeconds: 75,
    });
    expect(parseAdminLoginThrottleStatus(null)).toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("formats retry delays for user-facing toasts", () => {
    expect(formatRetryDelay(5)).toBe("5s");
    expect(formatRetryDelay(60)).toBe("1m");
    expect(formatRetryDelay(75)).toBe("1m 15s");
  });
});
