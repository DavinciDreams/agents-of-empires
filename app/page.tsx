'use client';

import dynamic from 'next/dynamic';

// Dynamically import the GameScene component with no SSR
const GameScene = dynamic(
  () => import('@/app/components/a2ui/game/GameScene').then((mod) => mod.GameScene),
  { ssr: false }
);

export default function Home() {
  return (
    <div className="w-full h-screen">
      <GameScene />
    </div>
  );
}
