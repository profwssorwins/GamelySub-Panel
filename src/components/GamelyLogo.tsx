"use client";

import React from "react";

export function GamelyLogo({
  size = 40,
  showText = true,
  subtitle = "Sub-painel",
}: {
  size?: number;
  showText?: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="relative flex items-center justify-center shrink-0">
        <div
          className="absolute inset-0 rounded-xl bg-blue-500/25 blur-md animate-gamely-ring"
          aria-hidden="true"
        />
        <img
          src="/logogamely.png"
          alt="Gamely"
          width={size}
          height={size}
          style={{ width: size, height: size }}
          className="relative rounded-xl object-contain bg-black/60 border border-blue-500/30 p-0.5 shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
        />
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="font-bold tracking-tight text-white text-base flex items-center gap-1.5">
            Gamely
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 inline-block" />
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {subtitle}
          </div>
        </div>
      )}
    </div>
  );
}
