import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, BookOpen, PenLine, Sparkles } from 'lucide-react';
import { StageInfo } from '../../store/chatStore';

interface StageStatusProps {
  stageInfo: StageInfo;
}

export const StageStatus: React.FC<StageStatusProps> = ({ stageInfo }) => {
  const getStageIcon = () => {
    switch (stageInfo.stage) {
      case 'understanding':
        return <Brain className="w-4 h-4 text-foreground-muted animate-pulse" />;
      case 'searching':
        return <Search className="w-4 h-4 text-foreground-muted animate-spin" />;
      case 'reading':
        return <BookOpen className="w-4 h-4 text-foreground-muted animate-pulse" />;
      case 'writing':
        return <PenLine className="w-4 h-4 text-foreground-muted animate-pulse" />;
      default:
        return <Sparkles className="w-4 h-4 text-accent" />;
    }
  };

  const getStageTitle = () => {
    switch (stageInfo.stage) {
      case 'understanding': return 'Analyzing question intent...';
      case 'searching': return 'Searching handbook index...';
      case 'reading': 
        return stageInfo.pages && stageInfo.pages.length > 0
          ? `Reading pages ${stageInfo.pages.join(', ')}...`
          : 'Reading relevant handbook sections...';
      case 'writing': return 'Formulating grounded response...';
      default: return stageInfo.message || 'Processing...';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-background-subtle border border-border shadow-soft max-w-md my-2"
    >
      <div className="p-1.5 rounded-lg bg-surface border border-border shrink-0">
        {getStageIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-foreground-muted tracking-wide">
            {getStageTitle()}
          </span>
        </div>
        {stageInfo.message && stageInfo.message !== getStageTitle() && (
          <p className="text-[11px] text-foreground-muted/80 truncate mt-0.5 pl-3.5">
            {stageInfo.message}
          </p>
        )}
      </div>

      {/* Neutral Shimmer loading bar */}
      <div className="w-12 h-1.5 rounded-full bg-surface border border-border overflow-hidden shrink-0">
        <motion.div
          className="h-full bg-border-strong rounded-full w-6"
          animate={{ x: [-24, 48] }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
};
