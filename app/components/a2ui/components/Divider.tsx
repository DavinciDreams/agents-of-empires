"use client";

import React from "react";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  children?: React.ReactNode;
}

export function DividerComponent({
  orientation = "horizontal",
  children,
}: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div className="border-l border-gray-200 dark:border-gray-700 h-full mx-2">
        {children}
      </div>
    );
  }

  return (
    <hr className="border-t border-gray-200 dark:border-gray-700 my-4">
      {children}
    </hr>
  );
}
