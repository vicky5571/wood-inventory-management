import React from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { LoginPresetKeyConfig, LoginPresetConfig } from './login-presets';
import { LoginErrorBanner } from './LoginErrorBanner';
import { LoginPresetChips } from './LoginPresetChips';

export interface LoginFormProps {
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  activePreset: LoginPresetKeyConfig;
  errorMsg: string;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onPresetSelect: (preset: LoginPresetConfig) => void;
}

export function LoginForm({
  email,
  password,
  showPassword,
  loading,
  activePreset,
  errorMsg,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onPresetSelect,
}: LoginFormProps) {
  return (
    <form onSubmit={onSubmit} className="w-full flex flex-col gap-4">
      <LoginErrorBanner message={errorMsg} />

      {/* Email Input */}
      <div className="flex flex-col gap-1.5 text-left">
        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>Alamat Email (邮箱账号)</span>
          <span className="text-[10px] font-semibold text-amber-600">Wajib</span>
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-600 transition-colors">
            <Mail className="w-4 h-4" strokeWidth={2} />
          </div>
          <input
            type="text"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
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
            <Lock className="w-4 h-4" strokeWidth={2} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="••••••••••••"
            className="w-full pl-10 pr-11 py-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 text-slate-900 text-xs font-semibold placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10 transition-all shadow-xs font-mono tracking-wide"
          />
          <button
            type="button"
            onClick={onTogglePassword}
            aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" strokeWidth={2} />
            ) : (
              <Eye className="w-4 h-4" strokeWidth={2} />
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
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
          </>
        )}
      </button>

      {/* Quick Access Preset Chips */}
      <LoginPresetChips activePreset={activePreset} onSelect={onPresetSelect} />
    </form>
  );
}
