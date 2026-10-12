import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, RefreshCw } from 'lucide-react';
import { fetchHealth } from '../../lib/api';

interface SplashIntroProps {
  onComplete: () => void;
}

export const SplashIntro: React.FC<SplashIntroProps> = ({ onComplete }) => {
  const [isBuildingIndex, setIsBuildingIndex] = useState(false);
  const [indexStats, setIndexStats] = useState<any>(null);

  useEffect(() => {
    let timer = setTimeout(() => {
      // Check health
      fetchHealth()
        .then((health) => {
          if (health.indexing) {
            setIsBuildingIndex(true);
            setIndexStats(health.index);
          } else {
            onComplete();
          }
        })
        .catch(() => {
          onComplete();
        });
    }, 700);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Poll if building index
  useEffect(() => {
    if (!isBuildingIndex) return;

    const interval = setInterval(async () => {
      try {
        const health = await fetchHealth();
        setIndexStats(health.index);
        if (!health.indexing) {
          setIsBuildingIndex(false);
          onComplete();
        }
      } catch {}
    }, 3000);

    return () => clearInterval(interval);
  }, [isBuildingIndex, onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6 text-center select-none">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        {/* Institutional Logo Mark: Navy tile, ivory glyph, small brass dot */}
        <div className="relative w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-soft mb-4 border border-border">
          <GraduationCap className="w-8 h-8 text-primary-foreground" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-accent" />
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-foreground">
          KSRCE Handbook Assistant
        </h1>
        <p className="text-xs text-foreground-muted mt-1.5 font-medium">Autonomous Multilingual AI Intelligence</p>

        {isBuildingIndex && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 rounded-xl bg-surface-raised border border-border max-w-sm flex flex-col items-center gap-2 shadow-soft"
          >
            <RefreshCw className="w-5 h-5 text-accent animate-spin" />
            <div className="text-xs font-semibold text-foreground">
              Building Handbook Vector Index...
            </div>
            <div className="text-[11px] text-foreground-muted">
              {indexStats
                ? `Indexed ${indexStats.chunks || 0} chunks across ${indexStats.pages || 0} pages.`
                : 'Processing institutional handbook PDF pages...'}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
