'use client';

import { ReactNode } from "react";

interface CPPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function CPPageHeader({ title, subtitle, actions }: CPPageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-start mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 mt-3 sm:mt-0 ml-3">{actions}</div>}
    </div>
  );
}
