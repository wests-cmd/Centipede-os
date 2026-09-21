import packageJson from '../package.json';

export const CENTIPEDE_VERSION = packageJson.version || '1.0.0';

/**
 * Protocol-driven Kingdom compatibility specifications.
 * Centipede OS negotiates protocol major/minor versions and capabilities
 * dynamically instead of relying on hardcoded Kingdom release version ceilings.
 */
export const KINGDOM_PROTOCOL_MAJOR = 1;
export const KINGDOM_PROTOCOL_MIN_MINOR = 0;
export const KINGDOM_PROTOCOL_MAX_MINOR = 99;

// Baseline protocol expectation string for diagnostic display
export const CENTIPEDE_SUPPORTED_KINGDOM_PROTOCOL = `v${KINGDOM_PROTOCOL_MAJOR}.${KINGDOM_PROTOCOL_MIN_MINOR}+`;
