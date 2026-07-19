interface BadgeProps {
  children: React.ReactNode;
  variant?: 'paid' | 'unpaid' | 'partial' | 'neutral';
}

const variants: Record<string, string> = {
  paid: 'bg-green-50 text-status-present border-green-200',
  unpaid: 'bg-red-50 text-status-absent border-red-200',
  partial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  neutral: 'bg-gray-50 text-slate border-gray-200',
};

export function Badge({ children, variant = 'neutral' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${variants[variant]}`}>
      {children}
    </span>
  );
}
