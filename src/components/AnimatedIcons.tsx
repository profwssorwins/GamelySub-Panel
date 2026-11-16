"use client";

import React from "react";

interface IconProps {
  className?: string;
  active?: boolean;
}

export function AnimatedDashboardIcon({ className = "w-4 h-4", active }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-300 group-hover:scale-110`}
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="9"
        rx="2"
        className={`origin-center transition-transform duration-300 group-hover:-translate-y-0.5 ${
          active ? "fill-current/15" : ""
        }`}
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="5"
        rx="1.5"
        className="origin-center transition-transform duration-300 delay-75 group-hover:translate-x-0.5"
      />
      <rect
        x="14"
        y="12"
        width="7"
        height="9"
        rx="2"
        className={`origin-center transition-transform duration-300 delay-100 group-hover:translate-y-0.5 ${
          active ? "fill-current/15" : ""
        }`}
      />
      <rect
        x="3"
        y="16"
        width="7"
        height="5"
        rx="1.5"
        className="origin-center transition-transform duration-300 delay-150 group-hover:-translate-x-0.5"
      />
    </svg>
  );
}

export function AnimatedKeyIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110`}
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

export function AnimatedGamepadIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
    >
      <line x1="6" y1="11" x2="10" y2="11" />
      <line x1="8" y1="9" x2="8" y2="13" />
      <circle
        cx="15"
        cy="12"
        r="0.8"
        className="fill-current transition-opacity duration-200 group-hover:opacity-60"
      />
      <circle
        cx="18"
        cy="10"
        r="0.8"
        className="fill-current transition-opacity duration-200 delay-75 group-hover:opacity-60"
      />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </svg>
  );
}

export function AnimatedUsersIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-300 group-hover:scale-110`}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path
        d="M22 21v-2a4 4 0 0 0-3-3.87"
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      />
      <path
        d="M16 3.13a4 4 0 0 1 0 7.75"
        className="transition-transform duration-300 group-hover:translate-x-0.5"
      />
    </svg>
  );
}

export function AnimatedSettingsIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${className} transition-transform duration-500 group-hover:rotate-90`}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function AnimatedLogoutIcon({ className = "w-4 h-4" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline
        points="16 17 21 12 16 7"
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
      <line
        x1="21"
        y1="12"
        x2="9"
        y2="12"
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </svg>
  );
}
