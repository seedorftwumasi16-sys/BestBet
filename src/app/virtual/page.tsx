"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { contentApi, type VirtualGameApi } from "@/lib/api";
import { FadeIn, Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { Gamepad2 } from "lucide-react";

const GAME_ICONS: Record<string, string> = {
  virtual_football: "⚽",
  virtual_basketball: "🏀",
  virtual_racing: "🏎️",
  virtual_dogs: "🐕",
  virtual_numbers: "🔢",
};

export default function VirtualPage() {
  const [games, setGames] = useState<VirtualGameApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    contentApi.getVirtualGames().then(setGames).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <FadeIn>
          <div className="flex items-center gap-3">
            <Gamepad2 size={32} className="text-bestbet-yellow" />
            <div>
              <h1 className="text-2xl font-black">Virtual Games</h1>
              <p className="text-sm text-bestbet-gray-muted">Instant results, 24/7 action</p>
            </div>
          </div>
        </FadeIn>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {games.map((game) => (
              <FadeIn key={game.id}>
                <div className="card-premium p-5 cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{GAME_ICONS[game.type] || "🎮"}</span>
                    <Badge variant="success">Live</Badge>
                  </div>
                  <h3 className="font-bold text-lg group-hover:text-bestbet-yellow transition-colors">{game.name}</h3>
                  <p className="text-xs text-bestbet-gray-muted mt-2 capitalize">{game.type.replace(/_/g, " ")}</p>
                  {typeof game.config?.interval === "number" && (
                    <p className="text-xs text-bestbet-gray-muted mt-1">New round every {game.config.interval}s</p>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
