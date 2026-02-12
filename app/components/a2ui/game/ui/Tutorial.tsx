'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/app/components/a2ui/game/store';

// ============================================================================
// Tutorial Step Definition
// ============================================================================

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  highlight?: {
    selector?: string; // CSS selector for element to highlight
    area?: 'minimap' | 'agent-panel' | 'quest-tracker' | 'structure';
  };
  action?: {
    type: 'click' | 'select' | 'drag' | 'spawn';
    target?: string;
  };
  nextTrigger?: 'button' | 'action'; // How to proceed to next step
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '🎮 Welcome to Agents of Empire!',
    description: 'Manage your AI agents like commanding units in an RTS game. Let me show you the basics!',
    position: 'center',
    nextTrigger: 'button',
  },
  {
    id: 'camera',
    title: '🎥 Camera Controls',
    description: 'Use WASD or arrow keys to pan. Scroll to zoom in/out. Move your mouse to the screen edges for edge-scrolling.',
    position: 'center',
    nextTrigger: 'button',
  },
  {
    id: 'agents',
    title: '👥 Your Agents',
    description: 'These are your AI agents. Each agent can execute tasks, use tools, and level up. Click on an agent to select it!',
    position: 'bottom-left',
    highlight: {
      area: 'agent-panel',
    },
    action: {
      type: 'select',
      target: 'agent',
    },
    nextTrigger: 'action',
  },
  {
    id: 'selection',
    title: '✨ Selection Controls',
    description: 'Click to select a single agent. Drag to select multiple agents. Shift+Click to toggle selection. Try selecting multiple agents now!',
    position: 'center',
    nextTrigger: 'button',
  },
  {
    id: 'minimap',
    title: '🗺️ Minimap',
    description: 'The minimap shows your agents (blue), structures (yellow), and dragons (red). Use it for quick navigation across the map.',
    position: 'top-right',
    highlight: {
      area: 'minimap',
    },
    nextTrigger: 'button',
  },
  {
    id: 'quests',
    title: '⚔️ Quest System',
    description: 'Quests appear as structures (castles, towers, workshops). Select agents and right-click on a structure to assign them to the quest!',
    position: 'top-left',
    highlight: {
      area: 'quest-tracker',
    },
    nextTrigger: 'button',
  },
  {
    id: 'tools',
    title: '🔧 Tools & Inventory',
    description: 'Agents can equip tools like Search, Code Executor, and File Reader. Tools have cooldowns and can level up with use!',
    position: 'center',
    nextTrigger: 'button',
  },
  {
    id: 'dragons',
    title: '🐉 Dragons (Errors)',
    description: 'When agents encounter errors, dragons appear! Attack dragons to resolve errors. Agents gain XP from victories.',
    position: 'center',
    nextTrigger: 'button',
  },
  {
    id: 'parties',
    title: '👨‍👩‍👧‍👦 Party System',
    description: 'Group agents into parties for coordinated missions. Parties can share tools and move in formation!',
    position: 'bottom-right',
    nextTrigger: 'button',
  },
  {
    id: 'complete',
    title: '🎉 Tutorial Complete!',
    description: 'You\'re ready to command your agent army! Press ? for keyboard shortcuts, or right-click for context menus. Good luck, Commander!',
    position: 'center',
    nextTrigger: 'button',
  },
];

// ============================================================================
// Tutorial State Management
// ============================================================================

interface TutorialState {
  active: boolean;
  currentStepIndex: number;
  completed: boolean;
  skipped: boolean;
}

const TUTORIAL_STORAGE_KEY = 'agents-of-empire-tutorial';

function loadTutorialState(): TutorialState {
  if (typeof window === 'undefined') return { active: false, currentStepIndex: 0, completed: false, skipped: false };

  const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return { active: false, currentStepIndex: 0, completed: false, skipped: false };
    }
  }
  return { active: false, currentStepIndex: 0, completed: false, skipped: false };
}

function saveTutorialState(state: TutorialState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
}

// ============================================================================
// Tutorial Component
// ============================================================================

