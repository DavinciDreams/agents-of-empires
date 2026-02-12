'use client';

import { useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { CheckpointMarker } from './CheckpointMarker';

export function CheckpointManager() {
  const checkpoints = useGameStore((state) => state.checkpoints);
  const agents = useGameStore((state) => state.agents);

  // Convert checkpoints to array
  const checkpointList = useMemo(() => Object.values(checkpoints), [checkpoints]);

  // Determine which checkpoints are active (assigned to agents)
  const activeCheckpointIds = useMemo(() => {
    const ids = new Set<string>();
    Object.values(agents).forEach((agent) => {
      if (agent.currentCheckpointId) {
        ids.add(agent.currentCheckpointId);
      }
    });
    return ids;
  }, [agents]);

  return (
    <group>
      {checkpointList.map((checkpoint) => (
        <CheckpointMarker
          key={checkpoint.id}
          checkpoint={checkpoint}
          isActive={activeCheckpointIds.has(checkpoint.id)}
          isCompleted={checkpoint.status === 'completed'}
        />
      ))}
    </group>
  );
}
