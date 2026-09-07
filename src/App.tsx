import React, { useEffect, useState } from 'react';
import { kingdomAdapter } from './api/kingdomAdapter';
import { DesktopShell } from './components/DesktopShell';
import { AppLauncher } from './components/AppLauncher';
import { KingdomStatusPanel } from './components/KingdomStatusPanel';
import { ActivityTaskView } from './components/ActivityTaskView';
import { PermissionsApprovalView } from './components/PermissionsApprovalView';
import { MobileCompanionApp } from './components/MobileCompanionApp';
import { UniversalSearch } from './components/UniversalSearch';
import { FileManager } from './components/FileManager';
import { Terminal } from './components/Terminal';
import { CentipedeAI } from './components/CentipedeAI';
import { SettingsPanel } from './components/SettingsPanel';
import { MemoryApp } from './components/MemoryApp';
import { SkillsApp } from './components/SkillsApp';
import { MapsApp } from './components/MapsApp';
import { Window } from './components/Window';
import { ApprovalRequest, ConnectionState, RuntimeStatus } from './types';
import { Brain, Cpu, Map, Server, Shield, Activity, Folder, Terminal as TermIcon, Sliders, Bot, Search, Smartphone } from 'lucide-react';

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
      case 'mobile':
        return (
          <Window id="win_mobile" title="Mobile Companion" icon={Smartphone} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <MobileCompanionApp />
          </Window>
        );
      case 'status':
        return (
          <Window id="win_status" title="Kingdom Runtime Status" icon={Server} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <KingdomStatusPanel adapter={kingdomAdapter} status={status} connectionState={connectionState} />
          </Window>
        );
      case 'ai':
        return (
          <Window id="win_ai" title="Centipede AI Pipeline" icon={Bot} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <CentipedeAI adapter={kingdomAdapter} onNavigateSecurity={() => setActiveAppId('security')} />
          </Window>
        );
      case 'memory':
        return (
          <Window id="win_memory" title="Memory Explorer" icon={Brain} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <MemoryApp />
          </Window>
        );
      case 'skills':
        return (
          <Window id="win_skills" title="Skill Manager" icon={Cpu} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <SkillsApp />
          </Window>
        );
      case 'maps':
        return (
          <Window id="win_maps" title="AI Swarm Maps" icon={Map} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <MapsApp adapter={kingdomAdapter} />
          </Window>
        );
      case 'tasks':
        return (
          <Window id="win_tasks" title="Activity & Tasks" icon={Activity} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <ActivityTaskView adapter={kingdomAdapter} />
          </Window>
        );
      case 'security':
        return (
          <Window id="win_sec" title="Permissions & Approvals" icon={Shield} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <PermissionsApprovalView adapter={kingdomAdapter} />
          </Window>
        );
      case 'search':
        return (
          <Window id="win_search" title="Universal Search" icon={Search} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <UniversalSearch adapter={kingdomAdapter} onNavigateApp={(id) => setActiveAppId(id)} />
          </Window>
        );
      case 'files':
        return (
          <Window id="win_files" title="File Explorer" icon={Folder} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <FileManager />
          </Window>
        );
      case 'terminal':
        return (
          <Window id="win_term" title="Terminal CLI" icon={TermIcon} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <Terminal adapter={kingdomAdapter} />
          </Window>
        );
      case 'settings':
        return (
          <Window id="win_set" title="System Settings" icon={Sliders} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <SettingsPanel adapter={kingdomAdapter} />
          </Window>
        );
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
