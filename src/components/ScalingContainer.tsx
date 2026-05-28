"use client";

import React, { useEffect, useState, ReactNode } from "react";
import { useAdaptiveLayout } from "@/hooks/useAdaptiveLayout";

interface ScalingContainerProps {
  children: ReactNode;
  /** Target width for the design. Default: 1280 (Desktop) or 430 (Mobile) */
  baseWidth?: number;
  /** Target height for the design. Default: 800 (Desktop) or 932 (Mobile) */
  baseHeight?: number;
  /** Mode: 'fit' (scale to fit), 'width' (scale to width), 'height' (scale to height) */
  mode?: "fit" | "width" | "height";
  /** Background color for the outer container */
  bg?: string;
  /** Force fluid responsive layout (no scaling) */
  forceFluid?: boolean;
}

export default function ScalingContainer({
  children,
  baseWidth = 1366,
  baseHeight = 768,
  mode = "fit",
  bg = "bg-slate-50",
  forceFluid = false,
}: ScalingContainerProps) {
  const { scale, deviceType, targetWidth, targetHeight } = useAdaptiveLayout(baseWidth, baseHeight);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent server-side hydration mismatch
  if (!mounted) {
    return (
      <div className={`relative w-full min-h-screen ${bg}`}>
        <div className="relative w-full min-h-screen bg-white grain-texture">
          {children}
        </div>
      </div>
    );
  }

  // Mobile & Tablet (viewport < 1200px or explicitly tablet/mobile) or forced: Fluid layout, scale = 1, width = 100%
  const isFluid = forceFluid || deviceType === "mobile" || deviceType === "tablet";

  if (isFluid) {
    return (
      <div className={`relative w-full min-h-screen ${bg}`}>
        <div className={`relative w-full min-h-screen ${bg} grain-texture flex flex-col`}>
          {children}
        </div>
      </div>
    );
  }

  // Desktop/Laptop: Auto scale down, centered absolutely
  return (
    <div
      className={`fixed inset-0 overflow-y-auto flex flex-col items-center justify-start ${bg}`}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          width: `${targetWidth}px`,
          height: mode === "width" ? "auto" : `${targetHeight}px`,
          minHeight: mode === "width" ? `${targetHeight}px` : undefined,
          transform: `translate(-50%, 0) scale(${scale})`,
          transformOrigin: "top center",
          transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          flexShrink: 0,
        }}
        className="bg-[#f8fafc] grain-texture shadow-sm border border-slate-100/50 rounded-2xl overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
}

