import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Minus, Plus, Pencil, Check, X } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function Stepper({ value, onChange, min = 0.5, max = 50, step = 0.5, className }: StepperProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleInputSubmit = () => {
    clearTimeout(blurTimerRef.current);
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
    setEditing(false);
  };

  const handleBlur = () => {
    // Delay blur submit so that tapping the confirm/cancel buttons works on iOS
    blurTimerRef.current = setTimeout(handleInputSubmit, 150);
  };

  const handleCancel = () => {
    clearTimeout(blurTimerRef.current);
    setEditing(false);
  };

  const openEditor = () => {
    setInputValue(value.toString());
    setEditing(true);
  };

  if (editing) {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <input
          ref={inputRef}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInputSubmit();
            if (e.key === 'Escape') handleCancel();
          }}
          onBlur={handleBlur}
          onFocus={(e) => e.target.select()}
          className="w-20 text-center font-semibold text-gray-900 text-lg py-2 border-2 border-brand-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 bg-brand-50"
        />
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleInputSubmit}
          className="p-2 text-green-600 bg-green-50 rounded-lg active:bg-green-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Confirm"
        >
          <Check className="h-5 w-5" />
        </button>
        <button
          type="button"
          onPointerDown={(e) => e.preventDefault()}
          onClick={handleCancel}
          className="p-2 text-gray-400 bg-gray-50 rounded-lg active:bg-gray-100 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
          aria-label="Cancel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={handleDecrease}
        className="min-w-[40px] min-h-[40px] flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4 text-gray-600" />
      </button>
      <button
        type="button"
        onClick={openEditor}
        className="min-w-[56px] min-h-[40px] flex items-center justify-center font-semibold text-gray-900 text-lg rounded-lg bg-gray-50 border border-gray-200 active:bg-gray-100 transition-colors"
        aria-label="Tap to type quantity"        >
        {parseFloat(value.toPrecision(6))}
      </button>
      <button
        type="button"
        onClick={handleIncrease}
        className="min-w-[40px] min-h-[40px] flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Increase"
      >
        <Plus className="h-4 w-4 text-gray-600" />
      </button>
      <button
        type="button"
        onClick={openEditor}
        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-brand-600 bg-brand-50 rounded-lg active:bg-brand-100 transition-colors"
        aria-label="Type quantity"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
