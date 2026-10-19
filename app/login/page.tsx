'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';

type PresetKey = 'manager' | 'auditor' | 'director' | 'level1' | 'level2' | 'level3' | null;

const PRESETS = [
  {
    key: 'manager' as const,
    email: 'manager@timber.id',
    password: 'password123',
    label: 'Level 1',
    name: 'Budi S.',
    badgeColor: 'text-amber-700 bg-amber-100/80',
  },
  {
    key: 'auditor' as const,
    email: 'admin@timber.id',
    password: 'password123',
    label: 'Level 2',
    name: 'Siti R.',
    badgeColor: 'text-emerald-700 bg-emerald-100/80',
  },
  {
    key: 'director' as const,
    email: 'viewer@timber.id',
    password: 'password123',
    label: 'Level 3',
    name: 'Robert T.',
    badgeColor: 'text-indigo-700 bg-indigo-100/80',
  },
] as const;

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activePreset, setActivePreset] = useState<PresetKey>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && user) {
      window.location.href = '/';
    }
  }, [isLoading, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Email dan kata sandi wajib diisi.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const res = await login({ email: email.trim(), password });
    if (res.success) {
      window.location.href = '/';
    } else {
      setErrorMsg(res.error || 'Email atau kata sandi salah.');
      setLoading(false);
    }
  };

  const handleFillPreset = (preset: typeof PRESETS[number]) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.key);
    setErrorMsg('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-600 animate-ping" />
          <span className="text-xs font-bold text-slate-500">Memeriksa sesi login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 flex flex-col items-center">
        {/* Brand Header */}
        <div className="flex items-center justify-center mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
        <h1 className="text-lg font-black text-slate-900 tracking-tight text-center">
          Penerimaan Kayu &amp; Stok Gudang
        </h1>
        <p className="text-[11px] font-semibold text-slate-400 text-center mt-0.5 mb-5">
          木材入库与库存管理 &bull; Otorisasi Multi-Level
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-rose-50 border border-rose-200/90 text-rose-700 text-xs font-semibold">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="flex-1 text-left">{errorMsg}</span>
            </div>
          )}

          {/* Email Input */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Alamat Email (邮箱账号)</span>
              <span className="text-[10px] font-semibold text-amber-600">Wajib</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                </svg>
              </div>
              <input
                type="text"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setActivePreset(null);
                  setErrorMsg('');
                }}
                placeholder="manager@timber.id"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Kata Sandi (登录密码)</span>
              <span className="text-[10px] font-semibold text-slate-400">Tersandi</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setActivePreset(null);
                  setErrorMsg('');
                }}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all shadow-xs font-mono tracking-wide"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full mt-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 hover:opacity-95 active:scale-[0.98] text-white font-extrabold text-xs transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-600/25 hover:shadow-amber-600/35 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Memverifikasi Sesi...</span>
              </>
            ) : (
              <>
                <span>Masuk ke Sistem Gudang (登录)</span>
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>

          {/* Quick Access Preset Chips */}
          <div className="mt-1 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Akun Preset (1-Klik Isi)
              </span>
              <span className="text-[9px] font-semibold text-slate-400">Sandbox</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => handleFillPreset(preset)}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                    activePreset === preset.key
                      ? 'bg-amber-50 border-amber-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-amber-200 hover:bg-amber-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-[8px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md ${preset.badgeColor}`}>
                      {preset.label}
                    </span>
                    {activePreset === preset.key && (
                      <svg className="w-3 h-3 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-800 leading-tight">{preset.name}</span>
                  <span className="text-[8px] text-slate-400 font-medium truncate mt-0.5">{preset.email}</span>
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Security Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 w-full text-center">
          <p className="text-[10px] text-slate-400 font-medium inline-flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Dilindungi Autentikasi Sesi &amp; Otorisasi Peran
          </p>
        </div>
      </div>
    </div>
  );
}
