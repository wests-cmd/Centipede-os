import React, { useEffect, useState } from 'react';
import { kingdomAdapter } from './api/kingdomAdapter';
import { DesktopShell } from './components/DesktopShell';
import { AppLauncher } from './components/AppLauncher';
import { Window } from './components/Window';
import { applyAccessibilitySettings, DEFAULT_ACCESSIBILITY_SETTINGS, loadAccessibilitySettings } from './platform/accessibility';
import { FirstRunWizard } from './components/FirstRunWizard';
import { AppUpdateManager } from './components/AppUpdateManager';
import { HOME_VISUALS, HomeVisual } from './components/CentipedeWorldVisual';
import { ApprovalRequest, ConnectionState, RuntimeStatus } from './types';
import { CENTIPEDE_VERSION } from './version';
import { Brain, Cpu, Map, Server, Shield, Activity, Folder, Terminal as TermIcon, Sliders, Bot, Search, Smartphone, Grid, ShieldAlert, BarChart3 } from 'lucide-react';

// Only the desktop shell and launcher load at startup. Other apps load when opened.
const PerceptionPanel = React.lazy(() => import('./components/PerceptionPanel').then((module) => ({ default: module.PerceptionPanel })));
const KingdomStatusPanel = React.lazy(() => import('./components/KingdomStatusPanel').then((module) => ({ default: module.KingdomStatusPanel })));
const ActivityTaskView = React.lazy(() => import('./components/ActivityTaskView').then((module) => ({ default: module.ActivityTaskView })));
const PermissionsApprovalView = React.lazy(() => import('./components/PermissionsApprovalView').then((module) => ({ default: module.PermissionsApprovalView })));
const MobileCompanionApp = React.lazy(() => import('./components/MobileCompanionApp').then((module) => ({ default: module.MobileCompanionApp })));
const WorkspaceApp = React.lazy(() => import('./components/WorkspaceApp').then((module) => ({ default: module.WorkspaceApp })));
const AgentControlApp = React.lazy(() => import('./components/AgentControlApp').then((module) => ({ default: module.AgentControlApp })));
const UniversalSearch = React.lazy(() => import('./components/UniversalSearch').then((module) => ({ default: module.UniversalSearch })));
const FileManager = React.lazy(() => import('./components/FileManager').then((module) => ({ default: module.FileManager })));
const Terminal = React.lazy(() => import('./components/Terminal').then((module) => ({ default: module.Terminal })));
const CentipedeAI = React.lazy(() => import('./components/CentipedeAI').then((module) => ({ default: module.CentipedeAI })));
const SettingsPanel = React.lazy(() => import('./components/SettingsPanel').then((module) => ({ default: module.SettingsPanel })));
const MemoryApp = React.lazy(() => import('./components/MemoryApp').then((module) => ({ default: module.MemoryApp })));
const SkillsApp = React.lazy(() => import('./components/SkillsApp').then((module) => ({ default: module.SkillsApp })));
const DoctorApp = React.lazy(() => import('./components/DoctorApp').then((module) => ({ default: module.DoctorApp })));
const MapsApp = React.lazy(() => import('./components/MapsApp').then((module) => ({ default: module.MapsApp })));
const SystemCommandCenter = React.lazy(() => import('./components/SystemCommandCenter').then((module) => ({ default: module.SystemCommandCenter })));

