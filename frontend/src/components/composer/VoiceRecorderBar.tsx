import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, AlertCircle } from 'lucide-react';

interface VoiceRecorderBarProps {
  isRecording: boolean;
  transcript: string;
  volume: number; // 0 to 1
  onCancel: () => void;
  onConfirm: () => void;
}

export const VoiceRecorderBar: React.FC<VoiceRecorderBarProps> = ({
  isRecording,
  transcript,
  volume,
  onCancel,
  onConfirm,
}) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      setSeconds(0);
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  if (!isRecording) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="p-3 bg-surface-raised border border-border rounded-2xl flex flex-col gap-2 shadow-soft mb-2"
    >
      <div className="flex items-center justify-between">
        {/* Recording indicator (small danger dot) & timer */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-danger animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-danger" />
          </div>
          <span className="text-xs font-mono font-bold text-foreground">
            {formatTime(seconds)} / 01:00
          </span>
        </div>

        {/* Dynamic Waveform Visualizer in accent */}
        <div className="flex items-center gap-1 h-5 px-3 bg-background-subtle border border-border rounded-lg">
          {[0.2, 0.5, 0.8, 0.4, 0.9, 0.6, 0.3, 0.7, 0.5].map((factor, i) => {
            const h = Math.min(100, Math.max(15, volume * factor * 160));
            return (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-accent"
                style={{ height: `${h}%` }}
                transition={{ duration: 0.1 }}
              />
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCancel}
            title="Cancel recording"
            className="p-1.5 rounded-xl bg-surface hover:bg-surface-raised text-foreground-muted hover:text-danger border border-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={onConfirm}
            title="Confirm and send transcript"
            className="p-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground transition-colors shadow-soft"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interim Live Transcript */}
      <div className="text-xs text-foreground italic bg-background-subtle border border-border p-2 rounded-xl min-h-[32px] flex items-center">
        {transcript ? (
          <span>"{transcript}"</span>
        ) : (
          <span className="text-foreground-muted">Listening... Speak now</span>
        )}
      </div>

      {/* Low volume warning */}
      {volume < 0.05 && seconds > 3 && (
        <div className="flex items-center gap-1.5 text-[10px] text-warning">
          <AlertCircle className="w-3 h-3 text-warning" />
          <span>Low microphone volume detected. Please speak closer to your mic.</span>
        </div>
      )}
    </motion.div>
  );
};
