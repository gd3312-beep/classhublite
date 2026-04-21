import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSignupStatus, normalizeEmail } from "@/lib/adminAuth";
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

const AdminSignup = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingSignup, setCheckingSignup] = useState(true);
  const [signupOpen, setSignupOpen] = useState(true);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    let active = true;

    void getAdminSignupStatus()
      .then((status) => {
        if (!active) return;
        setSignupOpen(status.signupOpen);
        if (!status.signupOpen) {
          toast.info("Admin account already exists. Please sign in.");
          nav("/admin/login", { replace: true });
        }
      })
      .catch(() => {
        if (!active) return;
        toast.error("Unable to verify signup access right now.");
        nav("/admin/login", { replace: true });
      })
      .finally(() => {
        if (active) setCheckingSignup(false);
      });

    return () => {
      active = false;
    };
  }, [nav]);

  const onSubmit = async (values: Form) => {
    if (!signupOpen) {
      toast.error("Admin account already exists. Please sign in.");
      nav("/admin/login", { replace: true });
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(values.email),
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session) {
      toast.success("Account created. The first signup becomes admin.");
      nav("/admin", { replace: true });
      return;
    }
    toast.success("Account created. Check your email to finish signing in.");
    nav("/admin/login", { replace: true });
  };

  if (checkingSignup) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-highlight border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Create admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {signupOpen
              ? "No admin exists yet, so the next signup becomes the admin."
              : "An admin account already exists for this project."}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading || checkingSignup || !signupOpen}>
              {(loading || checkingSignup) && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign up
            </Button>
            <p className="text-xs text-muted-foreground">
              Already have an account?{" "}
              <Link to="/admin/login" className="text-highlight hover:underline">Login</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminSignup;
