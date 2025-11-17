'use client';

import { FC, ButtonHTMLAttributes } from "react";

interface CPButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
}

const CPButton: FC<CPButtonProps> = ({ label, ...rest }) => {
    return (
        <button
            {...rest}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
            {label}
        </button>
    );
};

export default CPButton;