'use client';

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useAgentsMap, usePartiesShallow, type GameAgent, type Party } from '@/app/components/a2ui/game/store';

// ============================================================================
// AgentPartySelector Component
// ============================================================================

interface AgentPartySelectorProps {
  onSelectAgent: (agentId: string) => void;
  onSelectParty: (partyId: string) => void;
  onClose: () => void;
}

export function AgentPartySelector({
  onSelectAgent,
  onSelectParty,
  onClose,
}: AgentPartySelectorProps) {
  const agentsMap = useAgentsMap();
  const partiesMap = usePartiesShallow();

  const [selectionType, setSelectionType] = useState<'agent' | 'party' | 'all'>('agent');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const agents = useMemo(() => Object.values(agentsMap as Record<string, GameAgent>), [agentsMap]);
  const parties = useMemo(() => Object.values(partiesMap as Record<string, Party>), [partiesMap]);

  const handleConfirm = () => {
    if (selectionType === 'all') {
      // Install to all agents
      agents.forEach((agent) => onSelectAgent(agent.id));
    } else if (selectionType === 'agent' && selectedAgentId) {
      onSelectAgent(selectedAgentId);
    } else if (selectionType === 'party' && selectedPartyId) {
      onSelectParty(selectedPartyId);
    }
    onClose();
  };

  const canConfirm =
    selectionType === 'all' ||
    (selectionType === 'agent' && selectedAgentId !== null) ||
    (selectionType === 'party' && selectedPartyId !== null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-gray-900/98 border-2 border-[var(--empire-gold)] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl shadow-[var(--empire-gold)]/30"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--empire-gold)]/30 to-[var(--empire-gold)]/10 px-6 py-4 border-b border-[var(--empire-gold)]/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[var(--empire-gold)] font-bold text-xl" style={{ fontFamily: 'Cinzel, serif' }}>
                Install Tool
              </h3>
              <p className="text-sm text-gray-400" style={{ fontFamily: 'Lora, serif' }}>
                Select installation target
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-gray-700 w-8 h-8 rounded transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-12rem)]">
          {/* Selection Type Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSelectionType('agent')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                selectionType === 'agent'
                  ? 'bg-[var(--empire-gold)] text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              🧙 Single Agent
            </button>
            <button
              onClick={() => setSelectionType('party')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                selectionType === 'party'
                  ? 'bg-[var(--empire-gold)] text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              👥 Party
            </button>
            <button
              onClick={() => setSelectionType('all')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                selectionType === 'all'
                  ? 'bg-[var(--empire-gold)] text-gray-900'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              ⭐ All Agents
            </button>
          </div>

          {/* Agent Selection */}
          {selectionType === 'agent' && (
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                Select Agent ({agents.length} available)
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-700 rounded-lg bg-gray-800/50 p-2">
                {agents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No agents available
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selectedAgentId === agent.id
                          ? 'bg-[var(--empire-gold)]/20 border-2 border-[var(--empire-gold)]'
                          : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                            selectedAgentId === agent.id
                              ? 'border-[var(--empire-gold)] bg-[var(--empire-gold)]'
                              : 'border-gray-600'
                          }`}
                        >
                          {selectedAgentId === agent.id && (
                            <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{agent.name}</div>
                          <div className="text-xs text-gray-400">
                            Level {agent.level} • {agent.state}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {agent.equippedTool && (
                          <span className="text-xs text-gray-500">
                            {agent.equippedTool.icon}
                          </span>
                        )}
                        <div className="text-xs text-gray-500">
                          {agent.inventory.length} tools
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Party Selection */}
          {selectionType === 'party' && (
            <div className="space-y-2">
              <h4 className="text-white font-semibold text-sm mb-3" style={{ fontFamily: 'Cinzel, serif' }}>
                Select Party ({parties.length} available)
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-700 rounded-lg bg-gray-800/50 p-2">
                {parties.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No parties available
                  </div>
                ) : (
                  parties.map((party) => (
                    <div
                      key={party.id}
                      onClick={() => setSelectedPartyId(party.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selectedPartyId === party.id
                          ? 'bg-[var(--empire-gold)]/20 border-2 border-[var(--empire-gold)]'
                          : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                            selectedPartyId === party.id
                              ? 'border-[var(--empire-gold)] bg-[var(--empire-gold)]'
                              : 'border-gray-600'
                          }`}
                        >
                          {selectedPartyId === party.id && (
                            <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
                          )}
                        </div>
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: party.color }}
                        />
                        <div>
                          <div className="font-semibold text-white text-sm">{party.name}</div>
                          <div className="text-xs text-gray-400">
                            {party.memberIds.length} members • {party.formation}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {party.sharedResources.tools.length} shared tools
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* All Agents Confirmation */}
          {selectionType === 'all' && (
            <div className="p-6 bg-[var(--empire-gold)]/10 border border-[var(--empire-gold)]/30 rounded-lg text-center">
              <div className="text-4xl mb-3">⭐</div>
              <h4 className="text-[var(--empire-gold)] font-bold text-lg mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
                Install to All Agents
              </h4>
              <p className="text-gray-400 text-sm" style={{ fontFamily: 'Lora, serif' }}>
                This tool will be installed to all {agents.length} agents in your empire.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="px-6 py-2 bg-[var(--empire-gold)] text-gray-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Cinzel, serif' }}
          >
            {selectionType === 'all'
              ? `Install to ${agents.length} Agents`
              : selectionType === 'party' && selectedPartyId
              ? `Install to Party`
              : 'Install'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
