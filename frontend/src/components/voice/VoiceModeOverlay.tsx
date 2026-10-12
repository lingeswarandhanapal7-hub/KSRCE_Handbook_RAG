import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, MicOff, Volume2, VolumeX, Sparkles, Globe } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useAudioAnalyser } from '../../hooks/useAudioAnalyser';
import { useVoiceOutput } from '../../hooks/useVoiceOutput';
import { AnimatedOrb } from '../ui/AnimatedOrb';

export const VoiceModeOverlay: React.FC = () => {
  const { 
    isVoiceModeOpen, 
    setVoiceModeOpen, 
    sendMessage, 
    isStreaming, 
    streamedContent, 
    messages 
  } = useChatStore();

  const { 
    voiceLanguage, 
    answerLanguage, 
  } = useSettingsStore();

  const [state, setState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [caption, setCaption] = useState<string>('Listening... Speak your question');
  const [isMuted, setIsMuted] = useState(false);

  const { isPlaying, speak, stop: stopAudio } = useVoiceOutput();

  const activeLang = voiceLanguage === 'auto' ? (answerLanguage === 'auto' ? 'en-IN' : answerLanguage) : voiceLanguage;

  const {
    isRecording,
    activeStream,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    languageLocale: activeLang,
    onInterimTranscript: (text) => {
      setCaption(text);
      setState('listening');
    },
    onFinalTranscript: (text) => {
      setCaption(text);
      handleQuestionSubmit(text);
    },
    onSilenceAutoStop: () => {
      stopRecording();
    },
  });

  const { amplitude } = useAudioAnalyser(activeStream);

  const handleQuestionSubmit = async (question: string) => {
    if (!question.trim()) return;
    setState('thinking');
    setCaption(`Asking: "${question}"`);
    await sendMessage(question, true, answerLanguage);
  };

  // Watch streaming state and assistant responses (ONLY when full-screen voice mode is active)
  useEffect(() => {
    if (!isVoiceModeOpen) return;

    if (isStreaming) {
      setState('thinking');
      if (streamedContent) {
        setCaption(streamedContent.slice(-100)); // Show trailing part
      }
    } else if (state === 'thinking' && !isStreaming) {
      // Stream just finished, speak answer
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && !isMuted) {
        setState('speaking');
        setCaption(lastMsg.content.slice(0, 150) + '...');
        speak(lastMsg.content, lastMsg.language);
      } else {
        // Ready for next turn
        setState('idle');
        setCaption('Tap microphone or speak again...');
      }
    }
  }, [isVoiceModeOpen, isStreaming, streamedContent, messages, isMuted, state]);

  // When speech ends, auto-listen again
  useEffect(() => {
    if (!isVoiceModeOpen) return;
    if (!isPlaying && state === 'speaking') {
      setState('listening');
      setCaption('Listening for your next question...');
      startRecording();
    }
  }, [isVoiceModeOpen, isPlaying, state]);

  // Start recording when opening voice mode
  useEffect(() => {
    if (isVoiceModeOpen) {
      setState('listening');
      setCaption('Listening... Speak your question about the handbook');
      startRecording();
    } else {
      stopRecording();
      stopAudio();
    }
  }, [isVoiceModeOpen]);

  if (!isVoiceModeOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col justify-between p-6 sm:p-10 select-none"
        style={{ backgroundColor: '#0B0F15' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-foreground">
            <Globe className="w-3.5 h-3.5 text-accent" />
            <span className="font-semibold">{activeLang}</span>
            <span className="text-foreground-muted">• Voice Hands-Free</span>
          </div>

          <button
            onClick={() => setVoiceModeOpen(false)}
            aria-label="Exit voice mode"
            className="p-2.5 rounded-2xl bg-surface hover:bg-surface-raised border border-border text-foreground-muted hover:text-foreground transition-colors active:scale-95 shadow-soft"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Large Animated Orb + Live Captions */}
        <div className="flex flex-col items-center justify-center my-auto text-center max-w-lg mx-auto">
          <div className="mb-10 cursor-pointer" onClick={isRecording ? stopRecording : startRecording}>
            <AnimatedOrb 
              state={state} 
              size="lg" 
              amplitude={amplitude} 
            />
          </div>

          {/* Status Label */}
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent mb-3">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>
              {state === 'listening' ? 'Listening...' : state === 'thinking' ? 'Consulting Handbook...' : state === 'speaking' ? 'Speaking...' : 'Ready'}
            </span>
          </div>

          {/* Captions Text */}
          <div className="min-h-[72px] flex items-center justify-center px-4">
            <p className="text-base sm:text-lg font-medium text-foreground leading-relaxed line-clamp-3">
              {caption}
            </p>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              if (!isMuted) stopAudio();
            }}
            title={isMuted ? "Unmute speech" : "Mute speech"}
            className={`p-4 rounded-2xl border transition-all active:scale-95 shadow-soft ${
              isMuted
                ? 'bg-danger/20 text-danger border-danger/40'
                : 'bg-surface text-foreground-muted hover:text-foreground border-border hover:bg-surface-raised'
            }`}
          >
            {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>

          <button
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Pause listening" : "Resume listening"}
            className={`p-5 rounded-3xl border transition-all active:scale-95 shadow-soft ${
              isRecording
                ? 'bg-danger text-primary-foreground border-danger'
                : 'bg-primary hover:bg-primary-hover text-primary-foreground border-border'
            }`}
          >
            {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
          </button>

          <button
            onClick={() => setVoiceModeOpen(false)}
            title="End voice session"
            className="p-4 rounded-2xl bg-surface text-foreground-muted hover:text-danger border border-border hover:bg-surface-raised transition-colors active:scale-95 shadow-soft"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
