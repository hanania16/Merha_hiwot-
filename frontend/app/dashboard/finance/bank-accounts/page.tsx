'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatETB, formatEthiopianDateFromGregorian } from '@/lib/ethiopian-calendar';
import { Topbar } from '@/components/layout/Topbar';
import { Modal } from '@/components/ui/Modal';

interface Account {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  accountNumber: string | null;
  isActive: boolean;
  balance: number;
}

interface StatementLine {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  category: string;
  description: string | null;
  referenceNumber: string | null;
  paymentMethod: string;
  recordedBy: string | null;
  amount: number;
  runningBalance: number;
}

interface StatementResponse {
  account: Account;
  balance: number;
  statement: StatementLine[];
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [statement, setStatement] = useState<StatementResponse | null>(null);

  async function load() {
    setLoading(true);
    const data = await api.get<Account[]>('/finance/accounts');
    setAccounts(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totalBalance = accounts.filter((a) => a.isActive).reduce((sum, a) => sum + a.balance, 0);

  async function toggleActive(account: Account) {
    await api.patch(`/finance/accounts/${account.id}`, { isActive: !account.isActive });
    load();
  }

  async function openStatement(account: Account) {
    const data = await api.get<StatementResponse>(`/finance/accounts/${account.id}/statement`);
    setStatement(data);
  }

  return (
    <div>
      <Topbar title="Bank Accounts" subtitle="Current balance per account and a full audit trail of every income and expense" />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="card px-4 py-3">
          <p className="text-xs text-slate uppercase tracking-wide">Total Balance (Active Accounts)</p>
          <p className="text-xl font-semibold text-gold">{formatETB(totalBalance)}</p>
        </div>
        <button className="btn-gold" onClick={() => setAddOpen(true)}>+ Add Account</button>
      </div>

      {loading && <p className="text-sm text-slate">Loading…</p>}

      {!loading && accounts.length === 0 && (
        <div className="card p-8 text-center text-sm text-slate">
          No bank accounts yet. Add your first cash/bank account to start tracking its balance.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.map((a) => (
          <div key={a.id} className={`card p-5 ${!a.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink truncate">{a.name}</h3>
                <p className="text-xs text-slate mt-0.5">
                  {a.type.replace(/_/g, ' ')}
                  {a.bankName && ` · ${a.bankName}`}
                  {a.accountNumber && ` · ${a.accountNumber}`}
                </p>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                a.isActive ? 'bg-status-present/10 text-status-present' : 'bg-slate/10 text-slate'
              }`}>
                {a.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className={`mt-4 text-2xl font-semibold ${a.balance < 0 ? 'text-status-absent' : 'text-status-present'}`}>
              {formatETB(a.balance)}
            </p>
            <p className="text-xs text-slate -mt-1 mb-3">Current balance</p>
            <div className="flex gap-2">
              <button className="btn-outline text-sm px-3 py-1.5" onClick={() => openStatement(a)}>
                Statement
              </button>
              <button
                className="btn-outline text-sm px-3 py-1.5"
                onClick={() => toggleActive(a)}
              >
                {a.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {addOpen && <AddAccountModal onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />}

      {statement && (
        <StatementModal
          statement={statement}
          onClose={() => setStatement(null)}
        />
      )}
    </div>
  );
}

function AddAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('CASH');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = !saving && name.trim().length > 0;

  async function submit() {
    setSaving(true);
    try {
      await api.post('/finance/accounts', {
        name: name.trim(),
        type,
        bankName: bankName.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Add Account" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="label">Account Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CBE Main Account" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank</option>
          </select>
        </div>
        <div>
          <label className="label">Bank Name (optional)</label>
          <input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} />
        </div>
        <div>
          <label className="label">Account Number (optional)</label>
          <input className="input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-gold" disabled={!canSave} onClick={submit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StatementModal({ statement, onClose }: { statement: StatementResponse; onClose: () => void }) {
  const { account, balance, statement: lines } = statement;

  return (
    <Modal open title={`Statement — ${account.name}`} onClose={onClose}>
      <p className="text-sm text-slate mb-1">
        {account.type.replace(/_/g, ' ')}
        {account.bankName && ` · ${account.bankName}`}
        {account.accountNumber && ` · ${account.accountNumber}`}
      </p>
      <div className="flex items-center justify-between mb-4 bg-slate/5 rounded-lg px-4 py-3">
        <span className="text-sm text-slate">Current Balance</span>
        <span className={`text-lg font-semibold ${balance < 0 ? 'text-status-absent' : 'text-status-present'}`}>
          {formatETB(balance)}
        </span>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-slate py-6 text-center">No approved income or expenses on this account yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base text-sm">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th className="hidden md:table-cell">Recorded By</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.type + l.id}>
                  <td className="whitespace-nowrap">{formatEthiopianDateFromGregorian(new Date(l.date))}</td>
                  <td>
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${
                      l.type === 'INCOME' ? 'bg-status-present/10 text-status-present' : 'bg-status-absent/10 text-status-absent'
                    }`}>
                      {l.type}
                    </span>
                  </td>
                  <td className="min-w-[10rem]">
                    <span className="font-medium text-ink">{l.category.replace(/_/g, ' ')}</span>
                    {l.description && <span className="block text-xs text-slate">{l.description}</span>}
                  </td>
                  <td className="hidden md:table-cell text-xs text-slate">{l.recordedBy ?? '—'}</td>
                  <td className={`text-right font-medium ${l.type === 'INCOME' ? 'text-status-present' : 'text-status-absent'}`}>
                    {l.type === 'INCOME' ? '+' : '−'}{formatETB(l.amount)}
                  </td>
                  <td className="text-right font-mono text-xs">{formatETB(l.runningBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
