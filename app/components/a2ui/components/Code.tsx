"use client";

import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export interface CodeProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  children?: React.ReactNode;
}

export function CodeComponent({
  content,
  language = "plaintext",
  showLineNumbers = false,
  children,
}: CodeProps) {
  return (
    <div className="my-4">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus as any}
        showLineNumbers={showLineNumbers}
        PreTag="div"
        customStyle={{
          borderRadius: "0.5rem",
          padding: "1rem",
        }}
      >
        {content}
      </SyntaxHighlighter>
      {children}
    </div>
  );
}
