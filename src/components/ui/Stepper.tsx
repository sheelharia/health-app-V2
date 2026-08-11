import { useState } from 'react';
import { clsx } from 'clsx';
import { Minus, Plus, Pencil, Check } from 'lucide-react';

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

  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(Math.round(newValue * 10) / 10);
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(Math.round(newValue * 10) / 10);
  };

  const handleInputSubmit = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, Math.round(parsed * 10) / 10));
      onChange(clamped);
    }
    setEditing(false);
  };

  const openEditor = () => {
    setInputValue(value.toString());
    setEditing(true);
  };

  if (editing) {
    return (
      <div className={clsx('flex items-center gap-1', className)}>
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleInputSubmit();
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={handleInputSubmit}
          autoFocus
          className="w-16 text-center font-semibold text-gray-900 text-lg py-1 border border-brand-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={handleInputSubmit}
          className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
          aria-label="Confirm"
        >
          <Check className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center gap-1', className)}>
      <button
        type="button"
        onClick={handleDecrease}
        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4 text-gray-600" />
      </button>
      <button
        type="button"
        onClick={openEditor}
        className="w-16 text-center font-semibold text-gray-900 text-lg py-1 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Tap to edit quantity"
      >
        {value}
      </button>
      <button
        type="button"
        onClick={handleIncrease}
        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Increase"
      >
        <Plus className="h-4 w-4 text-gray-600" />
      </button>
      <button
        type="button"
        onClick={openEditor}
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Type quantity"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
