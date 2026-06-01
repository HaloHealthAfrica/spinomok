import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function Login({ status }: { status?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  const { data, setData, post, processing, errors } = useForm({
    phone:    '',
    password: '',
    remember: false,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    post('/login');
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-6 py-12"
      style={{ background: '#F2F2F7' }}
    >
      {/* ── App icon + name ── */}
      <div className="flex flex-col items-center mb-10">
        <div
          className="h-[80px] w-[80px] rounded-[18px] flex items-center justify-center mb-4 text-5xl"
          style={{
            background: 'linear-gradient(145deg, #2E7D32, #1B5E20)',
            boxShadow: '0 8px 24px rgba(27,94,32,0.35)',
          }}
        >
          🐄
        </div>
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-black">SpinoMok</h1>
        <p className="text-[15px] mt-0.5" style={{ color: 'rgba(60,60,67,0.5)' }}>
          Dairy Farm Management
        </p>
      </div>

      {/* ── Form card ── */}
      <div
        className="w-full max-w-sm bg-white rounded-[18px] overflow-hidden"
        style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}
      >
        {status && (
          <div className="bg-[rgba(52,199,89,0.12)] px-5 py-3 border-b border-[rgba(60,60,67,0.10)]">
            <p className="text-[15px] text-[#28A745]">{status}</p>
          </div>
        )}

        <form onSubmit={submit} noValidate>
          {/* Phone field */}
          <div className="px-5 pt-5">
            <label htmlFor="phone" className="text-[13px] font-medium" style={{ color: 'rgba(60,60,67,0.6)' }}>
              Phone / Email
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+254 700 123 456"
              value={data.phone}
              onChange={e => setData('phone', e.target.value)}
              className="mt-1.5 w-full h-[44px] rounded-[10px] border border-[rgba(60,60,67,0.18)] px-3.5 text-[17px] focus:outline-none focus:ring-[3px] focus:ring-brand-500/25 focus:border-brand-600 transition-all"
            />
            {errors.phone && (
              <p className="text-[13px] text-[#FF3B30] mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Divider */}
          <div className="mx-5 mt-4" style={{ height: '0.5px', background: 'rgba(60,60,67,0.12)' }} />

          {/* Password field */}
          <div className="px-5 pt-4 pb-5">
            <label htmlFor="password" className="text-[13px] font-medium" style={{ color: 'rgba(60,60,67,0.6)' }}>
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={data.password}
                onChange={e => setData('password', e.target.value)}
                className="w-full h-[44px] rounded-[10px] border border-[rgba(60,60,67,0.18)] px-3.5 pr-11 text-[17px] focus:outline-none focus:ring-[3px] focus:ring-brand-500/25 focus:border-brand-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center"
                style={{ color: 'rgba(60,60,67,0.4)' }}
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[13px] text-[#FF3B30] mt-1">{errors.password}</p>
            )}
          </div>
        </form>
      </div>

      {/* ── Sign In button ── */}
      <div className="w-full max-w-sm mt-4">
        <button
          onClick={submit as unknown as React.MouseEventHandler}
          disabled={processing}
          className="w-full h-[50px] rounded-[14px] text-[17px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #2E7D32, #1B5E20)',
            boxShadow: '0 4px 16px rgba(27,94,32,0.35)',
          }}
        >
          {processing ? 'Signing in…' : 'Sign In'}
        </button>
      </div>

      {/* ── Forgot + WhatsApp ── */}
      <div className="flex flex-col items-center gap-3 mt-6">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.remember}
              onChange={e => setData('remember', e.target.checked)}
              className="h-4 w-4 rounded-[4px] border-[rgba(60,60,67,0.3)] text-brand-900 focus:ring-brand-500"
            />
            <span className="text-[15px]" style={{ color: 'rgba(60,60,67,0.7)' }}>Remember me</span>
          </label>
          <a href="/forgot-password" className="text-[15px] font-medium text-brand-700">
            Forgot password?
          </a>
        </div>

        <div className="flex items-center gap-3 w-full max-w-sm">
          <div className="flex-1 h-px bg-[rgba(60,60,67,0.12)]" />
          <span className="text-[13px]" style={{ color: 'rgba(60,60,67,0.4)' }}>or</span>
          <div className="flex-1 h-px bg-[rgba(60,60,67,0.12)]" />
        </div>

        <a
          href="/auth/whatsapp"
          className="w-full max-w-sm flex items-center justify-center gap-2.5 h-[44px] rounded-[12px] border border-[rgba(60,60,67,0.18)] bg-white text-[15px] font-medium text-black"
        >
          <span className="text-xl">💬</span>
          Continue with WhatsApp
        </a>
      </div>

      <p className="mt-8 text-[15px]" style={{ color: 'rgba(60,60,67,0.5)' }}>
        Don't have an account?{' '}
        <a href="/register" className="font-medium text-brand-700">Sign up</a>
      </p>
    </div>
  );
}
