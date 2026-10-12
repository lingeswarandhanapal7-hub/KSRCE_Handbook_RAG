import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useSettingsStore } from '../../store/settingsStore';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useSettingsStore();

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4 text-foreground" />;
      case 'system':
        return <Laptop className="w-4 h-4 text-foreground-secondary" />;
      case 'dark':
      default:
        return <Moon className="w-4 h-4 text-foreground" />;
    }
  };

  const getLabel = () => {
    switch (theme) {
      case 'light': return 'Light mode';
      case 'system': return 'System theme';
      case 'dark': return 'Dark mode';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      aria-label={`Current theme: ${getLabel()}. Click to change.`}
      title={`Theme: ${getLabel()}`}
      className="relative p-2 rounded-xl text-foreground-muted hover:text-foreground bg-surface border border-border hover:border-border-strong transition-all duration-150 active:scale-95 focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ y: -8, opacity: 0, rotate: -40, scale: 0.8 }}
          animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
          exit={{ y: 8, opacity: 0, rotate: 40, scale: 0.8 }}
          transition={{ duration: 0.2 }}
        >
          {getIcon()}
        </motion.div>
      </AnimatePresence>
    </button>
  );
};
