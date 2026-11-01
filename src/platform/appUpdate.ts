export type AppUpdateKind = 'small' | 'large';
type Semver = [number, number, number];

function parseVersion(version: string): Semver | null {
  const match = version.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return parts.every(Number.isSafeInteger) ? parts as Semver : null;
}

function compareVersion(left: Semver, right: Semver): number {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  }
  return 0;
}

/** Classify only valid forward updates. Same major/minor patch updates can auto-refresh the web client. */
export function classifyAppUpdate(installedVersion: string, availableVersion: string): AppUpdateKind | null {
  const installed = parseVersion(installedVersion);
  const available = parseVersion(availableVersion);
  if (!installed || !available || compareVersion(available, installed) <= 0) return null;
  return installed[0] === available[0] && installed[1] === available[1] ? 'small' : 'large';
}

export function appVersionAtLeast(actualVersion: string, expectedVersion: string): boolean {
  const actual = parseVersion(actualVersion);
  const expected = parseVersion(expectedVersion);
  return Boolean(actual && expected && compareVersion(actual, expected) >= 0);
}
