'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { LoginBrandHeader } from '@/src/components/login/LoginBrandHeader';
import { LoginForm } from '@/src/components/login/LoginForm';
import { LoginSecurityFooter } from '@/src/components/login/LoginSecurityFooter';
import { LoginCheckingSession } from '@/src/components/login/LoginCheckingSession';
import { LoginPresetKeyConfig, LoginPresetConfig } from '@/src/components/login/login-presets';

export default function LoginPage() {
  const { user, login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activePreset, setActivePreset] = useState<LoginPresetKeyConfig>(null);

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

  const handleFillPreset = (preset: LoginPresetConfig) => {
    setEmail(preset.email);
    setPassword(preset.password);
    setActivePreset(preset.key);
    setErrorMsg('');
  };

  if (isLoading) {
    return <LoginCheckingSession />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 flex flex-col items-center">
        <LoginBrandHeader />
        <LoginForm
          email={email}
          password={password}
          showPassword={showPassword}
          loading={loading}
          activePreset={activePreset}
          errorMsg={errorMsg}
          onEmailChange={(val) => {
            setEmail(val);
            setActivePreset(null);
            setErrorMsg('');
          }}
          onPasswordChange={(val) => {
            setPassword(val);
            setActivePreset(null);
            setErrorMsg('');
          }}
          onTogglePassword={() => setShowPassword((prev) => !prev)}
          onSubmit={handleSubmit}
          onPresetSelect={handleFillPreset}
        />
        <LoginSecurityFooter />
      </div>
    </div>
  );
}
