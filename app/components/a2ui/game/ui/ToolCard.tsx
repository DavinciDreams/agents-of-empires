'use client';

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Tool, ToolType, Rarity } from '@/app/components/a2ui/game/store';
import { useGameStore } from '@/app/components/a2ui/game/store';

// ============================================================================
// Tool Type Configuration
// ============================================================================

const TOOL_TYPE_CONFIG: Record<ToolType, { icon: string; label: string; color: string }> = {
  search: { icon: "🔍", label: "Search", color: "#3498db" },
  code_executor: { icon: "⚒️", label: "Code Executor", color: "#e74c3c" },
  file_reader: { icon: "📜", label: "File Reader", color: "#27ae60" },
  file_writer: { icon: "✍️", label: "File Writer", color: "#2ecc71" },
  web_fetcher: { icon: "🌐", label: "Web Fetcher", color: "#9b59b6" },
  subagent: { icon: "🧙", label: "Subagent", color: "#f39c12" },
  grep: { icon: "🔎", label: "Grep", color: "#1abc9c" },
  glob: { icon: "🌍", label: "Glob", color: "#16a085" },
  edit: { icon: "✏️", label: "Edit", color: "#e67e22" },
  bash: { icon: "💻", label: "Bash", color: "#34495e" },
  tpmjs_generic: { icon: "📦", label: "TPMJS Tool", color: "#95a5a6" },
};

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bgGradient: string; glowColor: string; borderStyle: string }> = {
  common: {
    label: "Common",
    color: "#95a5a6",
    bgGradient: "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)",
    glowColor: "rgba(149, 165, 166, 0.3)",
    borderStyle: "border-gray-500",
  },
  rare: {
    label: "Rare",
    color: "#3498db",
    bgGradient: "linear-gradient(135deg, #1a252f 0%, #1e3a5f 100%)",
    glowColor: "rgba(52, 152, 219, 0.4)",
    borderStyle: "border-blue-500",
  },
  epic: {
    label: "Epic",
    color: "#9b59b6",
    bgGradient: "linear-gradient(135deg, #2a1a3e 0%, #4a2a6e 100%)",
    glowColor: "rgba(155, 89, 182, 0.5)",
    borderStyle: "border-purple-500",
  },
  legendary: {
    label: "Legendary",
    color: "#f4d03f",
    bgGradient: "linear-gradient(135deg, #3e3a1a 0%, #6e5a2a 100%)",
    glowColor: "rgba(244, 208, 63, 0.6)",
    borderStyle: "border-yellow-500",
  },
};

// ============================================================================
// Tool Icon Component
// ============================================================================

interface ToolIconProps {
  toolType: ToolType;
  rarity: Rarity;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ToolIcon({ toolType, rarity, size = "md", className = "" }: ToolIconProps) {
  const config = TOOL_TYPE_CONFIG[toolType];
  const rarityConfig = RARITY_CONFIG[rarity];

  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-16 h-16 text-3xl",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold shadow-lg ${className}`}
      style={{
        background: rarityConfig.bgGradient,
        border: `2px solid ${rarityConfig.color}`,
        boxShadow: `0 0 ${size === "lg" ? "12" : size === "md" ? "8" : "4"}px ${rarityConfig.glowColor}`,
      }}
    >
      <span>{config.icon}</span>
    </div>
  );
}

// ============================================================================
// Rarity Badge Component
// ============================================================================

interface RarityBadgeProps {
  rarity: Rarity;
  className?: string;
}

