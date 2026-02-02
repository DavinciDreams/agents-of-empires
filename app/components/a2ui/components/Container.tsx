"use client";

import React from "react";

export interface ContainerProps {
  direction?: "horizontal" | "vertical";
  spacing?: "none" | "small" | "medium" | "large";
  align?: "start" | "center" | "end" | "stretch";
  children?: React.ReactNode;
}

export function ContainerComponent({
  direction = "vertical",
  spacing = "medium",
  align = "start",
  children,
}: ContainerProps) {
  const directionClasses = {
    horizontal: "flex flex-row",
    vertical: "flex flex-col",
  };

  const spacingClasses = {
    none: "gap-0",
    small: "gap-2",
    medium: "gap-4",
    large: "gap-6",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  return (
    <div
      className={`${directionClasses[direction]} ${spacingClasses[spacing]} ${alignClasses[align]}`}
    >
      {children}
    </div>
  );
}
