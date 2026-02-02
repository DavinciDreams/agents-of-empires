'use client';

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// Tooltip Component
// ============================================================================

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
  offset?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
  delay = 300,
  className = "",
  offset = 8,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const childRef = useRef<HTMLElement | null>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setMousePos({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Calculate position
  const getPositionStyles = () => {
    const styles: React.CSSProperties = {
      position: "fixed",
      zIndex: 9999,
    };

    switch (position) {
      case "top":
        styles.left = mousePos.x;
        styles.bottom = `calc(100vh - ${mousePos.y - offset}px)`;
        styles.transform = "translateX(-50%)";
        break;
      case "bottom":
        styles.left = mousePos.x;
        styles.top = mousePos.y + offset;
        styles.transform = "translateX(-50%)";
        break;
      case "left":
        styles.right = `calc(100vw - ${mousePos.x - offset}px)`;
        styles.top = mousePos.y;
        styles.transform = "translateY(-50%)";
        break;
      case "right":
        styles.left = mousePos.x + offset;
        styles.top = mousePos.y;
        styles.transform = "translateY(-50%)";
        break;
    }

    return styles;
  };

  return (
    <>
      {React.cloneElement(children as React.ReactElement, {
        ...children.props,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onMouseMove: handleMouseMove,
        ref: childRef,
      })}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`pointer-events-none ${className}`}
            style={getPositionStyles()}
          >
            <div className="bg-gray-900/98 border border-empire-gold/50 rounded-lg shadow-xl shadow-empire-gold/20 p-3 max-w-xs">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// Helper Components for Common Tooltip Patterns
// ============================================================================

interface SimpleTooltipProps {
  title: string;
  description?: string;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
  icon?: string;
}

export function SimpleTooltip({
  title,
  description,
  children,
  position = "top",
  icon,
}: SimpleTooltipProps) {
  return (
    <Tooltip position={position} content={
      <div className="space-y-1">
        {icon && <div className="text-2xl text-center mb-1">{icon}</div>}
        <div className="font-bold text-empire-gold text-sm">{title}</div>
        {description && <div className="text-xs text-gray-300">{description}</div>}
      </div>
    }>
      {children}
    </Tooltip>
  );
}

interface KeyComboTooltipProps {
  title: string;
  description?: string;
  keys: string[];
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export function KeyComboTooltip({
  title,
  description,
  keys,
  children,
  position = "top",
}: KeyComboTooltipProps) {
  return (
    <Tooltip position={position} content={
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div className="font-bold text-empire-gold text-sm">{title}</div>
          <div className="flex gap-1">
            {keys.map((key, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-gray-500 text-xs">+</span>}
                <kbd className="px-2 py-0.5 bg-gray-800 border border-gray-600 rounded text-xs text-empire-gold font-mono">
                  {key}
                </kbd>
              </React.Fragment>
            ))}
          </div>
        </div>
        {description && <div className="text-xs text-gray-300">{description}</div>}
      </div>
    }>
      {children}
    </Tooltip>
  );
}

interface StatusTooltipProps {
  title: string;
  status: string;
  statusColor: string;
  stats?: Array<{ label: string; value: string | number }>;
  children: React.ReactElement;
  position?: "top" | "bottom" | "left" | "right";
}

export function StatusTooltip({
  title,
  status,
  statusColor,
  stats,
  children,
  position = "top",
}: StatusTooltipProps) {
  return (
    <Tooltip position={position} content={
      <div className="space-y-2">
        <div className="font-bold text-empire-gold text-sm">{title}</div>
        <div className="text-xs" style={{ color: statusColor }}>
          {status}
        </div>
        {stats && stats.length > 0 && (
          <div className="border-t border-gray-700 pt-2 space-y-1">
            {stats.map((stat, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span className="text-gray-400">{stat.label}:</span>
                <span className="text-gray-200 font-semibold">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    }>
      {children}
    </Tooltip>
  );
}
