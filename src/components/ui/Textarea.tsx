import React from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  className,
  id,
  rows = 4,
  ...props
}) => {
  const inputId = id || React.useId();
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-600 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={cn(
          'w-full px-4 py-2.5 text-sm border rounded-lg transition-colors duration-200 resize-y',
          'bg-white text-neutral-700 placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
          error ? 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500' : 'border-neutral-300 hover:border-neutral-400',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-danger-500">{error}</p>
      )}
    </div>
  );
};
