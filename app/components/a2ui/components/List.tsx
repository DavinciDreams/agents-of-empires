"use client";

import React from "react";

export interface ListProps {
  items?: Array<any>;
  ordered?: boolean;
  children?: React.ReactNode;
}

export function ListComponent({
  items = [],
  ordered = false,
  children,
}: ListProps) {
  const ListTag = ordered ? "ol" : "ul";
  const listClass = ordered ? "list-decimal" : "list-disc";

  return (
    <ListTag className={`${listClass} list-inside space-y-2 text-gray-700 dark:text-gray-300`}>
      {children || items.map((item, index) => (
        <li key={index}>
          {typeof item === "string" ? item : JSON.stringify(item)}
        </li>
      ))}
    </ListTag>
  );
}
