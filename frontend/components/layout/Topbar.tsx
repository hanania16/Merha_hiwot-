export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-semibold text-ink truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-slate mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}
