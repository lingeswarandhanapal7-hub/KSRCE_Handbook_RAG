import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, FileText, Maximize2, Minimize2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export const SourceDrawer: React.FC = () => {
  const { isDrawerOpen, activeDrawerCitation, closeCitationDrawer } = useChatStore();
  const [showEmbeddedPdf, setShowEmbeddedPdf] = useState(false);

  if (!isDrawerOpen || !activeDrawerCitation) return null;

  const pdfUrl = `/api/documents/ksrce-handbook/file#page=${activeDrawerCitation.page}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCitationDrawer}
          className="absolute inset-0 bg-overlay backdrop-blur-sm"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-screen max-w-md sm:max-w-xl bg-surface-raised border-l border-border shadow-soft flex flex-col h-full"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-accent-soft text-accent-strong border border-accent-border font-bold text-xs">
                  {activeDrawerCitation.id}
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Handbook Source Reference
                </span>
              </div>

              <button
                onClick={closeCitationDrawer}
                className="p-1.5 rounded-xl text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {/* Metadata card */}
              <div className="p-3.5 rounded-2xl bg-background-subtle border border-border space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground-muted">
                  <FileText className="w-3.5 h-3.5 text-foreground-muted" />
                  <span className="font-medium text-foreground">
                    {activeDrawerCitation.doc || 'ksrce Handbook 24-25.pdf'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                  <span className="text-foreground-muted">Section:</span>
                  <span className="font-semibold text-foreground text-right max-w-[280px] truncate">
                    {activeDrawerCitation.section || 'General'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground-muted">Handbook Page:</span>
                  <span className="font-bold text-accent font-mono text-sm">
                    Page {activeDrawerCitation.page}
                  </span>
                </div>
              </div>

              {/* Passage text */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Passage Excerpt
                </h3>
                <div className="p-4 rounded-xl bg-highlight/30 border-l-2 border-accent border-y border-r border-border text-xs leading-relaxed text-foreground whitespace-pre-wrap font-sans selection:bg-highlight">
                  {activeDrawerCitation.snippet}
                </div>
              </div>

              {/* PDF Preview Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={() => setShowEmbeddedPdf(!showEmbeddedPdf)}
                  className="w-full py-2.5 px-4 rounded-xl bg-surface hover:bg-surface-raised border border-border text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-soft"
                >
                  {showEmbeddedPdf ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{showEmbeddedPdf ? 'Hide Embedded PDF Viewer' : 'Preview Original PDF Page'}</span>
                </button>

                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-colors text-center shadow-soft"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full PDF in New Tab (#page={activeDrawerCitation.page})</span>
                </a>
              </div>

              {/* Embedded PDF iframe viewer */}
              {showEmbeddedPdf && (
                <div className="mt-4 rounded-xl overflow-hidden border border-border h-96 bg-background-subtle">
                  <iframe
                    src={pdfUrl}
                    title="Handbook PDF Page Preview"
                    className="w-full h-full"
                  />
                </div>
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </AnimatePresence>
  );
};
