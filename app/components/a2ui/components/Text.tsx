"use client";

import React from "react";

export interface TextProps {
  content: string;
  variant?: "body" | "heading" | "subheading" | "caption" | "code";
  color?: "default" | "primary" | "secondary" | "success" | "warning" | "error";
  children?: React.ReactNode;
}

export function TextComponent({
  content,
  variant = "body",
  color = "default",
  children,
}: TextProps) {
  const variantClasses: Record<string, string> = {
    body: "text-base",
    heading: "text-2xl font-bold",
    subheading: "text-xl font-semibold",
    caption: "text-sm text-gray-600",
    code: "font-mono text-sm",
  };

  const colorClasses: Record<string, string> = {
    default: "text-gray-900 dark:text-gray-100",
    primary: "text-blue-600 dark:text-blue-400",
    secondary: "text-gray-600 dark:text-gray-400",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  const className = `${variantClasses[variant]} ${colorClasses[color]}`;

  if (variant === "heading") {
    return <h1 className={className}>{content || children}</h1>;
  }

  if (variant === "subheading") {
    return <h2 className={className}>{content || children}</h2>;
  }

  if (variant === "code") {
    return (
      <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded`}>
        {content || children}
      </code>
    );
  }

  return <p className={className}>{content || children}</p>;
}
