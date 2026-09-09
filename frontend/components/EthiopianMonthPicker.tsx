'use client';

import { ETHIOPIAN_MONTHS, currentEthiopianYear, toEthiopian } from '@/lib/ethiopian-calendar';

interface EthiopianMonthPickerProps {
  year: number;
  monthOrder: number;
  onChange: (year: number, monthOrder: number) => void;
}

export function EthiopianMonthPicker({ year, monthOrder, onChange }: EthiopianMonthPickerProps) {
  const currentYear = currentEthiopianYear();
  const years = Array.from({ length: currentYear - 2018 + 1 }, (_, i) => 2018 + i);

  return (
    <div className="flex items-center gap-2">
      <select
        className="input py-1.5"
        value={year}
        onChange={(e) => onChange(Number(e.target.value), monthOrder)}
      >
        {years.map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <select
        className="input py-1.5"
        value={monthOrder}
        onChange={(e) => onChange(year, Number(e.target.value))}
      >
        {ETHIOPIAN_MONTHS.map((m) => (
          <option key={m.order} value={m.order}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}

export function getCurrentEthiopianMonth() {
  const { year, month } = toEthiopian(new Date());
  return { year, monthOrder: month };
}
