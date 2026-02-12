'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ControlsTooltipProps {
  className?: string;
}

export function ControlsTooltip({ className = "" }: ControlsTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "combat" | "debug">("basic");

  const controls = {
    basic: [
      { key: "Left Click", action: "Select agent" },
      { key: "Drag Box", action: "Select multiple agents" },
      { key: "Right Click", action: "Move selected agents" },
      { key: "Right Click (Agent)", action: "Open context menu" },
      { key: "Scroll Wheel", action: "Zoom in/out" },
      { key: "Edge Pan", action: "Move camera" },
      { key: "Middle Click + Drag", action: "Pan camera" },
    ],
    combat: [
      { key: "Select + Right Click (Dragon)", action: "Attack dragon" },
      { key: "Context Menu → Attack", action: "Manual attack" },
      { key: "Context Menu → Auto-Battle", action: "Auto-resolve combat" },
      { key: "Context Menu → Reinforce", action: "Call nearby agents" },
    ],
    debug: [
      { key: "Shift + D", action: "Spawn test dragon" },
      { key: "Shift + S", action: "Start questline" },
      { key: "Shift + C", action: "Complete current quest" },
    ],
  };

  return (
    <>
      {/* Floating Help Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 w-12 h-12 bg-empire-gold hover:bg-yellow-500 text-gray-900 rounded-full shadow-lg shadow-empire-gold/30 flex items-center justify-center text-2xl font-bold transition-colors z-40 ${className}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? "✕" : "?"}
      </motion.button>

      {/* Controls Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-20 right-4 w-96 bg-gray-900/98 border-2 border-empire-gold rounded-lg shadow-2xl shadow-empire-gold/30 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-empire-gold/20 to-empire-gold/10 p-4 border-b border-empire-gold/30">
                <h2 className="text-empire-gold text-xl font-bold">Controls</h2>
                <p className="text-gray-400 text-sm">Keyboard & Mouse Shortcuts</p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab("basic")}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "basic"
                      ? "bg-empire-gold text-gray-900"
                      : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  Basic
                </button>
                <button
                  onClick={() => setActiveTab("combat")}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "combat"
                      ? "bg-empire-gold text-gray-900"
                      : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  Combat
                </button>
                <button
                  onClick={() => setActiveTab("debug")}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "debug"
                      ? "bg-empire-gold text-gray-900"
                      : "text-gray-400 hover:bg-gray-800"
                  }`}
                >
                  Debug
                </button>
              </div>

              {/* Controls List */}
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="space-y-3">
                  {controls[activeTab].map((control, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-800/60 rounded border border-gray-700 hover:border-empire-gold/50 transition-colors"
                    >
                      <kbd className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-empire-gold font-mono">
                        {control.key}
                      </kbd>
                      <span className="text-sm text-gray-300 ml-3">{control.action}</span>
                    </div>
                  ))}
                </div>

                {/* Tip */}
                {activeTab === "basic" && (
                  <div className="mt-4 p-3 bg-empire-gold/10 border border-empire-gold/30 rounded">
                    <p className="text-xs text-empire-gold">
                      💡 <strong>Tip:</strong> Use drag selection to quickly command multiple agents!
                    </p>
                  </div>
                )}

                {activeTab === "combat" && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded">
                    <p className="text-xs text-red-400">
                      ⚔️ <strong>Combat:</strong> Dragons appear when agents encounter errors. Defeat them to continue!
                    </p>
                  </div>
                )}

                {activeTab === "debug" && (
                  <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
                    <p className="text-xs text-yellow-400">
                      🔧 <strong>Debug:</strong> These shortcuts are for testing questline progression.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
