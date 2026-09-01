'use client';

import { api } from './api';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: 'ADMINISTRATOR' | 'FINANCE_OFFICER';
}

export async function login(email: string, password: string) {
  const res = await api.post<{ accessToken: string; user: AuthUser }>('/auth/login', {
    email,
    password,
  });
  localStorage.setItem('mh_token', res.accessToken);
  localStorage.setItem('mh_user', JSON.stringify(res.user));
  return res.user;
}

export function logout() {
  localStorage.removeItem('mh_token');
  localStorage.removeItem('mh_user');
  window.location.href = '/login';
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('mh_user');
  return raw ? JSON.parse(raw) : null;
}

export function canAccessFinance(user: AuthUser | null) {
  return user?.role === 'ADMINISTRATOR' || user?.role === 'FINANCE_OFFICER';
}
