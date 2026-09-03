import React, { useEffect, useState } from 'react';
import { kingdomAdapter } from './api/kingdomAdapter';
import { DesktopShell } from './components/DesktopShell';
import { AppLauncher } from './components/AppLauncher';
import { KingdomStatusPanel } from './components/KingdomStatusPanel';
import { ActivityTaskView } from './components/ActivityTaskView';
import { PermissionsApprovalView } from './components/PermissionsApprovalView';
import { UniversalSearch } from './components/UniversalSearch';
import { FileManager } from './components/FileManager';
import { Terminal } from './components/Terminal';
import { CentipedeAI } from './components/CentipedeAI';
import { SettingsPanel } from './components/SettingsPanel';
import { ApprovalRequest, ConnectionState, RuntimeStatus } from './types';

export const App: React.FC = () => {
  const [activeAppId, setActiveAppId] = useState<string>('launcher');
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('offline');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  useEffect(() => {
    const unsubConn = kingdomAdapter.subscribeConnection(setConnectionState);
    const unsubStatus = kingdomAdapter.subscribeStatus(setStatus);

    const checkApprovals = async () => {
      try {
        const approvals = await kingdomAdapter.list_approvals('pending');
        setPendingApprovalsCount(approvals.length);
      } catch (e) {
        setPendingApprovalsCount(0);
      }
    };

    checkApprovals();
    const timer = setInterval(checkApprovals, 3000);

    return () => {
      unsubConn();
      unsubStatus();
      clearInterval(timer);
    };
  }, []);

  const renderActiveView = () => {
    switch (activeAppId) {
      case 'launcher':
        return (
          <AppLauncher
            onOpenApp={(id) => setActiveAppId(id)}
            activeAppId={activeAppId}
            pendingApprovalsCount={pendingApprovalsCount}
          />
        );
      case 'status':
        return (
          <KingdomStatusPanel
            adapter={kingdomAdapter}
            status={status}
            connectionState={connectionState}
          />
        );
      case 'ai':
        return (
          <CentipedeAI
            adapter={kingdomAdapter}
            onNavigateSecurity={() => setActiveAppId('security')}
          />
        );
      case 'tasks':
        return <ActivityTaskView adapter={kingdomAdapter} />;
      case 'security':
        return <PermissionsApprovalView adapter={kingdomAdapter} />;
      case 'search':
        return <UniversalSearch adapter={kingdomAdapter} onNavigateApp={(id) => setActiveAppId(id)} />;
      case 'files':
        return <FileManager />;
      case 'terminal':
        return <Terminal adapter={kingdomAdapter} />;
      case 'settings':
        return <SettingsPanel adapter={kingdomAdapter} />;
      default:
        return (
          <AppLauncher
            onOpenApp={(id) => setActiveAppId(id)}
            activeAppId={activeAppId}
            pendingApprovalsCount={pendingApprovalsCount}
          />
        );
    }
  };

  return (
    <DesktopShell
      adapter={kingdomAdapter}
      activeAppId={activeAppId}
      setActiveAppId={setActiveAppId}
      pendingApprovalsCount={pendingApprovalsCount}
    >
      {renderActiveView()}
    </DesktopShell>
  );
};

export default App;