export function Tutorial() {
  const [tutorialState, setTutorialState] = useState<TutorialState>(loadTutorialState);
  const [showPrompt, setShowPrompt] = useState(false);

  // Check if tutorial should be shown on first load
  useEffect(() => {
    const state = loadTutorialState();
    if (!state.completed && !state.skipped) {
      // Delay the prompt slightly so the game can load
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const currentStep = TUTORIAL_STEPS[tutorialState.currentStepIndex];

  const startTutorial = () => {
    const newState = { active: true, currentStepIndex: 0, completed: false, skipped: false };
    setTutorialState(newState);
    saveTutorialState(newState);
    setShowPrompt(false);
  };

  const nextStep = () => {
    if (tutorialState.currentStepIndex < TUTORIAL_STEPS.length - 1) {
      const newState = { ...tutorialState, currentStepIndex: tutorialState.currentStepIndex + 1 };
      setTutorialState(newState);
      saveTutorialState(newState);
    } else {
      completeTutorial();
    }
  };

  const previousStep = () => {
    if (tutorialState.currentStepIndex > 0) {
      const newState = { ...tutorialState, currentStepIndex: tutorialState.currentStepIndex - 1 };
      setTutorialState(newState);
      saveTutorialState(newState);
    }
  };

  const skipTutorial = () => {
    const newState = { active: false, currentStepIndex: 0, completed: false, skipped: true };
    setTutorialState(newState);
    saveTutorialState(newState);
    setShowPrompt(false);
  };

  const completeTutorial = () => {
    const newState = { active: false, currentStepIndex: 0, completed: true, skipped: false };
    setTutorialState(newState);
    saveTutorialState(newState);
  };

  const restartTutorial = () => {
    const newState = { active: true, currentStepIndex: 0, completed: false, skipped: false };
    setTutorialState(newState);
    saveTutorialState(newState);
  };

  // Position styles for tutorial dialog
  const getPositionStyles = (position: TutorialStep['position']) => {
    switch (position) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'top-left':
        return 'top-20 left-4';
      case 'top-right':
        return 'top-20 right-4';
      case 'bottom-left':
        return 'bottom-20 left-4';
      case 'bottom-right':
        return 'bottom-20 right-4';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <>
      {/* Initial Tutorial Prompt */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-gray-900 border-2 border-empire-gold rounded-lg p-8 max-w-md mx-4 shadow-2xl">
              <h2 className="text-2xl font-bold text-empire-gold mb-4">
                🎮 Welcome Commander!
              </h2>
              <p className="text-gray-300 mb-6">
                This is your first time in Agents of Empire. Would you like a quick tutorial on how to command your AI agents?
              </p>
              <div className="flex gap-4">
                <button
                  onClick={startTutorial}
                  className="flex-1 px-4 py-2 bg-empire-gold text-gray-900 rounded font-bold hover:bg-yellow-500 transition-colors"
                >
                  Start Tutorial
                </button>
                <button
                  onClick={skipTutorial}
                  className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded font-bold hover:bg-gray-600 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Dialog */}
      <AnimatePresence>
        {tutorialState.active && currentStep && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9998] bg-black/40 pointer-events-none"
            />

            {/* Tutorial Step Dialog */}
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed z-[9999] ${getPositionStyles(currentStep.position)} pointer-events-auto`}
            >
              <div className="bg-gray-900 border-2 border-empire-gold rounded-lg p-6 max-w-md shadow-2xl">
                {/* Progress indicator */}
                <div className="flex items-center justify-between mb-4">
                  <div className="text-xs text-gray-400">
                    Step {tutorialState.currentStepIndex + 1} of {TUTORIAL_STEPS.length}
                  </div>
                  <div className="flex gap-1">
                    {TUTORIAL_STEPS.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-2 h-2 rounded-full ${
                          idx === tutorialState.currentStepIndex
                            ? 'bg-empire-gold'
                            : idx < tutorialState.currentStepIndex
                            ? 'bg-green-500'
                            : 'bg-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-empire-gold mb-3">
                  {currentStep.title}
                </h3>
                <p className="text-gray-300 mb-6 leading-relaxed">
                  {currentStep.description}
                </p>

                {/* Navigation buttons */}
                <div className="flex gap-3">
                  {tutorialState.currentStepIndex > 0 && (
                    <button
                      onClick={previousStep}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded font-semibold hover:bg-gray-600 transition-colors"
                    >
                      ← Back
                    </button>
                  )}
                  <button
                    onClick={nextStep}
                    className="flex-1 px-4 py-2 bg-empire-gold text-gray-900 rounded font-bold hover:bg-yellow-500 transition-colors"
                  >
                    {tutorialState.currentStepIndex === TUTORIAL_STEPS.length - 1
                      ? 'Finish'
                      : 'Next →'}
                  </button>
                  <button
                    onClick={skipTutorial}
                    className="px-4 py-2 bg-gray-700 text-gray-400 rounded font-semibold hover:bg-gray-600 transition-colors text-sm"
                  >
                    Skip
                  </button>
                </div>
              </div>

              {/* Pointer/Arrow for non-center positions */}
              {currentStep.position !== 'center' && (
                <div
                  className={`absolute w-0 h-0 border-8 ${
                    currentStep.position.includes('top')
                      ? 'bottom-full left-1/2 -translate-x-1/2 border-b-empire-gold border-x-transparent border-t-transparent'
                      : currentStep.position.includes('bottom')
                      ? 'top-full left-1/2 -translate-x-1/2 border-t-empire-gold border-x-transparent border-b-transparent'
                      : ''
                  }`}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Restart Tutorial Button (always available) */}
      {!tutorialState.active && (tutorialState.completed || tutorialState.skipped) && (
        <button
          onClick={restartTutorial}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-800/90 border border-empire-gold text-empire-gold rounded-lg font-semibold hover:bg-gray-700 transition-colors text-sm"
          title="Restart Tutorial"
        >
          🎓 Tutorial
        </button>
      )}
    </>
  );
}

// ============================================================================
// Tutorial Hook
// ============================================================================

export function useTutorial() {
  const [state, setState] = useState<TutorialState>(loadTutorialState);

  const start = () => {
    const newState = { active: true, currentStepIndex: 0, completed: false, skipped: false };
    setState(newState);
    saveTutorialState(newState);
  };

  const skip = () => {
    const newState = { active: false, currentStepIndex: 0, completed: false, skipped: true };
    setState(newState);
    saveTutorialState(newState);
  };

  const reset = () => {
    const newState = { active: false, currentStepIndex: 0, completed: false, skipped: false };
    setState(newState);
    saveTutorialState(newState);
  };

  return {
    ...state,
    start,
    skip,
    reset,
  };
}
