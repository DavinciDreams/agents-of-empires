'use client';

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { shallow } from "zustand/shallow";
import {
  useGameStore,
  usePartiesShallow,
  useAgentsMap,
  type Party,
  type GameAgent,
  type FormationType,
} from '@/components/a2ui/game/store';

// ============================================================================
// PartyPanel Component
// Bottom-right panel showing all parties and their members
// ============================================================================

interface PartyPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function PartyPanel({ isOpen = true, onClose }: PartyPanelProps) {
  const partiesMap = usePartiesShallow();
  const agentsMap = useAgentsMap();
  const selectedAgentIds = useGameStore((state) => state.selectedAgentIds);
  const createParty = useGameStore((state) => state.createParty);
  const disbandParty = useGameStore((state) => state.disbandParty);
  const setPartyFormation = useGameStore((state) => state.setPartyFormation);
  const setPartyLeader = useGameStore((state) => state.setPartyLeader);
  const moveParty = useGameStore((state) => state.moveParty);
  const clearSelection = useGameStore((state) => state.clearSelection);

  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPartyName, setNewPartyName] = useState("");

  const parties = useMemo(() => Object.values(partiesMap as Record<string, Party>), [partiesMap]);
  const selectedAgentsArray = useMemo(
    () => Array.from(selectedAgentIds),
    [selectedAgentIds]
  );

  const handleCreateParty = () => {
    if (newPartyName.trim() && selectedAgentsArray.length > 0) {
      createParty(newPartyName.trim(), selectedAgentsArray);
      setNewPartyName("");
      setShowCreateForm(false);
      clearSelection();
    }
  };

  const handleDisbandParty = (partyId: string) => {
    disbandParty(partyId);
    if (selectedPartyId === partyId) {
      setSelectedPartyId(null);
    }
  };

  const formations: FormationType[] = ["line", "wedge", "column", "box", "circle", "free"];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 50, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute bottom-4 right-4 w-80 bg-gray-900/95 border-2 border-empire-gold rounded-lg shadow-lg shadow-empire-gold/20 overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-empire-gold/30 to-empire-gold/10 px-4 py-3 border-b border-empire-gold/30">
            <div className="flex items-center justify-between">
              <h2 className="text-empire-gold font-bold text-lg">Parties & Squads</h2>
              {parties.length > 0 && (
                <span className="text-xs text-gray-400">{parties.length} parties</span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-96 overflow-y-auto">
            {parties.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No parties formed yet</p>
                <p className="text-xs text-gray-500 mb-4">
                  Select agents and create a party to group them together
                </p>
                {selectedAgentsArray.length > 0 && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-empire-gold/20 border border-empire-gold rounded hover:bg-empire-gold/30 transition-colors"
                  >
                    Create Party ({selectedAgentsArray.length} agents)
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Create Party Button */}
                {selectedAgentsArray.length > 0 && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full mb-4 px-4 py-2 bg-empire-gold/20 border border-empire-gold rounded hover:bg-empire-gold/30 transition-colors"
                  >
                    + Create Party ({selectedAgentsArray.length} selected)
                  </button>
                )}

                {/* Party List */}
                <div className="space-y-3">
                  {parties.map((party) => (
                    <PartyCard
                      key={party.id}
                      party={party as Party}
                      agentsMap={agentsMap}
                      isSelected={selectedPartyId === party.id}
                      onSelect={() => setSelectedPartyId(party.id)}
                      onDisband={() => handleDisbandParty(party.id)}
                      onFormationChange={(formation) =>
                        setPartyFormation(party.id, formation)
                      }
                      onLeaderChange={(leaderId) => setPartyLeader(party.id, leaderId)}
                      formations={formations}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Create Party Form Modal */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gray-900/98 flex items-center justify-center p-4"
              >
                <div className="w-full">
                  <h3 className="text-empire-gold font-bold mb-4">Create New Party</h3>
                  <input
                    type="text"
                    value={newPartyName}
                    onChange={(e) => setNewPartyName(e.target.value)}
                    placeholder="Party name..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white mb-4 focus:outline-none focus:border-empire-gold"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateParty}
                      disabled={!newPartyName.trim()}
                      className="flex-1 px-4 py-2 bg-empire-gold/20 border border-empire-gold rounded hover:bg-empire-gold/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewPartyName("");
                      }}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// PartyCard Component
// Individual party display with controls
// ============================================================================

interface PartyCardProps {
  party: Party;
  agentsMap: Record<string, GameAgent>;
  isSelected: boolean;
  onSelect: () => void;
  onDisband: () => void;
  onFormationChange: (formation: FormationType) => void;
  onLeaderChange: (leaderId: string) => void;
  formations: FormationType[];
}

function PartyCard({
  party,
  agentsMap,
  isSelected,
  onSelect,
  onDisband,
  onFormationChange,
  onLeaderChange,
  formations,
}: PartyCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const members = useMemo(
    () => party.memberIds.map((id) => agentsMap[id]).filter(Boolean),
    [party.memberIds, agentsMap]
  );

  const totalHealth = useMemo(
    () => members.reduce((sum, agent) => sum + agent.health, 0),
    [members]
  );
  const totalMaxHealth = useMemo(
    () => members.reduce((sum, agent) => sum + agent.maxHealth, 0),
    [members]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`border rounded-lg overflow-hidden transition-colors ${
        isSelected ? "border-empire-gold bg-empire-gold/10" : "border-gray-700 bg-gray-800/50"
      }`}
    >
      {/* Party Header */}
      <div
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white/5"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          {/* Party color indicator */}
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: party.color }}
          />
          <div>
            <div className="font-semibold text-white">{party.name}</div>
            <div className="text-xs text-gray-400">
              {members.length} members • {party.formation}
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDetails(!showDetails);
          }}
          className="text-gray-400 hover:text-white transition-colors"
        >
          {showDetails ? "▼" : "▶"}
        </button>
      </div>

      {/* Party Details */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-700"
          >
            {/* Health bar */}
            <div className="px-3 py-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Party Health</span>
                <span>{Math.round(totalHealth)}/{Math.round(totalMaxHealth)}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalHealth / totalMaxHealth) * 100}%` }}
                  className="h-full bg-green-500"
                />
              </div>
            </div>

            {/* Formation selector */}
            <div className="px-3 py-2 border-t border-gray-700">
              <label className="text-xs text-gray-400 block mb-1">Formation</label>
              <select
                value={party.formation}
                onChange={(e) => onFormationChange(e.target.value as FormationType)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-empire-gold"
              >
                {formations.map((f) => (
                  <option key={f} value={f}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Leader selector */}
            <div className="px-3 py-2 border-t border-gray-700">
              <label className="text-xs text-gray-400 block mb-1">Leader</label>
              <select
                value={party.leaderId || ""}
                onChange={(e) => e.target.value && onLeaderChange(e.target.value)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-empire-gold"
              >
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                    {member.id === party.leaderId && " (Leader)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Shared Resources */}
            <div className="px-3 py-2 border-t border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400">Shared Resources</label>
                <span className="text-xs text-pink-400 font-semibold">
                  {party.sharedResources?.tools?.length || 0} tools
                </span>
              </div>
              {party.sharedResources?.tools && party.sharedResources.tools.length > 0 ? (
                <div className="grid grid-cols-4 gap-1">
                  {party.sharedResources.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="bg-pink-500/20 border border-pink-500/40 rounded p-1 text-center"
                      title={`${tool.name} (${tool.rarity})\n${tool.description}`}
                    >
                      <div className="text-lg">{tool.icon}</div>
                      <div className="text-xs text-gray-400 truncate">{tool.name}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-500 italic text-center py-2">
                  No shared resources
                </div>
              )}
            </div>

            {/* Members list */}
            <div className="px-3 py-2 border-t border-gray-700">
              <label className="text-xs text-gray-400 block mb-2">Members</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between px-2 py-1 rounded text-sm ${
                      member.id === party.leaderId
                        ? "bg-empire-gold/20 text-empire-gold"
                        : "text-gray-300"
                    }`}
                  >
                    <span>{member.name}</span>
                    <span className="text-xs">Lvl {member.level}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disband button */}
            <div className="px-3 py-2 border-t border-gray-700">
              <button
                onClick={onDisband}
                className="w-full px-3 py-1 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm hover:bg-red-500/30 transition-colors"
              >
                Disband Party
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
