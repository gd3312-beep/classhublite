import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const activeRequestId = useRef(0);

  useEffect(() => {
    let mounted = true;

    const syncAuthState = async (sess: Session | null) => {
      const requestId = ++activeRequestId.current;
      setSession(sess);
      setUser(sess?.user ?? null);

      if (!sess?.user) {
        if (!mounted || requestId !== activeRequestId.current) return;
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", sess.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!mounted || requestId !== activeRequestId.current) return;

      setIsAdmin(Boolean(data));
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      void syncAuthState(sess);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      void syncAuthState(sess);
    }).catch(() => {
      if (!mounted) return;
      setIsAdmin(false);
      setLoading(false);
    });

    return () => {
      mounted = false;
      activeRequestId.current += 1;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
