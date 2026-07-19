interface StatCardProps {
  label: string;
  value: string;
  accent?: 'gold' | 'ink' | 'green' | 'red';
  hint?: string;
}

const accentMap: Record<string, string> = {
  gold: 'text-gold',
  ink: 'text-ink',
  green: 'text-status-present',
  red: 'text-status-absent',
};

export function StatCard({ label, value, accent = 'ink', hint }: StatCardProps) {
  return (
    <div className="card p-5">
      <p className="text-xs font-medium text-slate uppercase tracking-wide">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accentMap[accent]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate">{hint}</p>}
    </div>
  );
}
