'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
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
      setError('Please enter your email and password');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }
    if (!trimmedPassword) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const user = await login(trimmedEmail, trimmedPassword);
      if (user.role === 'ATTENDANCE_OFFICER') {
        router.push('/dashboard/attendance');
      } else {
        router.push('/dashboard/finance');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to sign in';
      if (msg.toLowerCase().includes('invalid credentials')) {
        setError('Incorrect email or password');
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
          <p className="text-sm text-gray-400 mt-1">Sunday School Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1a1a] border border-gray-800 rounded-card shadow-sm p-6 space-y-4">
          <div>
            <label className="label text-gray-400">Email</label>
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
            <label className="label text-gray-400">Password</label>
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
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Administrator · Attendance Officer · Finance Officer
        </p>
      </div>
    </div>
  );
}
