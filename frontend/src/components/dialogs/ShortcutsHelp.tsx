import React from 'react';
import { motion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export const ShortcutsHelp: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useChatStore();

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'Enter', desc: 'Send current message' },
    { key: 'Shift + Enter', desc: 'Insert line break in composer' },
    { key: 'Esc', desc: 'Stop active stream or close modal' },
    { key: 'Ctrl + K / ⌘K', desc: 'Open Command Palette' },
    { key: '?', desc: 'Show keyboard shortcuts' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl bg-surface-raised border border-border shadow-soft p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-foreground-muted" />
            <span>Keyboard Shortcuts</span>
          </h3>
          <button
            onClick={() => setShortcutsOpen(false)}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-subtle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 text-xs">
              <span className="text-foreground-secondary">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded-lg bg-surface border border-border font-mono text-[11px] font-semibold text-foreground shadow-soft">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
