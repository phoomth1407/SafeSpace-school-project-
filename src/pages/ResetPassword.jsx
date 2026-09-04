import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import {
  clearAuthHash,
  getAuthTokensFromUrl,
  getStoredSession,
  storeSession,
  supabaseConfigured,
  updatePassword,
} from "@/lib/supabaseClient";

export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sessionFromUrl = getAuthTokensFromUrl();
    if (sessionFromUrl?.access_token) {
      storeSession(sessionFromUrl);
      clearAuthHash();
      setReady(true);
      return;
    }
    setReady(Boolean(getStoredSession()?.access_token));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    const session = getStoredSession();
    if (!session?.access_token) {
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(session.access_token, newPassword);
      storeSession(null);
      window.location.href = "/SafeSpace-school-project-/login";
    } catch (err) {
      setError(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="Invalid reset link"
        subtitle="This password reset link is missing, expired, or invalid"
        footer={<Link to="/forgot-password" className="text-primary font-medium hover:underline">Request a new link</Link>}
      >
        <p className="text-sm text-foreground text-center">Please request another password reset email and open the newest link.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={Lock} title="New password" subtitle="Enter your new password below">
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      {!supabaseConfigured && <div className="mb-4 p-3 rounded-lg bg-muted text-muted-foreground text-sm">Authentication is not configured yet.</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" autoFocus placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-10 h-12" required minLength={6} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 h-12" required minLength={6} />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !supabaseConfigured}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : "Reset password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
