"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-12 text-center">
        <div className="inline-block bg-white rounded-2xl px-8 py-5 mb-4">
          <img src="/vcg-logo.png" alt="Vision Consulting Group" className="h-14 w-auto" />
        </div>
        <p className="text-slate-500 text-xs tracking-widest uppercase mt-4">Premium Insurance &amp; Finance</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[#0F1F3D] rounded-2xl p-8 shadow-2xl border border-[#1a3060]">
        {!sent ? (
          <>
            <h1 className="text-white text-xl font-light mb-1">Welcome back</h1>
            <p className="text-slate-400 text-sm mb-8">
              Enter your email and we&apos;ll send you a secure, one-click login link.
            </p>
            <form onSubmit={handleSubmit}>
              <label className="block text-slate-300 text-xs tracking-widest uppercase mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#0A1628] text-white border border-[#1a3060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-700 mb-6"
              />
              {error && (
                <p className="text-red-400 text-xs mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C9A84C] hover:bg-[#E8C96C] disabled:opacity-50 text-[#0A1628] font-semibold py-3 rounded-lg text-sm tracking-widest uppercase transition-colors"
              >
                {loading ? "Sending…" : "Send Login Link"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-[#1a3060] text-center">
              <a
                href="/admin/login"
                className="text-slate-600 text-xs hover:text-slate-400 transition-colors"
              >
                Advisor / Admin sign in →
              </a>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full border border-[#C9A84C] bg-[#C9A84C]/10 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-[#C9A84C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-white text-xl font-light mb-2">Check your inbox</h2>
            <p className="text-slate-400 text-sm">A secure login link was sent to</p>
            <p className="text-[#C9A84C] text-sm mt-1 font-medium">{email}</p>
            <button
              onClick={() => { setSent(false); setError(""); }}
              className="mt-6 text-slate-500 text-xs hover:text-slate-300 transition-colors underline underline-offset-4"
            >
              Use a different email
            </button>
          </div>
        )}
      </div>

      <p className="text-slate-700 text-xs mt-10 tracking-wide">
        © {new Date().getFullYear()} Vision Consulting Group. All rights reserved.
      </p>
    </div>
  );
}
