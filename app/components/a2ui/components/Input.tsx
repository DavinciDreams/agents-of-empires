"use client";

import React from "react";

export interface InputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function InputComponent({
  label,
  placeholder,
  value = "",
  disabled = false,
  children,
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      {children}
    </div>
  );
}
