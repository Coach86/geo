"use client";

import React from 'react';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/use-window-size';

interface CelebrationConfettiProps {
  isActive: boolean;
}

export function CelebrationConfetti({ isActive }: CelebrationConfettiProps) {
  const { width, height } = useWindowSize();

  if (!isActive) return null;

  return (
    <Confetti
      width={width}
      height={height}
      numberOfPieces={500}
      recycle={false}
      gravity={0.2}
      initialVelocityX={0}
      initialVelocityY={0}
      colors={[
        '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
        '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
        '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
      ]}
      confettiSource={{
        x: 0,
        y: 0,
        w: width || window.innerWidth,
        h: 0
      }}
      tweenDuration={4000}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
}