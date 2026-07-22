'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  const [picker, setPicker] = useState<'days' | 'months' | 'years'>('days');
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);
  const [pendingYear, setPendingYear] = useState<number | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const y: number[] = [];
    for (let i = viewYear - 50; i <= viewYear + 10; i++) y.push(i);
    return y;
  }, [viewYear]);

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
    if (!open) {
      setPicker('days');
      setPendingMonth(null);
      setPendingYear(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const dropdownH = 340;
    if (spaceBelow >= dropdownH || spaceBelow >= spaceAbove) {
      setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    } else {
      setDropdownStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left, width: Math.max(rect.width, 280) });
    }
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
        ref={btnRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="input text-left flex items-center justify-between gap-2 w-full"
      >
        <span>{selectedLabel}</span>
        <span className={`text-slate transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div style={dropdownStyle} className="z-50 bg-white border border-gray-200 rounded-xl p-3 shadow-lg">
          {picker === 'days' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <button onClick={prevMonth} className="text-sm px-2 py-1 rounded hover:bg-mist font-bold">‹</button>
                <div className="text-sm font-semibold text-ink flex items-center gap-2">
                  <button onClick={() => setPicker('months')} className="hover:text-gold px-1 rounded hover:bg-mist">{monthLabel}</button>
                  <button onClick={() => setPicker('years')} className="hover:text-gold px-1 rounded hover:bg-mist">{viewYear}</button>
                </div>
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
            </>
          )}

          {picker === 'months' && (
            <div>
              <div ref={pickerRef} className="max-h-52 overflow-y-auto">
                <button
                  onClick={() => { setViewYear(todayEth.year); setViewMonth(todayEth.month); setPendingMonth(null); setPicker('days'); }}
                  className="text-xs text-gold hover:underline block w-full text-center py-1 mb-1"
                >
                  ዛሬ {todayEth.day} {ETHIOPIAN_MONTHS.find((m) => m.order === todayEth.month)?.label} {todayEth.year}
                </button>
                <div className="space-y-1">
                  {ETHIOPIAN_MONTHS.map((m) => (
                    <button
                      key={m.order}
                      onClick={() => setPendingMonth(m.order)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        (pendingMonth ?? viewMonth) === m.order ? 'bg-gold text-white font-semibold' : 'text-ink hover:bg-mist'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {pendingMonth !== null && (
                <button
                  onClick={() => { setViewMonth(pendingMonth); setPendingMonth(null); setPicker('days'); }}
                  className="w-full bg-ink text-white text-sm font-medium py-2 rounded-lg hover:bg-black/80 mt-2"
                >
                  Done
                </button>
              )}
            </div>
          )}

          {picker === 'years' && (
            <div>
              <div ref={pickerRef} className="max-h-52 overflow-y-auto">
                <button
                  onClick={() => { setViewYear(todayEth.year); setViewMonth(todayEth.month); setPendingYear(null); setPicker('days'); }}
                  className="text-xs text-gold hover:underline block w-full text-center py-1 mb-1"
                >
                  ዛሬ {todayEth.day} {ETHIOPIAN_MONTHS.find((m) => m.order === todayEth.month)?.label} {todayEth.year}
                </button>
                <div className="space-y-1">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => setPendingYear(y)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        (pendingYear ?? viewYear) === y ? 'bg-gold text-white font-semibold' : 'text-ink hover:bg-mist'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
              {pendingYear !== null && (
                <button
                  onClick={() => { if (pendingYear !== null) setViewYear(pendingYear); setPendingYear(null); setPicker('days'); }}
                  className="w-full bg-ink text-white text-sm font-medium py-2 rounded-lg hover:bg-black/80 mt-2"
                >
                  Done
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
