import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, Search, Mic, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../../store/settingsStore';

export interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  stt: boolean;
  tts: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  { code: 'auto', name: 'Auto-detect', nativeName: 'தானியங்கி / स्वतः', script: 'Mixed', stt: true, tts: true },
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', script: 'Latin', stt: true, tts: true },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil', stt: true, tts: true },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari', stt: true, tts: true },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu', stt: true, tts: true },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam', stt: true, tts: true },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada', stt: true, tts: true },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali', stt: true, tts: true },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari', stt: true, tts: true },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati', stt: true, tts: true },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi', stt: true, tts: true },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', script: 'Nastaliq', stt: true, tts: true },
  { code: 'or-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia', stt: true, tts: true },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const { answerLanguage, setAnswerLanguage, uiLanguage, setUILanguage } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === answerLanguage) ||
    SUPPORTED_LANGUAGES.find(l => l.code === uiLanguage) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (lang: LanguageItem) => {
    setAnswerLanguage(lang.code);
    if (lang.code !== 'auto') {
      setUILanguage(lang.code);
      const shortCode = lang.code.split('-')[0];
      i18n.changeLanguage(shortCode);
    }
    setIsOpen(false);
  };

  const filtered = SUPPORTED_LANGUAGES.filter(
    l => l.name.toLowerCase().includes(search.toLowerCase()) ||
         l.nativeName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select answer and interface language"
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-border-strong text-foreground text-xs font-medium shadow-soft transition-all duration-150 active:scale-95"
      >
        <Globe className="w-3.5 h-3.5 text-accent" />
        <span className="font-semibold text-foreground">{currentLang.nativeName}</span>
        <span className="text-foreground-muted hidden sm:inline">({currentLang.name})</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute right-0 mt-2 w-72 max-h-96 z-50 rounded-2xl bg-surface-raised border border-border shadow-soft p-2 flex flex-col overflow-hidden"
          >
            {/* Search input */}
            <div className="relative mb-2 px-1">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-foreground-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages..."
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-72 space-y-1 pr-1 custom-scrollbar">
              {filtered.map((lang) => {
                const isSelected = answerLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-accent-soft text-accent-strong font-medium border border-accent-border'
                        : 'text-foreground hover:bg-foreground/[0.04]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm">{lang.nativeName}</span>
                      <span className="text-[11px] text-foreground-muted">{lang.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-foreground-muted" title="STT & TTS supported">
                        {lang.stt && <Mic className="w-3 h-3 text-foreground-muted" />}
                        {lang.tts && <Volume2 className="w-3 h-3 text-foreground-muted" />}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-accent-strong" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
