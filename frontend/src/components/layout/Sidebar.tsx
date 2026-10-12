import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  Pin, 
  Trash2, 
  Edit3, 
  MoreVertical, 
  GraduationCap, 
  Settings, 
  X,
  PinOff
} from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { DBSession } from '../../store/db';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { 
    sessions, 
    activeSessionId, 
    switchSession, 
    createSession, 
    deleteSession, 
    pinSession, 
    renameSession,
    setSettingsOpen
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuSessionId, setActiveMenuSessionId] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Grouping sessions: Today, Yesterday, Previous 7 Days, Older
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedSessions = filteredSessions.filter(s => s.pinned);
  const unpinnedSessions = filteredSessions.filter(s => !s.pinned);

  const todaySessions = unpinnedSessions.filter(s => (now - s.updatedAt) < oneDay);
  const yesterdaySessions = unpinnedSessions.filter(s => {
    const diff = now - s.updatedAt;
    return diff >= oneDay && diff < 2 * oneDay;
  });
  const prev7DaysSessions = unpinnedSessions.filter(s => {
    const diff = now - s.updatedAt;
    return diff >= 2 * oneDay && diff < 7 * oneDay;
  });
  const olderSessions = unpinnedSessions.filter(s => (now - s.updatedAt) >= 7 * oneDay);

  const handleStartRename = (session: DBSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setRenameText(session.title);
    setActiveMenuSessionId(null);
  };

  const handleSaveRename = (sessionId: string) => {
    if (renameText.trim()) {
      renameSession(sessionId, renameText.trim());
    }
    setEditingSessionId(null);
  };

  const renderSessionItem = (session: DBSession) => {
    const isActive = session.id === activeSessionId;
    const isMenuOpen = activeMenuSessionId === session.id;
    const isEditing = editingSessionId === session.id;

    return (
      <div
        key={session.id}
        onClick={() => {
          switchSession(session.id);
          onCloseMobile();
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-150 ${
          isActive 
            ? 'bg-surface text-foreground font-medium border border-border shadow-soft before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[2px] before:bg-accent before:rounded-r' 
            : 'text-foreground-secondary hover:text-foreground hover:bg-foreground/[0.04]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {session.pinned ? (
            <Pin className="w-3.5 h-3.5 text-accent shrink-0" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-foreground-muted shrink-0 group-hover:text-foreground-secondary transition-colors" />
          )}

          {isEditing ? (
            <input
              type="text"
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(session.id)}
              onBlur={() => handleSaveRename(session.id)}
              autoFocus
              className="px-1.5 py-0.5 rounded bg-surface border border-ring text-foreground text-xs w-full focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate">{session.title}</span>
          )}
        </div>

        {/* Options Menu Trigger */}
        {!isEditing && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuSessionId(isMenuOpen ? null : session.id);
              }}
              className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-foreground/[0.06] text-foreground-muted hover:text-foreground transition-opacity"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-6 w-32 z-50 rounded-xl bg-surface-raised border border-border shadow-soft py-1 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pinSession(session.id, !session.pinned);
                      setActiveMenuSessionId(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-foreground/[0.04] text-foreground-secondary hover:text-foreground text-left"
                  >
                    {session.pinned ? <PinOff className="w-3 h-3 text-accent" /> : <Pin className="w-3 h-3 text-accent" />}
                    <span>{session.pinned ? 'Unpin' : 'Pin chat'}</span>
                  </button>

                  <button
                    onClick={(e) => handleStartRename(session, e)}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-foreground/[0.04] text-foreground-secondary hover:text-foreground text-left"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Rename</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                      setActiveMenuSessionId(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-danger/10 text-danger text-left"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-overlay backdrop-blur-sm z-40 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 bg-background-subtle border-r border-border flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:w-0 md:opacity-0 md:pointer-events-none'
        }`}
      >
        {/* Brand block */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Navy tile, ivory glyph, brass dot */}
            <div className="relative w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-soft">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                KSRCE AI
              </div>
              <div className="text-[10px] text-foreground-muted uppercase tracking-wider font-semibold">
                Handbook Assistant
              </div>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-foreground/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Chat */}
        <div className="p-3">
          <button
            onClick={() => {
              createSession();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-semibold shadow-soft transition-all duration-150 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-surface border border-border text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* History Grouped List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 custom-scrollbar">
          {pinnedSessions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider px-2 py-1 flex items-center gap-1">
                <Pin className="w-3 h-3 text-accent" /> Pinned
              </div>
              <div className="space-y-1">{pinnedSessions.map(renderSessionItem)}</div>
            </div>
          )}

          {todaySessions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider px-2 py-1">
                Today
              </div>
              <div className="space-y-1">{todaySessions.map(renderSessionItem)}</div>
            </div>
          )}

          {yesterdaySessions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider px-2 py-1">
                Yesterday
              </div>
              <div className="space-y-1">{yesterdaySessions.map(renderSessionItem)}</div>
            </div>
          )}

          {prev7DaysSessions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider px-2 py-1">
                Previous 7 Days
              </div>
              <div className="space-y-1">{prev7DaysSessions.map(renderSessionItem)}</div>
            </div>
          )}

          {olderSessions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-foreground-muted tracking-wider px-2 py-1">
                Older
              </div>
              <div className="space-y-1">{olderSessions.map(renderSessionItem)}</div>
            </div>
          )}

          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-xs text-foreground-muted">
              {searchQuery ? 'No matching chats' : 'No conversations yet'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-foreground-muted">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex items-center gap-2 hover:text-foreground py-1 px-2 rounded-lg hover:bg-foreground/[0.04] transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <span className="text-[10px] text-foreground-muted font-mono">v1.0.0</span>
        </div>
      </aside>
    </>
  );
};
