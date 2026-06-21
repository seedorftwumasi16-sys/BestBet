"use client";

import { useEffect, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function useCountdown(targetDate: Date): CountdownParts {
  const [parts, setParts] = useState<CountdownParts>(() => calcParts(targetDate));

  useEffect(() => {
    const tick = () => setParts(calcParts(targetDate));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return parts;
}

function calcParts(targetDate: Date): CountdownParts {
  const total = Math.max(0, targetDate.getTime() - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { days, hours, minutes, seconds, total };
}

export function padCount(n: number): string {
  return String(n).padStart(2, "0");
}
