"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
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
      setError("Something went wrong. Please try again.");
    } else {
      setSent(true);
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
        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm18 2-10 7L2 6" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-light mb-2">Check your email</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We sent a sign-in link to<br />
              <span className="text-[#C9A84C] font-medium">{email}</span>
            </p>
            <p className="text-slate-600 text-xs mt-4">Click the link in the email to access the advisor portal.</p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-6 text-slate-500 text-xs hover:text-slate-300 transition-colors"
            >
              ← Use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-white text-xl font-light mb-1">Advisor sign in</h1>
            <p className="text-slate-400 text-sm mb-8">
              Enter your advisor email and we'll send you a sign-in link.
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
              {error && (
                <p className="text-red-400 text-xs">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C9A84C] hover:bg-[#E8C96C] disabled:opacity-50 text-[#0A1628] font-semibold py-3 rounded-lg text-sm tracking-widest uppercase transition-colors"
              >
                {loading ? "Sending…" : "Send Sign-In Link →"}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="mt-6">
        <Link href="/" className="text-slate-700 text-xs hover:text-slate-400 transition-colors">
          ← Client portal login
        </Link>
      </div>

      <p className="text-slate-700 text-xs mt-6 tracking-wide">
        © {new Date().getFullYear()} Vision Consulting Group. All rights reserved.
      </p>
    </div>
  );
}
