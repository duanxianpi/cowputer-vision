'use client';

import { FC, InputHTMLAttributes } from "react";

interface CPInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const CPInput: FC<CPInputProps> = ({ label, id, ...rest }) => {
  return (
    <div className="flex flex-col space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>

      <input
        id={id}
        {...rest}
        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
};

export default CPInput;
