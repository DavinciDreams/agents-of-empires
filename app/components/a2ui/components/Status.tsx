"use client";

import React from "react";

export interface StatusProps {
  state: "idle" | "working" | "success" | "error" | "warning";
  message?: string;
  details?: string;
  children?: React.ReactNode;
}

export function StatusComponent({
  state,
  message,
  details,
  children,
}: StatusProps) {
  const stateConfig: Record<
    string,
    { icon: string; bgColor: string; textColor: string }
  > = {
    idle: {
      icon: "⏸️",
      bgColor: "bg-gray-100 dark:bg-gray-800",
      textColor: "text-gray-700 dark:text-gray-300",
    },
    working: {
      icon: "⚙️",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-700 dark:text-blue-300",
    },
    success: {
      icon: "✅",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      textColor: "text-green-700 dark:text-green-300",
    },
    error: {
      icon: "❌",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      textColor: "text-red-700 dark:text-red-300",
    },
    warning: {
      icon: "⚠️",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
      textColor: "text-yellow-700 dark:text-yellow-300",
    },
  };

  const config = stateConfig[state] || stateConfig.idle;

  return (
    <div className={`${config.bgColor} ${config.textColor} rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{config.icon}</span>
        <div className="flex-1">
          {message && (
            <p className="font-medium">{message}</p>
          )}
          {details && (
            <p className="text-sm mt-1 opacity-80">{details}</p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
