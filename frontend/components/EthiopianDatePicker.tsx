'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  toEthiopian,
  toGregorian,
  ETHIOPIAN_MONTHS,
  ethiopianMonthDays,
} from '@/lib/ethiopian-calendar';

const WEEKDAYS = ['ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ', 'እሁድ'];

interface EthiopianDatePickerProps {
  value: string;
  onChange: (gregorianDate: string) => void;
}

export function EthiopianDatePicker({ value, onChange }: EthiopianDatePickerProps) {
  const todayEth = toEthiopian(new Date());

  const [selectedYear, setSelectedYear] = useState(todayEth.year);
  const [selectedMonth, setSelectedMonth] = useState(todayEth.month);
  const [selectedDay, setSelectedDay] = useState(todayEth.day);
  const [viewYear, setViewYear] = useState(todayEth.year);
  const [viewMonth, setViewMonth] = useState(todayEth.month);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const parsed = new Date(value + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        const eth = toEthiopian(parsed);
        setSelectedYear(eth.year);
        setSelectedMonth(eth.month);
        setSelectedDay(eth.day);
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const notify = useCallback(
    (y: number, m: number, d: number) => {
      onChange(toGregorian(y, m, d).toISOString().slice(0, 10));
    },
    [onChange],
  );

  function selectDate(y: number, m: number, d: number) {
    setSelectedYear(y);
    setSelectedMonth(m);
    setSelectedDay(d);
    setViewYear(y);
    setViewMonth(m);
    notify(y, m, d);
    setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(viewYear - 1); setViewMonth(13); }
    else { setViewMonth(viewMonth - 1); }
  }

  function nextMonth() {
    if (viewMonth === 13) { setViewYear(viewYear + 1); setViewMonth(1); }
    else { setViewMonth(viewMonth + 1); }
  }

  function ethiopianWeekday(year: number, month: number, day: number): number {
    return (toGregorian(year, month, day).getDay() + 6) % 7;
  }

  const maxDays = ethiopianMonthDays(viewYear, viewMonth);
  const startWeekday = ethiopianWeekday(viewYear, viewMonth, 1);
  const monthLabel = ETHIOPIAN_MONTHS.find((m) => m.order === viewMonth)?.label ?? String(viewMonth);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= maxDays; d++) cells.push(d);

  const selectedLabel =
    `${selectedDay} ${ETHIOPIAN_MONTHS.find((m) => m.order === selectedMonth)?.label} ${selectedYear}`;

  function isSelected(y: number, m: number, d: number) {
    return selectedYear === y && selectedMonth === m && selectedDay === d;
  }

  function isToday(y: number, m: number, d: number) {
    return todayEth.year === y && todayEth.month === m && todayEth.day === d;
  }

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="input text-left flex items-center justify-between gap-2 w-full"
      >
        <span>{selectedLabel}</span>
        <span className={`text-slate transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-white border border-gray-200 rounded-xl p-3 shadow-lg w-72">
          <div className="flex items-center justify-between mb-2">
            <button onClick={prevMonth} className="text-sm px-2 py-1 rounded hover:bg-mist font-bold">‹</button>
            <div className="text-sm font-semibold text-ink">{monthLabel} {viewYear}</div>
            <button onClick={nextMonth} className="text-sm px-2 py-1 rounded hover:bg-mist font-bold">›</button>
          </div>

          {(viewYear !== todayEth.year || viewMonth !== todayEth.month) && (
            <button
              onClick={() => { setViewYear(todayEth.year); setViewMonth(todayEth.month); }}
              className="text-xs text-gold hover:underline mb-2 block w-full text-center"
            >
              ዛሬ {todayEth.day} {ETHIOPIAN_MONTHS.find((m) => m.order === todayEth.month)?.label} {todayEth.year}
            </button>
          )}

          <div className="grid grid-cols-7 text-center text-xs font-medium text-slate mb-1">
            {WEEKDAYS.map((wd) => <div key={wd} className="py-1">{wd}</div>)}
          </div>

          <div className="grid grid-cols-7 text-center text-sm">
            {cells.map((d, i) =>
              d !== null ? (
                <button
                  key={i}
                  onClick={() => selectDate(viewYear, viewMonth, d)}
                  className={`py-1.5 rounded-lg transition-colors ${
                    isSelected(viewYear, viewMonth, d)
                      ? 'bg-gold text-white font-bold'
                      : isToday(viewYear, viewMonth, d)
                        ? 'bg-mist text-ink font-semibold'
                        : 'text-ink hover:bg-mist'
                  }`}
                >
                  {d}
                </button>
              ) : <div key={i} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
