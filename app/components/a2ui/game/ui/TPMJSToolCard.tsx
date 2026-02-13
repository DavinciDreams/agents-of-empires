'use client';

import React, { useState } from "react";
import { motion } from "framer-motion";
import type { TPMJSTool } from '@/app/lib/tpmjs-client';
import { RARITY_CONFIG } from './ToolCard';

// ============================================================================
// Category Config
// ============================================================================

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  ai: { icon: "🤖", color: "#9b59b6" },
  search: { icon: "🔍", color: "#3498db" },
  code: { icon: "💻", color: "#e74c3c" },
  web: { icon: "🌐", color: "#27ae60" },
  data: { icon: "📊", color: "#f39c12" },
  file: { icon: "📁", color: "#95a5a6" },
  communication: { icon: "💬", color: "#1abc9c" },
  automation: { icon: "⚙️", color: "#34495e" },
};

// Map quality score to rarity colors
const getQualityColor = (score: number) => {
  if (score >= 90) return RARITY_CONFIG.legendary.color;
  if (score >= 75) return RARITY_CONFIG.epic.color;
  if (score >= 50) return RARITY_CONFIG.rare.color;
  return RARITY_CONFIG.common.color;
};

const getQualityGlow = (score: number) => {
  if (score >= 90) return RARITY_CONFIG.legendary.glowColor;
  if (score >= 75) return RARITY_CONFIG.epic.glowColor;
  if (score >= 50) return RARITY_CONFIG.rare.glowColor;
  return RARITY_CONFIG.common.glowColor;
};

// Format download count (e.g., 1200 -> "1.2K", 15000 -> "15K")
const formatDownloads = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// ============================================================================
// TPMJSToolCard Component
// ============================================================================

interface TPMJSToolCardProps {
  tool: TPMJSTool;
  onInstall: (tool: TPMJSTool) => void;
  onTest: (tool: TPMJSTool) => void;
  isInstalled: boolean;
  compact?: boolean;
}

export function TPMJSToolCard({
  tool,
  onInstall,
  onTest,
  isInstalled,
  compact = false,
}: TPMJSToolCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[tool.category] || CATEGORY_CONFIG.automation;
  const qualityColor = getQualityColor(tool.qualityScore);
  const qualityGlow = getQualityGlow(tool.qualityScore);

  const healthIcon = tool.healthStatus === 'healthy' ? '🟢' : tool.healthStatus === 'degraded' ? '🟡' : '🔴';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative rounded-lg overflow-hidden cursor-pointer transition-all duration-200 bg-gray-800/90 border-2"
      style={{
        borderColor: qualityColor,
        boxShadow: isHovered
          ? `0 0 20px ${qualityGlow}`
          : `0 4px 6px ${qualityGlow}`,
      }}
    >
      {/* Installed indicator */}
      {isInstalled && (
        <div
          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            backgroundColor: '#00FF88',
            color: '#1a1a2e',
          }}
        >
          ✓
        </div>
      )}

      {/* Quality score badge */}
      <div
        className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold"
        style={{
          backgroundColor: 'rgba(26, 26, 46, 0.9)',
          border: `1px solid ${qualityColor}`,
          color: qualityColor,
        }}
      >
        {tool.qualityScore}
      </div>

      <div className="p-3">
        {/* Tool header */}
        <div className="flex items-start gap-3 mb-2">
          {/* Category icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-bold shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${categoryConfig.color}40 0%, ${categoryConfig.color}20 100%)`,
              border: `2px solid ${categoryConfig.color}`,
            }}
          >
            <span>{categoryConfig.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h4
              className="font-bold text-sm truncate"
              style={{ color: qualityColor }}
            >
              {tool.toolName}
            </h4>
            <p className="text-xs text-gray-400 truncate">{tool.package}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-2 mb-2 text-xs">
          {/* Health status */}
          <div className="flex items-center gap-1" title={`Status: ${tool.healthStatus}`}>
            <span>{healthIcon}</span>
          </div>

          {/* Download count */}
          <div className="flex items-center gap-1 text-gray-400">
            <span>⬇</span>
            <span className="font-semibold">{formatDownloads(tool.downloads)}</span>
          </div>

          {/* Category badge */}
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold ml-auto"
            style={{
              backgroundColor: `${categoryConfig.color}30`,
              color: categoryConfig.color,
            }}
          >
            {tool.category}
          </span>
        </div>

        {/* Description */}
        {!compact && (
          <p className="text-xs text-gray-300 line-clamp-2 mb-3">
            {tool.description}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTest(tool);
            }}
            className="flex-1 text-xs font-bold px-3 py-1.5 rounded bg-blue-900/50 text-blue-400 hover:bg-blue-900 transition-colors"
          >
            Test
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isInstalled) onInstall(tool);
            }}
            className={`flex-1 text-xs font-bold px-3 py-1.5 rounded transition-colors ${
              isInstalled
                ? 'bg-green-900/50 text-green-400 cursor-default'
                : 'bg-[var(--empire-gold)] text-gray-900 hover:bg-yellow-500'
            }`}
            disabled={isInstalled}
          >
            {isInstalled ? 'Installed' : 'Install'}
          </button>
        </div>
      </div>

      {/* Hover tooltip */}
      {isHovered && !compact && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 bottom-full left-0 right-0 mb-2 p-3 rounded-lg bg-gray-900 border border-gray-700 shadow-xl pointer-events-none"
        >
          <div className="text-sm">
            <p className="font-bold" style={{ color: qualityColor }}>
              {tool.package}.{tool.toolName}
            </p>
            <p className="text-xs text-gray-400 mt-1">Quality: {tool.qualityScore}/100</p>
            <p className="text-xs text-gray-300 mt-2">{tool.description}</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-gray-400">Status:</span>
              <span className={
                tool.healthStatus === 'healthy' ? 'text-green-400' :
                tool.healthStatus === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }>
                {tool.healthStatus}
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
