import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

export function Stepper({ value, onChange, min = 0.5, max = 100, step = 1, className }: StepperProps) {
  const handleDecrease = () => {
    const newValue = Math.max(min, value - step);
    onChange(Math.round(newValue * 10) / 10); // Round to 1 decimal
  };

  const handleIncrease = () => {
    const newValue = Math.min(max, value + step);
    onChange(Math.round(newValue * 10) / 10);
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleDecrease}
        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4 text-gray-600" />
      </button>
      <span className="w-16 text-center font-semibold text-gray-900 text-lg">
        {value}
      </span>
      <button
        type="button"
        onClick={handleIncrease}
        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Increase"
      >
        <Plus className="h-4 w-4 text-gray-600" />
      </button>
    </div>
  );
}
