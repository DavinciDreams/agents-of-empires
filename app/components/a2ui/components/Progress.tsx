"use client";

import React from "react";

export interface ProgressProps {
  value: number;
  label?: string;
  status?: "active" | "success" | "error" | "warning";
  children?: React.ReactNode;
}

export function ProgressComponent({
  value,
  label,
  status = "active",
  children,
}: ProgressProps) {
  const statusColors: Record<string, string> = {
    active: "bg-blue-600",
    success: "bg-green-600",
    error: "bg-red-600",
    warning: "bg-yellow-600",
  };

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(value)}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className={`${statusColors[status]} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        ></div>
      </div>
      {children}
    </div>
  );
}