export const App: React.FC = () => {
  const [activeAppId, setActiveAppId] = useState<string>('launcher');
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [approvalsVerified, setApprovalsVerified] = useState(false);
  const [homeVisual, setHomeVisual] = useState<HomeVisual>(() => {
    try {
      const saved = window.localStorage.getItem('centipede_home_visual');
      return HOME_VISUALS.some((profile) => profile.id === saved) ? (saved as HomeVisual) : 'centipede-art';
    } catch {
      return 'centipede-art';
    }
  });

  const changeHomeVisual = (visual: HomeVisual) => {
    setHomeVisual(visual);
    try {
      window.localStorage.setItem('centipede_home_visual', visual);
    } catch {
      // The visual remains usable for this session when storage is unavailable.
    }
  };
  const [isFirstRunCompleted, setIsFirstRunCompleted] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('centipede_first_run_completed') === 'true';
    }
    return true;
  });

  useEffect(() => {
    try {
      const accessibility = typeof window !== 'undefined'
        ? loadAccessibilitySettings(window.localStorage)
        : DEFAULT_ACCESSIBILITY_SETTINGS;
      applyAccessibilitySettings(accessibility, document.documentElement);
    } catch {
      applyAccessibilitySettings(DEFAULT_ACCESSIBILITY_SETTINGS, document.documentElement);
    }

    const unsubConn = kingdomAdapter.subscribeConnection(setConnectionState);
    const unsubStatus = kingdomAdapter.subscribeStatus(setStatus);

    const checkApprovals = async () => {
      try {
        const approvals = await kingdomAdapter.list_approvals('pending');
        if (!Array.isArray(approvals)) throw new Error('Approval list was invalid');
        setPendingApprovalsCount(approvals.length);
        setApprovalsVerified(true);
      } catch (e) {
        setPendingApprovalsCount(0);
        setApprovalsVerified(false);
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
            approvalsVerified={approvalsVerified}
            connectionState={connectionState}
            homeVisual={homeVisual}
          />
        );
      case 'command':
        return <Window id="win_command" title="System Command Center" icon={BarChart3} isOpen={true} onClose={() => setActiveAppId('launcher')}>
          <SystemCommandCenter adapter={kingdomAdapter} onNavigate={setActiveAppId} />
        </Window>;
      case 'perception':
        return <Window id="win_perception" title="Camera, screen and microphone" icon={Bot} isOpen={true} onClose={() => setActiveAppId('launcher')}><PerceptionPanel /></Window>;
      case 'agent_control':
        return (
          <Window id="win_agent_control" title="Agent Control Plane & Security" icon={ShieldAlert} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <AgentControlApp />
          </Window>
        );
      case 'workspace':
        return (
          <Window id="win_workspace" title="Universal Digital Workspace & Workflows" icon={Grid} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <WorkspaceApp />
          </Window>
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
          <Window id="win_ai" title="Segmentor — Kingdom Tasks" icon={Bot} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <CentipedeAI adapter={kingdomAdapter} onNavigateSecurity={() => setActiveAppId('security')} />
          </Window>
        );
      case 'memory':
        return (
          <Window id="win_memory" title="Memory Explorer" icon={Brain} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <MemoryApp adapter={kingdomAdapter} />
          </Window>
        );
      case 'skills':
        return (
          <Window id="win_skills" title="Skill Manager" icon={Cpu} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <SkillsApp adapter={kingdomAdapter} />
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
          <SettingsPanel adapter={kingdomAdapter} homeVisual={homeVisual} onHomeVisualChange={changeHomeVisual} />
          </Window>
        );
      case 'doctor':
        return (
          <Window id="win_doctor" title="Centipede Doctor & Repair" icon={ShieldAlert} isOpen={true} onClose={() => setActiveAppId('launcher')}>
            <DoctorApp adapter={kingdomAdapter} connectionState={connectionState} runtimeStatus={status} />
          </Window>
        );
      default:
        return (
          <AppLauncher
            onOpenApp={(id) => setActiveAppId(id)}
            activeAppId={activeAppId}
            pendingApprovalsCount={pendingApprovalsCount}
            approvalsVerified={approvalsVerified}
            connectionState={connectionState}
            homeVisual={homeVisual}
          />
        );
    }
  };

  if (!isFirstRunCompleted) {
    return (
      <FirstRunWizard onComplete={() => {
        setIsFirstRunCompleted(true);
        try {
          const showAccessibility = localStorage.getItem('centipede_accessibility_setup_requested') === 'true';
          localStorage.removeItem('centipede_accessibility_setup_requested');
          if (showAccessibility) setActiveAppId('settings');
        } catch {
          // The optional accessibility setup offer may be skipped when storage is unavailable.
        }
      }} />
    );
  }

  return (
    <DesktopShell
      adapter={kingdomAdapter}
      activeAppId={activeAppId}
      setActiveAppId={setActiveAppId}
      pendingApprovalsCount={pendingApprovalsCount}
    >
      <AppUpdateManager currentVersion={CENTIPEDE_VERSION} />
      <React.Suspense fallback={<div role="status" className="p-6 text-sm text-slate-300">Opening app…</div>}>
        {renderActiveView()}
      </React.Suspense>
    </DesktopShell>
  );
};

export default App;
