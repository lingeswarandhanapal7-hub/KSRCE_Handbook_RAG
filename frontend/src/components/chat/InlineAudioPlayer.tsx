import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Loader2, Zap, Sparkles } from 'lucide-react';
import { useVoiceStore } from '../../store/voiceStore';
import { useSettingsStore } from '../../store/settingsStore';

interface InlineAudioPlayerProps {
  messageId: string;
  text: string;
  language?: string;
}

export const InlineAudioPlayer: React.FC<InlineAudioPlayerProps> = ({ messageId, text, language }) => {
  const { speechSpeed, setSpeechSpeed, ttsEngine, setTTSEngine } = useSettingsStore();
  const { isPlaying, isLoading, activeMessageId, play, stop } = useVoiceStore();
  const [speedOpen, setSpeedOpen] = useState(false);

  const isThisPlaying = isPlaying && activeMessageId === messageId;
  const isThisLoading = isLoading && activeMessageId === messageId;

  const speeds = [0.75, 1.0, 1.25, 1.5];

  const handleTogglePlay = () => {
    if (isThisPlaying || isThisLoading) {
      stop();
    } else {
      play(text, language, speechSpeed, messageId);
    }
  };

  const handleToggleEngine = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextEngine = ttsEngine === 'browser' ? 'gemini' : 'browser';
    setTTSEngine(nextEngine);
    if (isThisPlaying || isThisLoading) {
      stop();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-border shadow-soft text-xs w-fit">
      {/* Play / Stop / Loading Button */}
      <button
        onClick={handleTogglePlay}
        disabled={isLoading && !isThisLoading}
        aria-label={isThisPlaying ? "Stop audio" : isThisLoading ? "Buffering audio" : "Listen to answer"}
        className={`p-1.5 rounded-lg text-primary-foreground transition-all shadow-soft shrink-0 flex items-center justify-center ${
          isThisLoading 
            ? 'bg-warning hover:opacity-90' 
            : isThisPlaying
            ? 'bg-danger hover:opacity-90 active:scale-95'
            : 'bg-primary hover:bg-primary-hover active:scale-95'
        }`}
      >
        {isThisLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin fill-none" />
        ) : isThisPlaying ? (
          <Square className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current" />
        )}
      </button>

      {/* Animated Waveform Bars */}
      <div className="flex items-center gap-0.5 h-4 px-1 min-w-[32px]">
        {[0.4, 0.8, 0.5, 0.9, 0.6, 0.3].map((height, i) => (
          <motion.div
            key={i}
            className={`w-0.5 rounded-full ${isThisLoading ? 'bg-warning' : 'bg-accent'}`}
            animate={
              isThisPlaying
                ? {
                    height: ['20%', `${height * 100}%`, '20%'],
                  }
                : isThisLoading
                ? {
                    height: ['20%', '50%', '20%'],
                  }
                : { height: '20%' }
            }
            transition={
              isThisPlaying || isThisLoading
                ? {
                    duration: 0.6 + i * 0.1,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }
                : undefined
            }
          />
        ))}
      </div>

      {/* State Label */}
      <span className="text-[11px] text-foreground-muted font-medium min-w-[48px]">
        {isThisLoading ? 'Buffering...' : isThisPlaying ? 'Speaking...' : 'Listen'}
      </span>

      {/* Engine Switcher Chip */}
      <button
        onClick={handleToggleEngine}
        title={ttsEngine === 'browser' ? "Using Instant Browser Voice (<100ms). Click to switch to Gemini HD Voice." : "Using Gemini HD Voice. Click to switch to Instant Browser Voice."}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border transition-all ${
          ttsEngine === 'browser'
            ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
            : 'bg-accent-soft text-accent-strong border-accent-border hover:border-accent'
        }`}
      >
        {ttsEngine === 'browser' ? (
          <>
            <Zap className="w-2.5 h-2.5" />
            <span>Instant</span>
          </>
        ) : (
          <>
            <Sparkles className="w-2.5 h-2.5" />
            <span>Gemini HD</span>
          </>
        )}
      </button>

      {/* Speed Selector */}
      <div className="relative">
        <button
          onClick={() => setSpeedOpen(!speedOpen)}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground-muted hover:text-foreground hover:bg-background-subtle border border-border transition-colors"
          title="Adjust playback speed"
        >
          {speechSpeed}x
        </button>

        {speedOpen && (
          <div className="absolute bottom-6 right-0 py-1 bg-surface-raised border border-border rounded-xl shadow-soft z-20 flex flex-col min-w-[50px]">
            {speeds.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSpeechSpeed(s);
                  setSpeedOpen(false);
                }}
                className={`px-2 py-1 text-[10px] font-mono text-left hover:bg-background-subtle ${
                  speechSpeed === s ? 'text-accent-strong font-bold' : 'text-foreground-secondary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
