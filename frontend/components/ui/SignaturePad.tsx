'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Eraser, Check, RotateCcw, PenTool, Image as ImageIcon } from 'lucide-react';

interface SignaturePadProps {
  value?: string | null;
  onChange: (signatureDataUrl: string | null) => void;
  width?: number;
  height?: number;
  label?: string;
  placeholderText?: string;
}

export function SignaturePad({
  value,
  onChange,
  width = 460,
  height = 160,
  label,
  placeholderText = 'በዚህ ሳጥን ውስጥ ፊርማዎን በእጅ ወይም በንክኪ ይሳሉ (Draw signature here)',
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSaved, setIsSaved] = useState(Boolean(value));
  const [isEditingExisting, setIsEditingExisting] = useState(!value);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support High DPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0F172A'; // deep slate ink
  }, [width, height, isEditingExisting]);

  function getCoordinates(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Auto-save data url on stroke completion
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
      setIsSaved(true);
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setIsSaved(false);
    onChange(null);
  }

  function handleRedraw() {
    setIsEditingExisting(true);
    setHasDrawn(false);
    setIsSaved(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
            <PenTool size={13} className="text-gold" />
            {label}
          </label>
          {isSaved && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
              <Check size={12} /> ፊርማ ተመዝግቧል (Saved)
            </span>
          )}
        </div>
      )}

      {value && !isEditingExisting ? (
        <div className="relative rounded-xl border border-white/20 bg-white/5 p-4 flex flex-col items-center justify-center min-h-[140px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Current signature"
            className="max-h-24 max-w-[280px] object-contain invert hue-rotate-180 brightness-200"
          />
          <p className="text-[11px] text-white/50 mt-2 font-mono">የተመዘገበ ዲጂታል ፊርማ</p>
          <button
            type="button"
            onClick={handleRedraw}
            className="mt-2.5 px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white/90 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw size={12} />
            እንደገና አዲስ ፊርማ ይሳሉ (Redraw)
          </button>
        </div>
      ) : (
        <div className="relative rounded-xl border border-white/20 bg-white shadow-inner overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="cursor-crosshair w-full block touch-none"
            style={{ height: `${height}px` }}
          />

          {!hasDrawn && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <p className="text-xs text-slate-400 text-center px-4 select-none italic">
                {placeholderText}
              </p>
            </div>
          )}

          {/* Dotted Baseline */}
          <div className="absolute bottom-6 left-6 right-6 border-b border-dashed border-slate-300 pointer-events-none" />

          {/* Controls Bar */}
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-100/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={handleClear}
              title="Clear Canvas"
              className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
            >
              <Eraser size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
