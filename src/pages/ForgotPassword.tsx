import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { normalizeEmail } from "@/lib/adminAuth";
import { emailSchema } from "@/lib/validators";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

type Form = z.infer<typeof emailSchema>;

const ForgotPassword = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async (values: Form) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(values.email), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  step >= s ? "bg-highlight" : "bg-muted",
                )}
              />
            ))}
          </div>

          {step === 1 ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
              <p className="mt-1 text-sm text-muted-foreground">Enter the email tied to your admin account.</p>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" {...register("email")} />
                  {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
                <p className="text-xs">
                  <Link to="/admin/login" className="text-muted-foreground hover:underline">
                    Back to login
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-highlight-soft text-highlight">
                <Mail className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold tracking-tight">Check your inbox</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a password reset link. Click it to set a new password.
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/admin/login">
                  <Check className="h-4 w-4" /> Back to login
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ForgotPassword;
