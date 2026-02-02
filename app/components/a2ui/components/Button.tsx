"use client";

import React from "react";

export interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "text";
  disabled?: boolean;
  action?: string;
  onEvent?: (eventId: string, data: unknown) => void;
  children?: React.ReactNode;
}

export function ButtonComponent({
  label,
  variant = "primary",
  disabled = false,
  action,
  onEvent,
  children,
}: ButtonProps) {
  const variantClasses: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100",
    text: "bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-blue-600 dark:text-blue-400",
  };

  const handleClick = () => {
    if (action && onEvent) {
      onEvent(action, { label });
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variantClasses[variant]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {label}
      {children}
    </button>
  );
}
