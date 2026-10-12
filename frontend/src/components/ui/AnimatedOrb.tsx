import React from 'react';
import { motion } from 'framer-motion';

export interface AnimatedOrbProps {
  amplitude?: number; // 0.0 to 1.0
  isListening?: boolean;
  isSpeaking?: boolean;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking';
  size?: number | 'sm' | 'md' | 'lg';
}

export const AnimatedOrb: React.FC<AnimatedOrbProps> = ({
  amplitude = 0,
  isListening = false,
  isSpeaking = false,
  state = 'idle',
  size = 120,
}) => {
  let pixelSize = 120;
  if (typeof size === 'number') {
    pixelSize = size;
  } else if (size === 'sm') {
    pixelSize = 80;
  } else if (size === 'md') {
    pixelSize = 120;
  } else if (size === 'lg') {
    pixelSize = 200;
  }

  const activeListening = isListening || state === 'listening';
  const activeSpeaking = isSpeaking || state === 'speaking';
  const activeThinking = state === 'thinking';

  // Dynamic scale from microphone amplitude for the 1.5px brass ring
  const ringScale = 1.05 + Math.min(amplitude * 0.45, 0.45);

  return (
    <div
      className="relative flex items-center justify-center pointer-events-none select-none"
      style={{ width: pixelSize, height: pixelSize }}
    >
      {/* Speaking state: 2-3 expanding ivory rings at <=15% opacity */}
      {activeSpeaking && (
        <>
          {[0, 0.4, 0.8].map((delay, idx) => (
            <motion.div
              key={idx}
              initial={{ scale: 1, opacity: 0.15 }}
              animate={{ scale: [1, 1.45, 1.75], opacity: [0.15, 0.08, 0] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay,
                ease: 'easeOut',
              }}
              className="absolute inset-0 rounded-full border border-primary-foreground pointer-events-none"
              style={{ borderWidth: '1px' }}
            />
          ))}
        </>
      )}

      {/* Listening state: 1.5px brass ring that scales with mic amplitude */}
      {activeListening && (
        <motion.div
          animate={{ scale: ringScale }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute inset-[-6px] rounded-full border border-accent pointer-events-none"
          style={{ borderWidth: '1.5px' }}
        />
      )}

      {/* Thinking state: slowly rotating arc at 40% opacity */}
      {activeThinking && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-[-8px] rounded-full pointer-events-none opacity-40"
          style={{
            borderWidth: '1.5px',
            borderStyle: 'solid',
            borderColor: 'transparent',
            borderTopColor: 'rgb(var(--color-accent))',
            borderRightColor: 'rgb(var(--color-accent))',
          }}
        />
      )}

      {/* Center core sphere: tonal radial fill #2D4272 -> #1C2B4A -> #101A2E, hairline border, no glow/bloom/blur */}
      <motion.div
        animate={{
          scale: activeListening
            ? [1, 1.02, 1]
            : activeSpeaking
            ? [1, 1.03, 1]
            : [1, 1.01, 1],
        }}
        transition={{
          duration: activeListening || activeSpeaking ? 1.5 : 3.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative z-10 w-full h-full rounded-full border border-border-strong/40 flex items-center justify-center overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 38% 36%, #2D4272 0%, #1C2B4A 60%, #101A2E 100%)',
        }}
      />
    </div>
  );
};
