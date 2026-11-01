import { ConnectionState, RuntimeStatus, VersionCompatibilityStatus } from '../types';

export type DoctorStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT CONFIGURED';

export interface DoctorCheck {
  id: string;
  label: string;
  status: DoctorStatus;
  summary: string;
  detail: string;
  suggestedAction: string;
}

export interface DoctorSnapshotInput {
  networkOnline: boolean | null;
  kingdomConnection: ConnectionState;
  kingdomRuntime: RuntimeStatus | null;
  kingdomCompatibility: VersionCompatibilityStatus;
  modelEndpointResponded: boolean | null;
}

export function buildDoctorChecks(input: DoctorSnapshotInput): DoctorCheck[] {
  const kingdomConnected = input.kingdomConnection === 'CONNECTED';

  let compatibilityStatus: DoctorStatus = 'WARNING';
  let compatibilitySummary = `Compatibility is ${input.kingdomCompatibility.toLowerCase().replace(/_/g, ' ')}.`;
  let compatibilityAction = 'Reconnect to Kingdom and review the compatibility details in Kingdom Runtime Status.';
  if (input.kingdomCompatibility === 'COMPATIBLE') {
    compatibilityStatus = 'PASS';
    compatibilitySummary = 'The current compatibility check reports a compatible Kingdom contract.';
    compatibilityAction = 'No action required.';
  } else if (input.kingdomCompatibility === 'INCOMPATIBLE_PROTOCOL' || input.kingdomCompatibility === 'UNSUPPORTED' || input.kingdomCompatibility === 'CONTRACT_MISMATCH' || input.kingdomCompatibility === 'AUTHENTICATION_FAILED') {
    compatibilityStatus = 'FAIL';
    compatibilitySummary = input.kingdomCompatibility === 'AUTHENTICATION_FAILED'
      ? 'Kingdom rejected the current authentication.'
      : 'The current Kingdom contract is incompatible with this Centipede build.';
    compatibilityAction = input.kingdomCompatibility === 'AUTHENTICATION_FAILED'
      ? 'Review the Kingdom credentials and authorization configuration, then reconnect.'
      : 'Use a supported Kingdom version and review its compatibility contract before reconnecting.';
  }

  const runtimeCheck: DoctorCheck = !kingdomConnected
    ? {
        id: 'kingdom-runtime', label: 'Kingdom runtime', status: 'WARNING',
        summary: `Kingdom connection is ${input.kingdomConnection.toLowerCase().replace(/_/g, ' ')}.`,
        detail: 'No live runtime status is available while Kingdom is disconnected.',
        suggestedAction: 'Check the configured Kingdom address and reconnect. This diagnostic does not change the endpoint.',
      }
    : !input.kingdomRuntime
    ? {
        id: 'kingdom-runtime', label: 'Kingdom runtime', status: 'WARNING',
        summary: 'Kingdom is connected, but runtime status has not been received.',
        detail: 'A successful connection alone does not prove the execution runtime is running.',
        suggestedAction: 'Refresh the checks or inspect Kingdom Runtime Status.',
      }
    : input.kingdomRuntime.running
    ? {
        id: 'kingdom-runtime', label: 'Kingdom runtime', status: 'PASS',
        summary: 'Kingdom reports that its runtime is running.',
        detail: `Reported mode: ${input.kingdomRuntime.mode}; version: ${input.kingdomRuntime.version}.`,
        suggestedAction: 'No action required.',
      }
    : {
        id: 'kingdom-runtime', label: 'Kingdom runtime', status: 'WARNING',
        summary: 'Kingdom responded and reports that its runtime is stopped.',
        detail: `Reported mode: ${input.kingdomRuntime.mode}; version: ${input.kingdomRuntime.version}.`,
        suggestedAction: 'Start the runtime from Kingdom Runtime Status if you need to execute tasks.',
      };

  return [
    {
      id: 'centipede-app', label: 'Centipede app', status: 'PASS',
      summary: 'Centipede is running in this browser session.',
      detail: 'This confirms the app loaded; it is not an operating-system integrity check.',
      suggestedAction: 'No action required.',
    },
    {
      id: 'network', label: 'Browser network',
      status: input.networkOnline === null ? 'NOT CONFIGURED' : input.networkOnline ? 'PASS' : 'WARNING',
      summary: input.networkOnline === null
        ? 'Browser network state is unavailable.'
        : input.networkOnline
        ? 'The browser reports that it is online.'
        : 'The browser reports that it is offline.',
      detail: 'The browser online flag does not verify DNS, Internet reachability, or access to a particular service.',
      suggestedAction: input.networkOnline ? 'No action required.' : 'Check Wi-Fi or Ethernet, then refresh the checks.',
    },
    {
      id: 'kingdom-connection', label: 'Kingdom connection',
      status: kingdomConnected ? 'PASS' : 'WARNING',
      summary: kingdomConnected ? 'Connected to Kingdom.' : `Kingdom is ${input.kingdomConnection.toLowerCase().replace(/_/g, ' ')}.`,
      detail: 'This reflects the live connection state reported by the Kingdom adapter.',
      suggestedAction: kingdomConnected ? 'No action required.' : 'Check the Kingdom service and configured connection address.',
    },
    {
      id: 'kingdom-compatibility', label: 'Kingdom compatibility', status: compatibilityStatus,
      summary: compatibilitySummary,
      detail: `Compatibility state: ${input.kingdomCompatibility}.`,
      suggestedAction: compatibilityAction,
    },
    runtimeCheck,
    {
      id: 'model-endpoint', label: 'Model catalog endpoint',
      status: input.modelEndpointResponded === null ? 'NOT CONFIGURED' : input.modelEndpointResponded ? 'PASS' : 'WARNING',
      summary: input.modelEndpointResponded === null
        ? 'Model endpoint was not checked.'
        : input.modelEndpointResponded
        ? 'Kingdom returned a response from its model catalog endpoint.'
        : 'The model catalog endpoint did not respond successfully.',
      detail: 'An endpoint response does not prove a model is installed or that inference succeeds.',
      suggestedAction: input.modelEndpointResponded ? 'No action required.' : 'Reconnect to Kingdom and check model service configuration.',
    },
    {
      id: 'host-storage', label: 'Host storage', status: 'NOT CONFIGURED',
      summary: 'Host disk usage is not available to this browser app.',
      detail: 'Browser storage quota is not physical disk capacity. No free-space or disk-pressure claim is made.',
      suggestedAction: 'Use the host operating system storage settings to check free space.',
    },
    {
      id: 'host-resources', label: 'Host resource telemetry', status: 'NOT CONFIGURED',
      summary: 'Centipede cannot verify full host CPU, memory, GPU, battery, or temperature health from this page.',
      detail: 'Browser-reported CPU and memory hints are not a complete hardware or thermal diagnostic.',
      suggestedAction: 'Use the host operating system hardware and power tools for current measurements.',
    },
    {
      id: 'docker', label: 'Docker', status: 'NOT CONFIGURED',
      summary: 'Docker availability is not probed by this browser app.',
      detail: 'Centipede does not mount or inspect a host Docker socket from this page.',
      suggestedAction: 'Check Docker Desktop or the host Docker service directly if you use Docker.',
    },
    {
      id: 'updates', label: 'System updates', status: 'NOT CONFIGURED',
      summary: 'Centipede does not currently install or roll back system updates.',
      detail: 'Release artifact checksums are not an installed-system update service.',
      suggestedAction: 'Review the release notes and use the documented manual install process.',
    },
    {
      id: 'recovery', label: 'Recovery', status: 'NOT CONFIGURED',
      summary: 'A system recovery or rollback mode is not available in this build.',
      detail: 'No recovery boot path or known-good system rollback was exercised.',
      suggestedAction: 'Back up important files using the host operating system before changing system media.',
    },
  ];
}
