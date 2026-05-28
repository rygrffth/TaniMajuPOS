'use client';

import { useState, useEffect, useCallback } from 'react';

export type DeviceType = 'desktop' | 'laptop' | 'tablet' | 'mobile';
export type Orientation = 'portrait' | 'landscape';

interface ScalingState {
  scale: number;
  targetWidth: number;
  targetHeight: number;
  deviceType: DeviceType;
  orientation: Orientation;
  windowWidth: number;
  windowHeight: number;
  isKioskMode: boolean;
}

/**
 * Hybrid Adaptive Scaling Hook
 * Ported from FotoPad Photobooth to ensure optimized responsive layout rules.
 */
export function useAdaptiveLayout(baseWidth = 1366, baseHeight = 768) {
  const [layout, setLayout] = useState<ScalingState>({
    scale: 1,
    targetWidth: baseWidth,
    targetHeight: baseHeight,
    deviceType: 'desktop',
    orientation: 'landscape',
    windowWidth: baseWidth,
    windowHeight: baseHeight,
    isKioskMode: false,
  });

  const handleResize = useCallback(() => {
    if (typeof window === 'undefined') return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const orientation: Orientation = w > h ? 'landscape' : 'portrait';
    
    let targetWidth = baseWidth;
    let targetHeight = baseHeight;
    let deviceType: DeviceType = 'desktop';

    if (w >= 1600) {
      deviceType = 'desktop';
      targetWidth = Math.max(baseWidth, 1600);
      targetHeight = Math.max(baseHeight, 900);
    } else if (w >= 1024) {
      deviceType = 'laptop';
      targetWidth = baseWidth;
      targetHeight = baseHeight;
    } else if (w >= 768 && w < 1024) {
      deviceType = 'tablet';
      targetWidth = 1024;
      targetHeight = 768;
    } else {
      deviceType = 'mobile';
      // Standard mobile responsive targets
      targetWidth = orientation === 'portrait' ? 390 : 844;
      targetHeight = orientation === 'portrait' ? 844 : 390;
    }

    const scaleW = w / targetWidth;
    const scaleH = h / targetHeight;
    // Scale to fit target dimensions
    let scale = Math.min(scaleW, scaleH);

    // Apply safety scaling floors to prevent UI becoming too small on small viewports
    if (deviceType === 'mobile') {
      scale = Math.max(scale, 0.5);
    } else if (deviceType === 'tablet') {
      scale = Math.max(scale, 0.75);
    }

    setLayout({
      scale,
      targetWidth,
      targetHeight,
      deviceType,
      orientation,
      windowWidth: w,
      windowHeight: h,
      isKioskMode: deviceType === 'desktop' || deviceType === 'laptop',
    });
  }, [baseWidth, baseHeight]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  return layout;
}
