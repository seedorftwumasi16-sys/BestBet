"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SPORTS, LEAGUES } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SportsSidebarProps {
  activeSport?: string;
  className?: string;
}

export function SportsSidebar({ activeSport, className }: SportsSidebarProps) {
  const [expanded, setExpanded] = useState<string | null>("football");

  return (
    <aside
      className={cn(
        "w-64 shrink-0 bg-[var(--sidebar-bg)] border-r border-[var(--border)] overflow-y-auto",
        className
      )}
      aria-label="Sports navigation"
    >
      <div className="p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-bestbet-gray-muted mb-3">
          Sports
        </h2>
        <nav className="space-y-1">
          {SPORTS.map((sport) => (
            <div key={sport.id}>
              <button
                onClick={() => setExpanded(expanded === sport.id ? null : sport.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  activeSport === sport.id
                    ? "bg-bestbet-yellow/12 text-bestbet-yellow border-l-2 border-bestbet-yellow"
                    : "hover:bg-[var(--card)] hover:text-bestbet-yellow text-[var(--foreground)]"
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="text-base">{sport.icon}</span>
                  {sport.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="text-xs text-bestbet-gray-muted font-normal">{sport.count}</span>
                  {sport.id !== "live" && (
                    expanded === sport.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  )}
                </span>
              </button>

              <AnimatePresence>
                {expanded === sport.id && sport.id !== "live" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 pl-3 border-l border-[var(--border)] space-y-0.5 py-1">
                      {LEAGUES.filter((l) => l.sport === sport.id).map((league) => (
                        <Link
                          key={league.id}
                          href={`/leagues/${league.id}`}
                          className="block px-3 py-2 text-xs text-bestbet-gray-muted hover:text-bestbet-yellow transition-colors rounded-md hover:bg-[var(--card)]"
                        >
                          {league.name}
                          <span className="text-[10px] ml-1 opacity-60">({league.country})</span>
                        </Link>
                      ))}
                      {LEAGUES.filter((l) => l.sport === sport.id).length === 0 && (
                        <p className="px-3 py-2 text-xs text-bestbet-gray-muted">All {sport.name} events</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
