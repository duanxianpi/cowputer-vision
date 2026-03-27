'use client';

import { TextareaHTMLAttributes } from "react";

interface CPTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  description?: string;
  required?: boolean;
}

export default function CPTextarea({ label, error, description, required, id, className, ...rest }: CPTextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={`text-sm font-medium text-gray-700${required ? " required-field" : ""}`}>
        {label}
      </label>

      <textarea
        id={id}
        {...rest}
        className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors
                   ${error ? "border-red-400 focus:ring-red-300 focus:border-red-400" : "border-gray-300"} ${className ?? ""}`}
      />

      {description && !error && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
