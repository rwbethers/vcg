"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) { setError("Enter your email first."); return; }
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });
    setResetSent(true);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError("Invalid email or password.");
    } else {
      window.location.href = "/admin";
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <div className="inline-block bg-white rounded-2xl px-8 py-5 mb-4">
          <img src="/vcg-logo.png" alt="Vision Consulting Group" className="h-14 w-auto" />
        </div>
        <p className="text-slate-500 text-xs tracking-widest uppercase mt-4">Advisor Portal</p>
      </div>

      <div className="w-full max-w-md bg-[#0F1F3D] rounded-2xl p-8 shadow-2xl border border-[#1a3060]">
        <h1 className="text-white text-xl font-light mb-1">Advisor sign in</h1>
        <p className="text-slate-400 text-sm mb-8">
          Sign in with your advisor email and password.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-slate-300 text-xs tracking-widest uppercase mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="advisor@vcgllc.com"
              required
              className="w-full bg-[#0A1628] text-white border border-[#1a3060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-700"
            />
          </div>
          <div>
            <label className="block text-slate-300 text-xs tracking-widest uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-[#0A1628] text-white border border-[#1a3060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-700"
            />
          </div>
          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#C9A84C] hover:bg-[#E8C96C] disabled:opacity-50 text-[#0A1628] font-semibold py-3 rounded-lg text-sm tracking-widest uppercase transition-colors"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-[#1a3060] flex justify-between items-center">
          <Link href="/" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
            ← Client portal login
          </Link>
          {resetSent ? (
            <span className="text-[#C9A84C] text-xs">Reset link sent ✓</span>
          ) : (
            <button onClick={handleForgotPassword} type="button" className="text-slate-500 text-xs hover:text-slate-300 transition-colors">
              Forgot password?
            </button>
          )}
        </div>
      </div>

      <p className="text-slate-700 text-xs mt-10 tracking-wide">
        © {new Date().getFullYear()} Vision Consulting Group. All rights reserved.
      </p>
    </div>
  );
}
