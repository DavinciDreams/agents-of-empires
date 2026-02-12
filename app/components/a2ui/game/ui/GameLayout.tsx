'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from '@/app/components/a2ui/game/store';

/* ============================================================================
   GAME LAYOUT - Proper UI/UX with Clear Zones
   Inspired by: StarCraft II, Age of Empires, Heroes of Might & Magic
   ============================================================================ */

interface GameLayoutProps {
  children: React.ReactNode; // 3D Canvas/Viewport
  topBar: React.ReactNode;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  bottomBar: React.ReactNode;
}

export function GameLayout({
  children,
  topBar,
  leftPanel,
  rightPanel,
  bottomBar,
}: GameLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [bottomBarExpanded, setBottomBarExpanded] = useState(false);

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#1a1410' }}>
      {/* Top Bar - Always Visible */}
      <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {topBar}
        </div>
      </div>

      {/* Left Panel - Collapsible */}
      <AnimatePresence>
        {leftPanelOpen && (
          <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            exit={{ x: -400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-16 left-0 bottom-16 z-40 pointer-events-none"
            style={{ width: '400px' }}
          >
            <div className="pointer-events-auto h-full">
              {leftPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel Toggle */}
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="absolute top-20 left-2 z-50 rts-button w-10 h-10 rounded flex items-center justify-center text-lg pointer-events-auto"
        title={leftPanelOpen ? "Hide Left Panel" : "Show Left Panel"}
      >
        {leftPanelOpen ? '◀' : '▶'}
      </button>

      {/* Right Panel - Collapsible */}
      <AnimatePresence>
        {rightPanelOpen && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-16 right-0 bottom-16 z-40 pointer-events-none"
            style={{ width: '420px' }}
          >
            <div className="pointer-events-auto h-full">
              {rightPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Panel Toggle */}
      <button
        onClick={() => setRightPanelOpen(!rightPanelOpen)}
        className="absolute top-20 right-2 z-50 rts-button w-10 h-10 rounded flex items-center justify-center text-lg pointer-events-auto"
        title={rightPanelOpen ? "Hide Right Panel" : "Show Right Panel"}
      >
        {rightPanelOpen ? '▶' : '◀'}
      </button>

      {/* 3D Viewport - Center, Always Visible */}
      <div className="absolute inset-0 z-0">
        {children}
      </div>

      {/* Bottom Bar - Collapsible/Expandable */}
      <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          {bottomBar}
        </div>
      </div>

      {/* Bottom Bar Expand Toggle */}
      <button
        onClick={() => setBottomBarExpanded(!bottomBarExpanded)}
        className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-50 rts-button px-4 py-1 rounded text-xs pointer-events-auto"
        title={bottomBarExpanded ? "Collapse Bottom Bar" : "Expand Bottom Bar"}
      >
        {bottomBarExpanded ? '▼ Collapse' : '▲ Expand'}
      </button>
    </div>
  );
}

/* ============================================================================
   TABBED PANEL - For organizing related information
   ============================================================================ */

interface Tab {
  id: string;
  label: string;
  icon: string;
  content: React.ReactNode;
  badge?: number; // Optional count badge
}

interface TabbedPanelProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function TabbedPanel({ tabs, defaultTab, className = "" }: TabbedPanelProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find(t => t.id === activeTab);

  return (
    <div className={`homm-panel flex flex-col h-full ${className}`}>
      {/* Tab Headers */}
      <div className="flex border-b-2 border-[var(--homm-gold)]/30 bg-[var(--homm-dark-brown)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 text-sm font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'bg-[var(--homm-wood)] text-[var(--homm-gold)] border-b-2 border-[var(--homm-gold)]'
                : 'text-[var(--homm-tan)] hover:bg-[var(--homm-wood-dark)]'
            }`}
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: 'var(--homm-gold)',
                  color: 'var(--homm-dark-brown)',
                  fontSize: '10px',
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto rts-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTabContent?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ============================================================================
   COLLAPSIBLE SECTION - For organizing content within panels
   ============================================================================ */

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}

export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-[var(--homm-gold)]/20 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-[var(--homm-wood-dark)] transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <span className="rts-text-subheader text-sm" style={{ fontFamily: 'Cinzel, serif' }}>
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'var(--homm-gold)',
                color: 'var(--homm-dark-brown)',
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <span className="text-[var(--homm-gold)]">{isOpen ? '▼' : '▶'}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-[var(--homm-dark-brown)]/30">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================================
   FLOATING PANEL - For modals and overlays
   ============================================================================ */

interface FloatingPanelProps {
  title: string;
  icon?: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
  height?: string;
}

export function FloatingPanel({
  title,
  icon,
  children,
  onClose,
  width = '600px',
  height = 'auto',
}: FloatingPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="homm-panel-ornate relative"
        style={{ width, height, maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-[var(--homm-gold)]/30">
          <div className="flex items-center gap-3">
            {icon && <span className="text-2xl">{icon}</span>}
            <h2 className="rts-text-header text-xl" style={{ fontFamily: 'Cinzel, serif' }}>
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rts-button w-8 h-8 rounded flex items-center justify-center text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto rts-scrollbar" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
