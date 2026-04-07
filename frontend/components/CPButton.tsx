'use client';

import { ButtonHTMLAttributes, ReactNode } from "react";

const variantClasses = {
    primary:
        "bg-primary text-white hover:bg-green-800 focus:ring-green-900 border border-transparent shadow-sm",
    secondary:
        "bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-400 border border-gray-300 shadow-sm",
    danger:
        "text-red-600 hover:bg-red-700 focus:ring-red-500 border border-red-600 shadow-sm",
} as const;

const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
} as const;

type Variant = keyof typeof variantClasses;
type Size = keyof typeof sizeClasses;

interface CPButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label?: string;
    variant?: Variant;
    size?: Size;
    children?: ReactNode;
}

export default function CPButton({
    label,
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...rest
}: CPButtonProps) {
    return (
        <button
            {...rest}
            className={`${sizeClasses[size]} ${variantClasses[variant]} rounded-md font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
            {children ?? label}
        </button>
    );
}