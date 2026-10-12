import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MessageList } from '../chat/MessageList';
import { Composer } from '../composer/Composer';
import { SourceDrawer } from '../chat/SourceDrawer';
import { VoiceModeOverlay } from '../voice/VoiceModeOverlay';
import { SettingsModal } from '../dialogs/SettingsModal';
import { CommandPalette } from '../dialogs/CommandPalette';
import { ShortcutsHelp } from '../dialogs/ShortcutsHelp';
import { FeedbackDialog } from '../dialogs/FeedbackDialog';
import { ExportDialog } from '../dialogs/ExportDialog';
import { useChatStore } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';

export const AppShell: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { loadSessions, sendMessage, activeSessionId } = useChatStore();
  const { reduceMotion } = useSettingsStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSelectSuggestion = (text: string) => {
    sendMessage(text);
  };

  const handleEditResend = (newText: string) => {
    sendMessage(newText);
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-background text-foreground">

      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace */}
      <div className="relative flex flex-col flex-1 h-full min-w-0 z-10">
        <TopBar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenExport={() => setIsExportOpen(true)}
        />

        {/* Message Stream Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <MessageList
            onSelectSuggestion={handleSelectSuggestion}
            onEditResend={handleEditResend}
          />

          {/* Floating Composer */}
          <Composer />
        </main>
      </div>

      {/* Slide-over Source Drawer */}
      <SourceDrawer />

      {/* Full-Screen Voice Mode Overlay */}
      <VoiceModeOverlay />

      {/* Modals & Dialogs */}
      <SettingsModal />
      <CommandPalette />
      <ShortcutsHelp />
      <FeedbackDialog />
      <ExportDialog isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
    </div>
  );
};
