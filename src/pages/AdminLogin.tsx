import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema } from "@/lib/validators";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Form = z.infer<typeof loginSchema>;

const AdminLogin = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: Form) => {
    if (Date.now() < lockUntil) {
      const secs = Math.ceil((lockUntil - Date.now()) / 1000);
      toast.error(`Too many attempts. Try again in ${secs}s.`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    setLoading(false);
    if (error) {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= 5) {
        const wait = Math.min(60_000, 2_000 * Math.pow(2, next - 5));
        setLockUntil(Date.now() + wait);
        toast.error(`Invalid login. Locked for ${Math.ceil(wait / 1000)}s.`);
      } else {
        toast.error("Invalid login. Check your email and password.");
      }
      return;
    }
    setAttempts(0);
    toast.success("Welcome back");
    nav("/admin");
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
              <Input id="password" type="password" autoComplete="current-password" {...register("password")} />
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
              <Link to="/admin/signup" className="text-muted-foreground hover:underline">
                Create admin account
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
