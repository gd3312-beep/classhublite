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

const AdminSignup = () => {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: Form) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. The first signup becomes admin.");
    nav("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight">Create admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The first user to sign up automatically becomes the admin.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
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
