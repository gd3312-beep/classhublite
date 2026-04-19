import { render, screen, waitFor } from "@testing-library/react";
import type { Session } from "@supabase/supabase-js";
import { describe, expect, it, vi, beforeEach } from "vitest";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });

  return { promise, resolve };
}

const { mockSupabase, roleQuery } = vi.hoisted(() => {
  const subscription = {
    unsubscribe: vi.fn(),
  };

  const hoistedRoleQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };

  hoistedRoleQuery.select.mockImplementation(() => hoistedRoleQuery);
  hoistedRoleQuery.eq.mockImplementation(() => hoistedRoleQuery);

  return {
    roleQuery: hoistedRoleQuery,
    mockSupabase: {
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription } })),
        getSession: vi.fn(),
      },
      from: vi.fn(() => hoistedRoleQuery),
    },
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

function AuthProbe() {
  const { loading, isAdmin } = useAuth();

  return (
    <div data-testid="auth-state">
      {loading ? "loading" : isAdmin ? "admin" : "user"}
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roleQuery.select.mockImplementation(() => roleQuery);
    roleQuery.eq.mockImplementation(() => roleQuery);
  });

  it("keeps loading true until the admin role lookup resolves", async () => {
    const deferredRoleLookup = createDeferred<{ data: { role: "admin" } | null }>();
    roleQuery.maybeSingle.mockReturnValue(deferredRoleLookup.promise);
    mockSupabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "admin-user",
          },
        } as Session["user"],
      },
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockSupabase.auth.getSession).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("auth-state")).toHaveTextContent("loading");

    deferredRoleLookup.resolve({ data: { role: "admin" } });

    await waitFor(() => expect(screen.getByTestId("auth-state")).toHaveTextContent("admin"));
    expect(roleQuery.eq).toHaveBeenCalledWith("user_id", "admin-user");
    expect(roleQuery.eq).toHaveBeenCalledWith("role", "admin");
  });
});
