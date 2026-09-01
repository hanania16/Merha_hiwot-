'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { useLang } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail && !trimmedPassword) {
      setError(t('enterEmailPassword'));
      return;
    }
    if (!trimmedEmail) {
      setError(t('enterEmail'));
      return;
    }
    if (!trimmedPassword) {
      setError(t('enterPassword'));
      return;
    }

    setLoading(true);
    try {
      const user = await login(trimmedEmail, trimmedPassword);
      router.push('/dashboard/finance');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('unableToSignIn');
      if (msg.toLowerCase().includes('invalid credentials')) {
        setError(t('incorrectCredentials'));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 shadow-sm">
            <Image src="/logo.jpg" alt="Church logo" width={80} height={80} className="object-cover w-full h-full" />
          </div>
          <p className="text-2xl font-semibold text-gold">መርሃ ህይወት ሰ/ቤት</p>
          <p className="text-sm text-gray-400 mt-1">{t('sundaySchoolMgmt')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-gray-800 rounded-card shadow-sm p-6 space-y-4">
          <div>
            <label className="label text-gray-400">{t('email')}</label>
            <input
              type="email"
              required
              className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm bg-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold placeholder-gray-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@marhahiwot.org"
            />
          </div>
          <div>
            <label className="label text-gray-400">{t('password')}</label>
            <input
              type="password"
              required
              className="w-full border border-gray-700 rounded-lg px-3 py-2 text-sm bg-[#2a2a2a] text-white focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold placeholder-gray-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? t('signingIn') : t('signIn')}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          {t('roles')}
        </p>
      </div>
    </div>
  );
}
