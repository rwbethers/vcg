"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (error) {
      setError("Failed to update password. Try requesting a new reset link.");
    } else {
      setDone(true);
      setTimeout(() => { window.location.href = "/admin"; }, 2000);
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
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-light mb-2">Password updated</h2>
            <p className="text-slate-400 text-sm">Taking you to the admin portal…</p>
          </div>
        ) : (
          <>
            <h1 className="text-white text-xl font-light mb-1">Set new password</h1>
            <p className="text-slate-400 text-sm mb-8">Choose a password for your advisor account.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-slate-300 text-xs tracking-widest uppercase mb-2">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0A1628] text-white border border-[#1a3060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-700"
                />
              </div>
              <div>
                <label className="block text-slate-300 text-xs tracking-widest uppercase mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#0A1628] text-white border border-[#1a3060] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C9A84C] transition-colors placeholder-slate-700"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C9A84C] hover:bg-[#E8C96C] disabled:opacity-50 text-[#0A1628] font-semibold py-3 rounded-lg text-sm tracking-widest uppercase transition-colors"
              >
                {loading ? "Saving…" : "Set Password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