export function RarityBadge({ rarity, className = "" }: RarityBadgeProps) {
  const config = RARITY_CONFIG[rarity];

  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${className}`}
      style={{
        color: config.color,
        border: `1px solid ${config.color}`,
        backgroundColor: `${config.color}20`,
      }}
    >
      {config.label}
    </span>
  );
}

// ============================================================================
// Tool Card Component
// ============================================================================

interface ToolCardProps {
  tool: Tool;
  isEquipped?: boolean;
  isEquippable?: boolean;
  onEquip?: () => void;
  onUnequip?: () => void;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent, tool: Tool) => void;
  onDragEnd?: () => void;
  draggable?: boolean;
  className?: string;
  showDetails?: boolean;
}

export function ToolCard({
  tool,
  isEquipped = false,
  isEquippable = true,
  onEquip,
  onUnequip,
  onClick,
  onDragStart,
  onDragEnd,
  draggable = false,
  className = "",
  showDetails = true,
}: ToolCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cooldownPercent, setCooldownPercent] = useState(0);
  const typeConfig = TOOL_TYPE_CONFIG[tool.type];
  const rarityConfig = RARITY_CONFIG[tool.rarity];
  const getToolCooldownPercent = useGameStore((state) => state.getToolCooldownPercent);
  const isToolOnCooldown = useGameStore((state) => state.isToolOnCooldown);

  // Update cooldown indicator every 100ms
  useEffect(() => {
    if (!tool.cooldownTime) return;

    const interval = setInterval(() => {
      const percent = getToolCooldownPercent(tool);
      setCooldownPercent(percent);
    }, 100);

    return () => clearInterval(interval);
  }, [tool, getToolCooldownPercent]);

  const handleClick = () => {
    if (isDragging) return;
    if (onClick) {
      onClick();
    } else if (isEquipped && onUnequip) {
      onUnequip();
    } else if (!isEquipped && isEquippable && onEquip) {
      onEquip();
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify(tool));
    onDragStart?.(e, tool);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      draggable={draggable}
      onDragStart={handleDragStart as any}
      onDragEnd={handleDragEnd as any}
      className={`
        relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200
        ${isEquipped ? "ring-2 ring-offset-2 ring-offset-gray-900" : ""}
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
        ${className}
      `}
      style={{
        background: rarityConfig.bgGradient,
        borderColor: isEquipped ? rarityConfig.color : rarityConfig.color,
        borderWidth: "2px",
        boxShadow: isHovered
          ? `0 0 20px ${rarityConfig.glowColor}`
          : `0 4px 6px ${rarityConfig.glowColor}`,
      }}
    >
      {/* Equipped indicator */}
      {isEquipped && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: rarityConfig.color,
            color: "#1a1a2e",
          }}
        >
          ✓
        </div>
      )}

      {/* Cooldown overlay */}
      {cooldownPercent > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Cooldown progress arc */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={rarityConfig.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${283 * (cooldownPercent / 100)} 283`}
              transform="rotate(-90 50 50)"
              style={{
                filter: `drop-shadow(0 0 8px ${rarityConfig.glowColor})`,
              }}
            />
          </svg>

          {/* Cooldown text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {Math.ceil((cooldownPercent / 100) * (tool.cooldownTime || 0) / 1000)}s
              </div>
              <div className="text-xs text-gray-300">Cooldown</div>
            </div>
          </div>
        </div>
      )}

      {/* Mastery indicator */}
      {tool.mastery !== undefined && tool.mastery > 0 && (
        <div
          className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"
          style={{
            backgroundColor: "rgba(26, 26, 46, 0.9)",
            border: `1px solid ${rarityConfig.color}`,
            color: rarityConfig.color,
          }}
        >
          <span>⭐</span>
          <span>{tool.mastery}</span>
        </div>
      )}

      {/* Rarity shine effect for legendary/epic */}
      {(tool.rarity === "legendary" || tool.rarity === "epic") && (
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 40%, ${rarityConfig.color}40 50%, transparent 60%)`,
            animation: "shine 3s infinite",
          }}
        />
      )}

      <div className="p-3">
        {/* Tool header with icon and name */}
        <div className="flex items-start gap-3 mb-2">
          <ToolIcon toolType={tool.type} rarity={tool.rarity} size="md" />
          <div className="flex-1 min-w-0">
            <h4
              className="font-bold text-sm truncate"
              style={{ color: rarityConfig.color }}
            >
              {tool.name}
            </h4>
            <p className="text-xs text-gray-400">{typeConfig.label}</p>
          </div>
        </div>

        {/* Rarity badge */}
        <div className="mb-2">
          <RarityBadge rarity={tool.rarity} />
        </div>

        {/* Power stat (if available) */}
        {tool.power !== undefined && (
          <div className="flex items-center gap-1 mb-2">
            <span className="text-yellow-500 text-xs">⚔</span>
            <span className="text-xs text-gray-300">
              Power: <span className="font-bold text-yellow-400">{tool.power}</span>
            </span>
          </div>
        )}

        {/* Mastery and Experience */}
        {tool.mastery !== undefined && tool.mastery > 0 && (
          <div className="space-y-1 mb-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">Mastery:</span>
              <span className="text-xs font-bold" style={{ color: rarityConfig.color }}>
                Level {tool.mastery}
              </span>
            </div>
            {tool.experience !== undefined && (
              <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${((tool.experience % 100) / 100) * 100}%`,
                    backgroundColor: rarityConfig.color,
                    boxShadow: `0 0 8px ${rarityConfig.glowColor}`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {showDetails && tool.description && (
          <p className="text-xs text-gray-300 line-clamp-2 mb-2">
            {tool.description}
          </p>
        )}

        {/* Action button */}
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-700">
          {isEquipped ? (
            <button
              className="text-xs font-bold px-3 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onUnequip?.();
              }}
            >
              Unequip
            </button>
          ) : (
            <button
              className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                isEquippable
                  ? "bg-empire-gold text-gray-900 hover:bg-yellow-500"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (isEquippable) onEquip?.();
              }}
              disabled={!isEquippable}
            >
              Equip
            </button>
          )}

          <span className="text-xs text-gray-500">
            {isEquipped ? "Equipped" : isEquippable ? "Click to equip" : "Cannot equip"}
          </span>
        </div>
      </div>

      {/* Hover tooltip */}
      {isHovered && showDetails && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 bottom-full left-0 right-0 mb-2 p-3 rounded-lg bg-gray-900 border border-gray-700 shadow-xl pointer-events-none"
        >
          <div className="text-sm">
            <p className="font-bold" style={{ color: rarityConfig.color }}>
              {tool.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">{typeConfig.label}</p>
            <p className="text-xs text-gray-300 mt-2">{tool.description}</p>
            {tool.power !== undefined && (
              <p className="text-xs text-yellow-400 mt-2">Power: {tool.power}</p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Tool List Item Component (for compact display)
// ============================================================================

interface ToolListItemProps {
  tool: Tool;
  isEquipped?: boolean;
  onEquip?: () => void;
  onUnequip?: () => void;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent, tool: Tool) => void;
  draggable?: boolean;
}

export function ToolListItem({
  tool,
  isEquipped = false,
  onEquip,
  onUnequip,
  onClick,
  onDragStart,
  draggable = false,
}: ToolListItemProps) {
  const typeConfig = TOOL_TYPE_CONFIG[tool.type];
  const rarityConfig = RARITY_CONFIG[tool.rarity];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("application/json", JSON.stringify(tool));
    onDragStart?.(e, tool);
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart as any}
      className={`
        flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all
        ${isEquipped ? "bg-empire-gold/20 border border-empire-gold" : "bg-gray-800/80 border border-gray-700 hover:border-gray-600"}
        ${draggable ? "cursor-grab active:cursor-grabbing" : ""}
      `}
    >
      {/* Tool icon */}
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-lg"
        style={{
          background: rarityConfig.bgGradient,
          border: `1px solid ${rarityConfig.color}`,
        }}
      >
        {typeConfig.icon}
      </div>

      {/* Tool info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="font-semibold text-sm truncate"
            style={{ color: isEquipped ? "#f4d03f" : rarityConfig.color }}
          >
            {tool.name}
          </span>
          <RarityBadge rarity={tool.rarity} />
        </div>
        <p className="text-xs text-gray-400 truncate">{tool.description}</p>
      </div>

      {/* Action button */}
      {isEquipped ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnequip?.();
          }}
          className="text-xs px-2 py-1 rounded bg-red-900/50 text-red-400 hover:bg-red-900 transition-colors"
        >
          Unequip
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEquip?.();
          }}
          className="text-xs px-2 py-1 rounded bg-empire-gold text-gray-900 hover:bg-yellow-500 transition-colors"
        >
          Equip
        </button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Export types
// ============================================================================

export { TOOL_TYPE_CONFIG, RARITY_CONFIG };
export type { ToolCardProps, ToolListItemProps, ToolIconProps, RarityBadgeProps };
