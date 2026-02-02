"use client";

import React from "react";

export interface CardProps {
  title?: string;
  subtitle?: string;
  variant?: "default" | "elevated" | "outlined";
  children?: React.ReactNode;
}

export function CardComponent({
  title,
  subtitle,
  variant = "default",
  children,
}: CardProps) {
  const variantClasses: Record<string, string> = {
    default: "bg-white dark:bg-gray-800 shadow",
    elevated: "bg-white dark:bg-gray-800 shadow-lg",
    outlined: "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
  };

  return (
    <div className={`rounded-lg p-6 ${variantClasses[variant]}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>
      )}
      {subtitle && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}
