import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { DBCitation } from '../../store/db';
import { useChatStore } from '../../store/chatStore';

interface SourcesBarProps {
  sources: DBCitation[];
}

export const SourcesBar: React.FC<SourcesBarProps> = ({ sources }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { openCitationDrawer } = useChatStore();

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-2 border-t border-border">
      {/* Header / Toggle */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs font-semibold text-foreground-secondary hover:text-foreground transition-colors py-1"
        >
          <BookOpen className="w-3.5 h-3.5 text-accent" />
          <span>Verified Sources ({sources.length})</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-foreground-muted" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-foreground-muted" />
          )}
        </button>

        <span className="text-[10px] text-foreground-muted">
          Click source for handbook preview
        </span>
      </div>

      {/* Pill Row (always visible) */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {sources.map((src) => (
          <button
            key={src.id}
            onClick={() => openCitationDrawer(src)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-accent-soft hover:bg-accent-soft/80 border border-accent-border hover:border-accent text-[11px] font-medium text-accent-strong transition-all active:scale-95 shadow-soft"
          >
            <span className="font-bold">[{src.id}]</span>
            <span className="text-foreground-secondary font-mono">Page {src.page}</span>
          </button>
        ))}
      </div>

      {/* Expanded Cards View */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {sources.map((src) => (
              <div
                key={src.id}
                onClick={() => openCitationDrawer(src)}
                className="group p-2.5 rounded-xl bg-surface hover:bg-surface-raised border border-border hover:border-border-strong cursor-pointer transition-all shadow-soft"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-accent-soft text-accent-strong border border-accent-border font-bold text-[10px]">
                      {src.id}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {src.section || 'Handbook Section'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-background-subtle border border-border text-foreground-muted">
                      Page {src.page}
                    </span>
                    <ExternalLink className="w-3 h-3 text-foreground-muted group-hover:text-accent transition-colors" />
                  </div>
                </div>

                <p className="text-xs text-foreground-secondary line-clamp-2 italic leading-relaxed pl-2.5 border-l-2 border-border group-hover:border-accent transition-colors">
                  "{src.snippet}"
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
