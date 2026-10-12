import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Sliders, 
  Languages, 
  Database, 
  Info, 
  Sun, 
  Moon, 
  Laptop, 
  Trash2,
  Check,
  Zap,
  Sparkles
} from 'lucide-react';
import { useSettingsStore, ThemeMode } from '../../store/settingsStore';
import { useChatStore } from '../../store/chatStore';
import { db } from '../../store/db';
import { SUPPORTED_LANGUAGES } from '../layout/LanguageSelector';

export const SettingsModal: React.FC = () => {
  const { isSettingsOpen, setSettingsOpen, loadSessions } = useChatStore();
  const {
    theme, setTheme,
    answerLanguage, setAnswerLanguage,
    voiceLanguage, setVoiceLanguage,
    readAloud, setReadAloud,
    ttsEngine, setTTSEngine,
    speechSpeed, setSpeechSpeed,
    autoSendAfterDictation, setAutoSendAfterDictation,
    reduceMotion, setReduceMotion,
    compactMode, setCompactMode,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'general' | 'language' | 'data' | 'about'>('general');
  const [clearedSuccess, setClearedSuccess] = useState(false);

  if (!isSettingsOpen) return null;

  const handleClearHistory = async () => {
    if (window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) {
      await db.messages.clear();
      await db.sessions.clear();
      await loadSessions();
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-2xl bg-surface-raised border border-border shadow-soft overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-foreground-muted" />
            <span>Settings</span>
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Content */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Tabs Navigation */}
          <div className="w-full sm:w-44 border-b sm:border-b-0 sm:border-r border-border p-2 flex sm:flex-col gap-1 overflow-x-auto bg-background-subtle">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors whitespace-nowrap ${
                activeTab === 'general' ? 'bg-surface border-l-2 border-accent text-foreground shadow-soft' : 'text-foreground-secondary hover:bg-surface/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveTab('language')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors whitespace-nowrap ${
                activeTab === 'language' ? 'bg-surface border-l-2 border-accent text-foreground shadow-soft' : 'text-foreground-secondary hover:bg-surface/50'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              <span>Language & Voice</span>
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors whitespace-nowrap ${
                activeTab === 'data' ? 'bg-surface border-l-2 border-accent text-foreground shadow-soft' : 'text-foreground-secondary hover:bg-surface/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data & History</span>
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors whitespace-nowrap ${
                activeTab === 'about' ? 'bg-surface border-l-2 border-accent text-foreground shadow-soft' : 'text-foreground-secondary hover:bg-surface/50'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>About</span>
            </button>
          </div>

          {/* Tab Pane */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5 text-xs text-foreground custom-scrollbar">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="font-semibold block mb-2 text-foreground">Theme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['dark', 'light', 'system'] as ThemeMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setTheme(m)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 capitalize transition-all ${
                          theme === m 
                            ? 'border-accent bg-accent-soft text-accent-strong font-bold shadow-soft' 
                            : 'border-border hover:bg-background-subtle text-foreground-muted'
                        }`}
                      >
                        {m === 'dark' ? <Moon className="w-4 h-4" /> : m === 'light' ? <Sun className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                        <span>{m}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">Reduce Motion</div>
                      <div className="text-[11px] text-foreground-muted">Disable 3D tilt and ambient animations</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={reduceMotion}
                      onChange={(e) => setReduceMotion(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">Compact Mode</div>
                      <div className="text-[11px] text-foreground-muted">Denser padding in chat message bubbles</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={compactMode}
                      onChange={(e) => setCompactMode(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LANGUAGE & VOICE TAB */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                <div>
                  <label className="font-semibold block mb-1.5 text-foreground">Default Answer Language</label>
                  <select
                    value={answerLanguage}
                    onChange={(e) => setAnswerLanguage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1.5 text-foreground">Voice Dictation Locale</label>
                  <select
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-surface border border-border text-foreground text-xs focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                  >
                    {SUPPORTED_LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.nativeName} ({l.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-border space-y-3">
                  <div>
                    <label className="font-semibold block mb-1.5 text-foreground">Voice Synthesis Engine</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTTSEngine('browser')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                          ttsEngine === 'browser'
                            ? 'border-accent bg-accent-soft text-accent-strong font-bold shadow-soft'
                            : 'border-border hover:bg-background-subtle text-foreground-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Instant Voice</span>
                        </span>
                        <span className="text-[10px] text-foreground-muted font-normal">Immediate &lt;100ms, zero delay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTTSEngine('gemini')}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                          ttsEngine === 'gemini'
                            ? 'border-accent bg-accent-soft text-accent-strong font-bold shadow-soft'
                            : 'border-border hover:bg-background-subtle text-foreground-muted'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Gemini HD</span>
                        </span>
                        <span className="text-[10px] text-foreground-muted font-normal">Cloud neural synthesis</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">Read Answers Aloud</div>
                      <div className="text-[11px] text-foreground-muted">Automatically play voice synthesis for answers</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={readAloud}
                      onChange={(e) => setReadAloud(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">Auto-Send Dictation</div>
                      <div className="text-[11px] text-foreground-muted">Send immediately once silence is detected</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSendAfterDictation}
                      onChange={(e) => setAutoSendAfterDictation(e.target.checked)}
                      className="w-4 h-4 accent-primary rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between font-semibold mb-1 text-foreground">
                      <span>Speech Playback Speed</span>
                      <span className="font-mono text-accent-strong">{speechSpeed}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.25"
                      value={speechSpeed}
                      onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DATA TAB */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-background-subtle border border-border space-y-2">
                  <div className="font-semibold text-foreground">Local Storage & Privacy</div>
                  <p className="text-[11px] text-foreground-secondary leading-relaxed">
                    Conversations are stored locally on your device in IndexedDB. No handbook queries or speech recordings are persisted remotely without your authorization.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleClearHistory}
                    className="w-full py-2.5 px-4 rounded-xl bg-danger/10 hover:bg-danger/20 border border-danger/30 text-danger font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All Chat History</span>
                  </button>
                  {clearedSuccess && (
                    <div className="mt-2 text-center text-success font-medium text-xs flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>History cleared successfully</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === 'about' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-background-subtle border border-border space-y-2">
                  <div className="font-bold text-sm text-foreground">KSRCE Handbook Assistant</div>
                  <div className="text-[11px] text-foreground-secondary">
                    Production-grade multilingual, voice-enabled institutional RAG assistant.
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-foreground-muted">Chat Model:</span>
                    <span className="font-mono text-foreground">gemini-3.8-flash</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-foreground-muted">Embeddings Model:</span>
                    <span className="font-mono text-foreground">gemini-embedding-001</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-foreground-muted">TTS Model:</span>
                    <span className="font-mono text-foreground">gemini-3.8-flash-tts</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-foreground-muted">Indexed Document:</span>
                    <span className="font-semibold text-foreground">ksrce Handbook 24-25.pdf (268 pages)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
