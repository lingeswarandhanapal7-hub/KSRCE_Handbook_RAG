import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface FollowUpChipsProps {
  suggestions: string[];
  onSelectSuggestion: (text: string) => void;
}

export const FollowUpChips: React.FC<FollowUpChipsProps> = ({ suggestions, onSelectSuggestion }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="mt-4 pt-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground-muted mb-2">
        <Sparkles className="w-3.5 h-3.5 text-accent" />
        <span>Related Questions</span>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        {suggestions.slice(0, 3).map((item, idx) => (
          <motion.button
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, duration: 0.2 }}
            onClick={() => onSelectSuggestion(item)}
            className="group flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-border-strong text-left text-xs font-medium text-foreground-secondary hover:text-foreground transition-all active:scale-[0.98] shadow-soft"
          >
            <span className="line-clamp-2 leading-relaxed">{item}</span>
            <ArrowRight className="w-3 h-3 text-foreground-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};
