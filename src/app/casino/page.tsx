"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { FadeIn } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dices, Spade, Crown, Zap } from "lucide-react";

const casinoGames = [
  { id: "c1", name: "Gold Rush Slots", category: "Slots", icon: "🎰", rtp: "96.5%", badge: "Hot" as const },
  { id: "c2", name: "Blackjack Pro", category: "Table", icon: "🃏", rtp: "99.2%", badge: "Live" as const },
  { id: "c3", name: "Roulette Elite", category: "Table", icon: "🎡", rtp: "97.8%" },
  { id: "c4", name: "Aviator Crash", category: "Crash", icon: "✈️", rtp: "97.0%", badge: "Hot" as const },
  { id: "c5", name: "Mega Wheel", category: "Game Show", icon: "🎡", rtp: "96.8%" },
  { id: "c6", name: "Poker Hold'em", category: "Cards", icon: "♠️", rtp: "98.1%" },
];

export default function CasinoPage() {
  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
        <FadeIn>
          <div className="card-premium p-6 md:p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-bestbet-yellow/10 via-transparent to-bestbet-yellow-secondary/5" />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-bestbet-yellow/15 border border-bestbet-yellow/25">
                  <Dices size={32} className="text-bestbet-yellow" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black">Casino</h1>
                  <p className="text-sm text-bestbet-gray-muted">Premium slots, tables & crash games — 24/7</p>
                </div>
              </div>
              <Button variant="primary" size="lg">
                Claim Casino Bonus
              </Button>
            </div>
          </div>
        </FadeIn>

        <section>
          <h2 className="section-heading mb-4">Featured Games</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {casinoGames.map((game, i) => (
              <FadeIn key={game.id} delay={i * 0.05}>
                <button className="card-premium p-5 text-left w-full group hover:-translate-y-1 transition-transform">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-4xl group-hover:scale-110 transition-transform">{game.icon}</span>
                    <div className="flex gap-1">
                      {game.badge === "Hot" && <Badge variant="hot">Hot</Badge>}
                      {game.badge === "Live" && <Badge variant="live">Live</Badge>}
                    </div>
                  </div>
                  <h3 className="font-bold text-lg group-hover:text-bestbet-yellow transition-colors">{game.name}</h3>
                  <p className="text-xs text-bestbet-gray-muted mt-1">{game.category}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-bestbet-yellow/10">
                    <span className="text-xs text-bestbet-gray-muted">RTP {game.rtp}</span>
                    <span className="text-xs font-bold text-bestbet-yellow">Play →</span>
                  </div>
                </button>
              </FadeIn>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Spade, title: "Live Dealers", desc: "HD streams with professional croupiers" },
            { icon: Crown, title: "VIP Rewards", desc: "Exclusive bonuses for high rollers" },
            { icon: Zap, title: "Instant Play", desc: "No downloads — play in your browser" },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="stat-card p-5">
              <Icon size={24} className="text-bestbet-yellow mb-3" />
              <h3 className="font-bold">{title}</h3>
              <p className="text-sm text-bestbet-gray-muted mt-1">{desc}</p>
            </div>
          ))}
        </section>
      </div>
    </MainLayout>
  );
}
