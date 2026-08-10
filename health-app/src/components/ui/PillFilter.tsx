import { clsx } from 'clsx';

interface PillFilterProps {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PillFilter({ options, selected, onChange, className }: PillFilterProps) {
  return (
    <div className={clsx('flex gap-2 overflow-x-auto scrollbar-hide py-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
            selected === option.value
              ? 'bg-brand-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
