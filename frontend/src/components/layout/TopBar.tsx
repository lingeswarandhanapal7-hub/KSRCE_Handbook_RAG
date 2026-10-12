import React, { useState, useEffect } from 'react';
import { 
  PanelLeftClose, 
  PanelLeft, 
  Volume2, 
  VolumeX, 
  Settings, 
  Share2, 
  Command,
  Edit2,
  Check,
  HelpCircle
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';

interface TopBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenExport: () => void;
  handbookTitle?: string;
  handbookPages?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  isSidebarOpen,
  onToggleSidebar,
  onOpenExport,
  handbookTitle = "KSRCE Handbook 24-25",
  handbookPages = 268
}) => {
  const { 
    sessions, 
    activeSessionId, 
    renameSession, 
    setSettingsOpen, 
    setCommandPaletteOpen,
    setShortcutsOpen
  } = useChatStore();

  const { readAloud, setReadAloud } = useSettingsStore();

  const currentSession = sessions.find(s => s.id === activeSessionId);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const startEditing = () => {
    if (currentSession) {
      setEditedTitle(currentSession.title);
      setIsEditingTitle(true);
    }
  };

  const saveTitle = () => {
    if (activeSessionId && editedTitle.trim()) {
      renameSession(activeSessionId, editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className={`h-14 px-4 flex items-center justify-between gap-3 sticky top-0 z-30 transition-all ${
      isScrolled ? 'bg-background/95 border-b border-border shadow-soft' : 'bg-transparent'
    }`}>
      {/* Left: Sidebar toggle + Chat title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          className="p-2 rounded-xl text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-colors active:scale-95"
        >
          {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                autoFocus
                className="px-2 py-0.5 text-xs font-medium rounded-lg bg-surface border border-ring text-foreground focus:outline-none"
              />
              <button onClick={saveTitle} className="p-1 text-success hover:opacity-80">
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group cursor-pointer" onClick={startEditing}>
              <h1 className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                {currentSession?.title || 'KSRCE Handbook Chat'}
              </h1>
              <Edit2 className="w-3 h-3 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Handbook info badge with small brass accent dot */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-medium shadow-soft">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <span className="truncate max-w-[160px] text-foreground font-semibold">{handbookTitle}</span>
          <span className="text-foreground-muted">•</span>
          <span className="text-foreground-secondary">{handbookPages} Pages</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Command palette hint */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-colors"
          title="Open Command Palette (Ctrl+K)"
        >
          <Command className="w-3 h-3" />
          <span className="text-[11px]">⌘K</span>
        </button>

        {/* Voice read-aloud toggle */}
        <button
          onClick={() => setReadAloud(!readAloud)}
          aria-label={readAloud ? "Voice read-aloud enabled" : "Voice read-aloud disabled"}
          title={readAloud ? "Voice read-aloud: ON" : "Voice read-aloud: OFF"}
          className={`p-2 rounded-xl border transition-all active:scale-95 ${
            readAloud 
              ? 'bg-accent-soft text-accent-strong border-accent-border font-semibold' 
              : 'text-foreground-muted hover:text-foreground bg-surface border-border hover:border-border-strong'
          }`}
        >
          {readAloud ? <Volume2 className="w-4 h-4 text-accent-strong" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Language selector */}
        <LanguageSelector />

        {/* Theme toggle */}
        <ThemeToggle />

        {/* Export button */}
        <button
          onClick={onOpenExport}
          title="Export conversation"
          className="p-2 rounded-xl text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-colors active:scale-95"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Keyboard shortcuts */}
        <button
          onClick={() => setShortcutsOpen(true)}
          title="Keyboard shortcuts (?)"
          className="p-2 rounded-xl text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-colors active:scale-95 hidden sm:inline-flex"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          title="Settings"
          className="p-2 rounded-xl text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-colors active:scale-95"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
