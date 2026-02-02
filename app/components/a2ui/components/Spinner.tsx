"use client";

import React from "react";

export interface SpinnerProps {
  size?: "small" | "medium" | "large";
  label?: string;
  children?: React.ReactNode;
}

export function SpinnerComponent({
  size = "medium",
  label,
  children,
}: SpinnerProps) {
  const sizeClasses = {
    small: "w-4 h-4 border-2",
    medium: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div
        className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
      ></div>
      {label && (
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      )}
      {children}
    </div>
  );
}
