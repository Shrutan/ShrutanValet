import React from "react";
import { Car } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showSubtitle?: boolean;
  subtitle?: string;
  variant?: "light" | "dark" | "pill";
  className?: string;
}

export default function Logo({
  size = "md",
  showSubtitle = false,
  subtitle = "Zero-Wait Valet OS",
  variant = "light",
  className = "",
}: LogoProps) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const carIconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const subTextSizes = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-xs",
    xl: "text-xs",
  };

  return (
    <div className={`inline-flex items-center space-x-2.5 select-none ${className}`}>
      {/* Brand Icon Emblem */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-600/20 flex items-center justify-center flex-shrink-0 group`}
      >
        <div className="w-full h-full bg-[#0E0E12] rounded-[10px] flex items-center justify-center relative overflow-hidden">
          {/* Subtle Speed Gradient Flash */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-emerald-500/10 opacity-70" />
          
          <div className="relative flex items-center justify-center text-white">
            <Car className={`${carIconSizes[size]} text-white group-hover:scale-110 transition-transform`} />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        </div>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center leading-none">
        <div className="flex items-center space-x-1">
          <span className={`font-display font-black tracking-tight ${textSizes[size]} text-white`}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300">
              Go
            </span>
            <span>Valet</span>
          </span>
        </div>
        {showSubtitle && (
          <span className={`${subTextSizes[size]} text-slate-400 font-medium tracking-wide mt-0.5`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
