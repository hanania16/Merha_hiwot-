export function Topbar({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-semibold text-ink truncate">{title}</h1>
        {subtitle && <p className="text-xs sm:text-sm text-slate mt-0.5 truncate">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{children}</div>}
    </div>
  );
}
