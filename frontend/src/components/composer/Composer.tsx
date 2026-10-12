import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowUp, 
  Square, 
  Mic, 
  MicOff, 
  Headphones, 
  Globe 
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useVoiceInput } from '../../hooks/useVoiceInput';
import { useAudioAnalyser } from '../../hooks/useAudioAnalyser';
import { VoiceRecorderBar } from './VoiceRecorderBar';

const PLACEHOLDERS = [
  "Ask about attendance condonation, exams, regulations...",
  "வருகைப்பதிவு மற்றும் தேர்வுகள் பற்றி கேளுங்கள்...",
  "उपस्थिति, परीक्षा और नियमों के बारे में पूछें...",
  "హాజరు మరియు పరీక్షల నిబంధనల గురించి అడగండి...",
  "What is the procedure for semester fee payment?",
  "Hostel rules and timings in the handbook...",
];

export const Composer: React.FC = () => {
  const { 
    isStreaming, 
    sendMessage, 
    stopStreaming, 
    activeSessionId, 
    setVoiceModeOpen 
  } = useChatStore();

  const { 
    voiceLanguage, 
    answerLanguage, 
    autoSendAfterDictation 
  } = useSettingsStore();

  const [text, setText] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isComposing, setIsComposing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load per-chat draft
  useEffect(() => {
    if (activeSessionId) {
      const draft = localStorage.getItem(`ksrce_draft_${activeSessionId}`);
      if (draft) setText(draft);
      else setText('');
    }
  }, [activeSessionId]);

  // Save per-chat draft
  const updateText = (val: string) => {
    setText(val);
    if (activeSessionId) {
      localStorage.setItem(`ksrce_draft_${activeSessionId}`, val);
    }
  };

  // Rotating placeholder
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Voice recording integration
  const voiceLang = voiceLanguage === 'auto' ? (answerLanguage === 'auto' ? 'en-IN' : answerLanguage) : voiceLanguage;

  const {
    isRecording,
    interimText,
    activeStream,
    startRecording,
    stopRecording,
  } = useVoiceInput({
    languageLocale: voiceLang,
    onFinalTranscript: (transcript) => {
      const updated = text ? `${text} ${transcript}` : transcript;
      updateText(updated);
      if (autoSendAfterDictation) {
        handleSend(updated, true);
      }
    },
    onSilenceAutoStop: () => {
      stopRecording();
    },
  });

  const { amplitude } = useAudioAnalyser(activeStream);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleSend = (textToSend?: string, dictated: boolean = false) => {
    const msg = (textToSend || text).trim();
    if (!msg || isStreaming) return;

    sendMessage(msg, dictated, answerLanguage);
    updateText('');
    if (activeSessionId) {
      localStorage.removeItem(`ksrce_draft_${activeSessionId}`);
    }
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing || e.nativeEvent.isComposing) return; // IME safe for Indic input

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape' && isStreaming) {
      e.preventDefault();
      stopStreaming();
    }
  };

  const handleCancelVoice = () => {
    stopRecording();
  };

  const handleConfirmVoice = () => {
    if (interimText) {
      const updated = text ? `${text} ${interimText}` : interimText;
      updateText(updated);
      if (autoSendAfterDictation) {
        handleSend(updated, true);
      }
    }
    stopRecording();
  };

  const charCount = text.length;
  const isNearLimit = charCount > 1800;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4">
      {/* Inline Voice Recorder Bar when active */}
      <VoiceRecorderBar
        isRecording={isRecording}
        transcript={interimText}
        volume={amplitude}
        onCancel={handleCancelVoice}
        onConfirm={handleConfirmVoice}
      />

      {/* Composer Box: surface, 1px border, soft shadow. Focus = border ring + 3px ring at 20% opacity */}
      <div className="relative rounded-3xl bg-surface border border-border focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/20 shadow-soft transition-all duration-200 p-2 sm:p-3">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => updateText(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          rows={1}
          maxLength={2000}
          placeholder={PLACEHOLDERS[placeholderIndex]}
          className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-foreground-muted focus:outline-none resize-none max-h-36 px-2 py-1 leading-relaxed custom-scrollbar"
        />

        {/* Footer Toolbar */}
        <div className="flex items-center justify-between pt-2 px-1 border-t border-border mt-1">
          {/* Left tools: Hands-free Voice Mode + Language Indicator */}
          <div className="flex items-center gap-1.5 text-foreground-muted text-xs">
            <button
              onClick={() => setVoiceModeOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface hover:bg-surface-raised border border-border text-foreground-secondary hover:text-foreground transition-all active:scale-95 shadow-soft"
              title="Enter Hands-Free Voice Mode"
            >
              <Headphones className="w-3.5 h-3.5 text-foreground-muted" />
              <span className="hidden sm:inline font-medium text-[11px]">Voice Mode</span>
            </button>

            {answerLanguage !== 'auto' && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-lg bg-accent-soft text-accent-strong border border-accent-border">
                <Globe className="w-3 h-3" />
                {answerLanguage}
              </span>
            )}
          </div>

          {/* Right tools: Character counter, Mic, Send / Stop button */}
          <div className="flex items-center gap-2">
            {isNearLimit && (
              <span className={`text-[10px] font-mono ${charCount >= 2000 ? 'text-danger font-bold' : 'text-warning'}`}>
                {charCount}/2000
              </span>
            )}

            {/* Voice Dictation Button: idle = ghost; recording = small danger dot + accent */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              aria-label={isRecording ? "Stop dictation" : "Start voice dictation"}
              title="Dictate question"
              className={`relative p-2 rounded-2xl border transition-all active:scale-95 ${
                isRecording
                  ? 'bg-background-subtle text-foreground border-danger/40 shadow-soft'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-subtle border-border'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4 text-danger" /> : <Mic className="w-4 h-4" />}
              {isRecording && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger animate-pulse" />
              )}
            </button>

            {/* Send / Stop Morphing Button: primary for Send/Stop; disabled = surface-raised + foreground-muted */}
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                aria-label="Stop generating response"
                title="Stop generation (Esc)"
                className="p-2 rounded-2xl bg-primary hover:bg-primary-hover text-primary-foreground shadow-soft active:scale-95 transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!text.trim()}
                aria-label="Send question"
                title="Send message (Enter)"
                className={`p-2 rounded-2xl transition-all shadow-soft active:scale-95 ${
                  text.trim()
                    ? 'bg-primary hover:bg-primary-hover text-primary-foreground'
                    : 'bg-surface-raised text-foreground-muted cursor-not-allowed border border-border'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-between text-[11px] text-foreground-muted mt-1.5 px-3">
        <span>Press <kbd className="font-mono bg-surface-raised px-1 py-0.5 rounded border border-border text-[10px]">Enter</kbd> to send, <kbd className="font-mono bg-surface-raised px-1 py-0.5 rounded border border-border text-[10px]">Shift+Enter</kbd> for newline</span>
        <span className="hidden sm:inline">Answers strictly grounded in KSRCE Handbook</span>
      </div>
    </div>
  );
};
