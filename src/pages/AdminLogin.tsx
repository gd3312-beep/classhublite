import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapCurrentUser, formatRetryDelay, getAdminLoginThrottleStatus, getAdminSignupStatus, normalizeEmail, recordAdminLoginAttempt } from "@/lib/adminAuth";
import { loginSchema } from "@/lib/validators";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Form = z.infer<typeof loginSchema>;
type SignupStatus = { signupOpen?: boolean };
type LoginAttemptStatus = { allowed?: boolean; retryAfterSeconds?: number };

const AdminLogin = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupKnown, setSignupKnown] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(loginSchema) });

  const trackAttempt = async (email: string, wasSuccessful: boolean) => {
    try {
      return await recordAdminLoginAttempt(email, wasSuccessful);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    let active = true;

    void getAdminSignupStatus()
      .then((status) => {
        if (!active) return;
        setSignupOpen(status.signupOpen);
      })
      .catch(() => {
        if (!active) return;
        setSignupOpen(false);
      })
      .finally(() => {
        if (active) setSignupKnown(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const onSubmit = async (values: Form) => {
    const email = normalizeEmail(values.email);
    setLoading(true);

    try {
      const throttle = await getAdminLoginThrottleStatus(email);
      if (!throttle.allowed) {
        toast.error(`Too many attempts. Try again in ${formatRetryDelay(throttle.retryAfterSeconds)}.`);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: values.password,
      });

      if (error || !data.user) {
        const attemptState = await trackAttempt(email, false);
        if (attemptState && !attemptState.allowed) {
          toast.error(`Too many attempts. Try again in ${formatRetryDelay(attemptState.retryAfterSeconds)}.`);
        } else {
          toast.error("Invalid admin email or password.");
        }
        return;
      }

      await bootstrapCurrentUser();

      const { data: hasAdminRole, error: roleError } = await supabase.rpc("has_role", {
        _user_id: data.user.id,
        _role: "admin",
      });

      if (roleError || !hasAdminRole) {
        await supabase.auth.signOut();
        const attemptState = await trackAttempt(email, false);
        if (attemptState && !attemptState.allowed) {
          toast.error(`Too many attempts. Try again in ${formatRetryDelay(attemptState.retryAfterSeconds)}.`);
        } else {
          toast.error("Invalid admin email or password.");
        }
        return;
      }

      await trackAttempt(email, true);
      toast.success("Welcome back");
      nav("/admin", { replace: true });
    } catch {
      toast.error("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage deadlines and announcements.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Login
            </Button>
            <div className="flex justify-between text-xs">
              <Link to="/admin/forgot-password" className="text-highlight hover:underline">
                Forgot password?
              </Link>
              {signupKnown && signupOpen ? (
                <Link to="/admin/signup" className="text-muted-foreground hover:underline">
                  Create admin account
                </Link>
              ) : (
                <span className="text-muted-foreground">Admin account already exists</span>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
