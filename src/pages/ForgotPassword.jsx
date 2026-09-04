import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { requestPasswordReset, supabaseConfigured } from "@/lib/supabaseClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const redirectTo = `${window.location.origin}/SafeSpace-school-project-/reset-password`;
      await requestPasswordReset(email, redirectTo);
    } catch (err) {
      setError(err.message || "Unable to send reset email");
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Reset password"
      subtitle="We'll send you a link to reset it"
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          <ArrowLeft className="w-3 h-3 inline mr-1" />Back to log in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-2 text-center">
          <p className="text-sm text-foreground">
            If an account exists with that email, you'll receive a password reset link shortly.
          </p>
          {error && <p className="text-xs text-muted-foreground">The email service may need to be enabled in the Supabase project.</p>}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!supabaseConfigured && <div className="p-3 rounded-lg bg-muted text-muted-foreground text-sm">Authentication is not configured yet.</div>}
          {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12" required />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !supabaseConfigured}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send reset link"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
