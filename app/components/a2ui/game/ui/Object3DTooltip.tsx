'use client';

import React, { useState, useRef, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// 3D Object Tooltip Component
// ============================================================================

interface Object3DTooltipProps {
  content: React.ReactNode;
  position: [number, number, number];
  visible: boolean;
  className?: string;
  minDistance?: number; // LOD: Minimum camera distance to show tooltip
}

const Object3DTooltipComponent = ({
  content,
  position,
  visible,
  className = "",
  minDistance = 50,
}: Object3DTooltipProps) => {
  const { camera, size } = useThree();
  const [screenPosition, setScreenPosition] = useState<{ x: number; y: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const lastUpdateRef = useRef(0);
  const showDelayRef = useRef<NodeJS.Timeout | null>(null);

  // LOD: Check if tooltip should be visible based on camera distance
  const shouldShow = useMemo(() => {
    if (!visible) return false;
    
    const objectPos = new THREE.Vector3(...position);
    const cameraPos = camera.position;
    const distance = objectPos.distanceTo(cameraPos);
    
    return distance < minDistance;
  }, [visible, position, camera.position, minDistance]);

  useEffect(() => {
    if (!shouldShow) {
      setIsVisible(false);
      setScreenPosition(null);
      if (showDelayRef.current) {
        clearTimeout(showDelayRef.current);
        showDelayRef.current = null;
      }
      return;
    }

    // Small delay to prevent flickering during rapid hover
    showDelayRef.current = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => {
      if (showDelayRef.current) {
        clearTimeout(showDelayRef.current);
      }
    };
  }, [shouldShow]);

  // Throttled position updates using requestAnimationFrame
  useFrame(() => {
    if (!isVisible) return;

    const now = performance.now();
    // Throttle to ~30fps for position updates (33ms)
    if (now - lastUpdateRef.current < 33) return;
    lastUpdateRef.current = now;

    // Project 3D position to 2D screen coordinates using Three.js projection
    const vector = new THREE.Vector3(...position);
    vector.project(camera);

    // Convert to screen space
    const vectorX = (vector.x * 0.5 + 0.5) * size.width;
    const vectorY = (-(vector.y * 0.5) + 0.5) * size.height;

    setScreenPosition({ x: vectorX, y: vectorY });
  });

  if (!screenPosition || !isVisible) return null;

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`fixed pointer-events-none z-50 ${className}`}
          style={{
            left: screenPosition.x,
            top: screenPosition.y,
            transform: "translate(-50%, -120%)",
          }}
        >
          <div className="bg-gray-900/98 border border-empire-gold/50 rounded-lg shadow-xl shadow-empire-gold/20 p-3 min-w-[200px] max-w-[300px]">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// Memoize the component to prevent unnecessary re-renders
export const Object3DTooltip = memo(Object3DTooltipComponent);

// ============================================================================
// Helper Component for Agent Tooltips
// ============================================================================

interface AgentTooltipContentProps {
  name: string;
  state: string;
  stateColor: string;
  level?: number;
  health?: number;
  maxHealth?: number;
  currentQuest?: string;
  partyName?: string; // COORD-005: Party info
  partyColor?: string; // COORD-005: Party color
}

const AgentTooltipContentComponent = ({
  name,
  state,
  stateColor,
  level,
  health,
  maxHealth,
  currentQuest,
  partyName,
  partyColor,
}: AgentTooltipContentProps) => {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-empire-gold text-sm">{name}</span>
        {level !== undefined && (
          <span className="text-xs text-gray-400">Lv. {level}</span>
        )}
      </div>

      {/* Party info - COORD-005 */}
      {partyName && partyColor && (
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: partyColor }}
          />
          <span className="text-xs text-gray-300">{partyName}</span>
        </div>
      )}

      {/* State */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: stateColor }}
        />
        <span className="text-xs" style={{ color: stateColor }}>
          {state}
        </span>
      </div>

      {/* Health Bar */}
      {health !== undefined && maxHealth !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Health</span>
            <span>
              {Math.ceil(health)}/{maxHealth}
            </span>
          </div>
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(health / maxHealth) * 100}%`,
                backgroundColor:
                  health / maxHealth > 0.6
                    ? "#2ecc71"
                    : health / maxHealth > 0.3
                    ? "#f39c12"
                    : "#e74c3c",
              }}
            />
          </div>
        </div>
      )}

      {/* Current Quest */}
      {currentQuest && (
        <div className="pt-2 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Current Quest</div>
          <div className="text-xs text-empire-gold">{currentQuest}</div>
        </div>
      )}
    </div>
  );
};

export const AgentTooltipContent = memo(AgentTooltipContentComponent);

// ============================================================================
// Helper Component for Structure Tooltips
// ============================================================================

interface StructureTooltipContentProps {
  name: string;
  type: string;
  description?: string;
  assignedAgents?: number;
}

const StructureTooltipContentComponent = ({
  name,
  type,
  description,
  assignedAgents,
}: StructureTooltipContentProps) => {
  return (
    <div className="space-y-2">
      <div className="font-bold text-empire-gold text-sm">{name}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{type}</div>
      {description && <div className="text-xs text-gray-300">{description}</div>}
      {assignedAgents !== undefined && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
          <span className="text-xs text-gray-400">Assigned Agents:</span>
          <span className="text-xs text-empire-gold font-bold">{assignedAgents}</span>
        </div>
      )}
    </div>
  );
};

export const StructureTooltipContent = memo(StructureTooltipContentComponent);

// ============================================================================
// Helper Component for Dragon Tooltips
// ============================================================================

interface DragonTooltipContentProps {
  name: string;
  type: string;
  health: number;
  maxHealth: number;
  errorType?: string;
}

const DragonTooltipContentComponent = ({
  name,
  type,
  health,
  maxHealth,
  errorType,
}: DragonTooltipContentProps) => {
  const healthPercentage = (health / maxHealth) * 100;

  return (
    <div className="space-y-2">
      <div className="font-bold text-red-500 text-sm">{name}</div>
      <div className="text-xs text-gray-400 uppercase tracking-wide">{type}</div>
      {errorType && <div className="text-xs text-red-400">{errorType}</div>}

      {/* Health Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>Health</span>
          <span>
            {Math.ceil(health)}/{maxHealth}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300 bg-gradient-to-r from-red-600 to-red-400"
            style={{ width: `${healthPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export const DragonTooltipContent = memo(DragonTooltipContentComponent);
