'use client';

import { InputHTMLAttributes } from "react";

interface CPInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
  unit?: string;
}

export default function CPInput({ label, error, description, required, unit, id, className, ...rest }: CPInputProps) {
  const borderClass = error
    ? "border-red-400 focus-within:ring-red-300 focus-within:border-red-400"
    : "border-gray-300 focus-within:ring-primary/40 focus-within:border-primary";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-sm font-medium text-gray-700${required ? " required-field" : ""}`}>
        {label}
      </label>

      {unit ? (
        <div className={`flex overflow-hidden rounded-md border transition-colors focus-within:outline-none focus-within:ring-2 ${borderClass}`}>
          <input
            id={id}
            {...rest}
            className={`min-w-0 flex-1 bg-transparent px-3 py-2 text-sm focus:outline-none ${className ?? ""}`}
          />
          <span className="flex shrink-0 items-center border-l border-gray-200 bg-gray-50 px-3 text-xs text-gray-500 select-none">
            {unit}
          </span>
        </div>
      ) : (
        <input
          id={id}
          {...rest}
          className={`rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2
                     ${error ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-gray-300 focus:ring-primary/40 focus:border-primary"} ${className ?? ""}`}
        />
      )}

      {description && !error && (
        <p className="text-xs leading-relaxed text-gray-500">{description}</p>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
