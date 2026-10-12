import React, { useEffect } from 'react';
import { Command } from 'cmdk';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Globe, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Settings, 
  X
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { SUPPORTED_LANGUAGES } from '../layout/LanguageSelector';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setCommandPaletteOpen, 
    sessions, 
    switchSession, 
    createSession, 
    setSettingsOpen 
  } = useChatStore();

  const { 
    theme, 
    setTheme, 
    readAloud, 
    setReadAloud, 
    setAnswerLanguage 
  } = useSettingsStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-overlay backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-surface-raised border border-border shadow-soft overflow-hidden p-2">
        <Command className="w-full">
          <div className="flex items-center px-3 py-2 border-b border-border gap-2">
            <Search className="w-4 h-4 text-foreground-muted shrink-0" />
            <Command.Input
              placeholder="Type a command or search chats..."
              className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-foreground-muted focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => setCommandPaletteOpen(false)}
              className="p-1 rounded-lg text-foreground-muted hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2 space-y-2 text-xs custom-scrollbar">
            <Command.Empty className="py-6 text-center text-xs text-foreground-muted">
              No results found.
            </Command.Empty>

            {/* General Actions */}
            <Command.Group heading="Actions" className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider px-2 py-1">
              <Command.Item
                onSelect={() => {
                  createSession();
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-background-subtle data-[selected='true']:bg-background-subtle border-l-2 border-transparent data-[selected='true']:border-accent hover:border-accent cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 text-foreground-muted" />
                <span>New Conversation</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-background-subtle data-[selected='true']:bg-background-subtle border-l-2 border-transparent data-[selected='true']:border-accent hover:border-accent cursor-pointer transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-foreground-muted" /> : <Moon className="w-4 h-4 text-foreground-muted" />}
                <span>Toggle Theme ({theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'})</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setReadAloud(!readAloud);
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-background-subtle data-[selected='true']:bg-background-subtle border-l-2 border-transparent data-[selected='true']:border-accent hover:border-accent cursor-pointer transition-colors"
              >
                {readAloud ? <VolumeX className="w-4 h-4 text-foreground-muted" /> : <Volume2 className="w-4 h-4 text-foreground-muted" />}
                <span>Toggle Read Aloud ({readAloud ? 'Turn Off' : 'Turn On'})</span>
              </Command.Item>

              <Command.Item
                onSelect={() => {
                  setSettingsOpen(true);
                  setCommandPaletteOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-background-subtle data-[selected='true']:bg-background-subtle border-l-2 border-transparent data-[selected='true']:border-accent hover:border-accent cursor-pointer transition-colors"
              >
                <Settings className="w-4 h-4 text-foreground-muted" />
                <span>Open Settings</span>
              </Command.Item>
            </Command.Group>

            {/* Recent Conversations */}
            {sessions.length > 0 && (
              <Command.Group heading="Recent Chats" className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider px-2 py-1">
                {sessions.slice(0, 5).map((session) => (
                  <Command.Item
                    key={session.id}
                    onSelect={() => {
                      switchSession(session.id);
                      setCommandPaletteOpen(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-foreground hover:bg-background-subtle data-[selected='true']:bg-background-subtle border-l-2 border-transparent data-[selected='true']:border-accent hover:border-accent cursor-pointer transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-foreground-muted" />
                    <span className="truncate">{session.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Language Selection */}
            <Command.Group heading="Switch Language" className="text-[11px] font-semibold text-foreground-muted uppercase tracking-wider px-2 py-1">
              {SUPPORTED_LANGUAGES.slice(0, 6).map((lang) => (
                <Command.Item
                  key={lang.code}
                  onSelect={() => {
                    setAnswerLanguage(lang.code);
                    setCommandPaletteOpen(false);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-foreground hover:bg-background-subtle data-[selected='true']:bg-background-subtle border-l-2 border-transparent data-[selected='true']:border-accent hover:border-accent cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-foreground-muted" />
                    <span>{lang.nativeName}</span>
                  </div>
                  <span className="text-[10px] text-foreground-muted">{lang.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
