export const ACCESSIBILITY_STORAGE_KEY = 'centipede_accessibility_settings';

export type AccessibilityProfileId = 'DEFAULT' | 'LOW_VISION' | 'LOW_DEXTERITY' | 'COGNITIVE_READING' | 'CUSTOM';
export type AccessibilityTextScale = 1 | 1.15 | 1.3 | 1.5;
export type AccessibilitySpeechRate = 0.65 | 0.8 | 1 | 1.15;

export interface AccessibilitySettings {
  profile: AccessibilityProfileId;
  textScale: AccessibilityTextScale;
  speechRate: AccessibilitySpeechRate;
  highContrast: boolean;
  reduceMotion: boolean;
  reduceTransparency: boolean;
  largerTargets: boolean;
}

export const ACCESSIBILITY_PROFILES: Array<{ id: AccessibilityProfileId; name: string; description: string }> = [
  { id: 'DEFAULT', name: 'Default', description: 'Use the standard Centipede display settings.' },
  { id: 'LOW_VISION', name: 'Low Vision', description: 'Larger text, stronger contrast, less transparency, and larger controls.' },
  { id: 'LOW_DEXTERITY', name: 'Low Dexterity', description: 'Larger controls and more room for keyboard focus.' },
  { id: 'COGNITIVE_READING', name: 'Cognitive and Reading Support', description: 'Slightly larger text, larger controls, and less motion.' },
  { id: 'CUSTOM', name: 'Custom', description: 'Choose each supported setting below.' },
];

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  profile: 'DEFAULT',
  textScale: 1,
  speechRate: 1,
  highContrast: false,
  reduceMotion: false,
  reduceTransparency: false,
  largerTargets: false,
};

export function createAccessibilityPreset(profile: AccessibilityProfileId): AccessibilitySettings {
  switch (profile) {
    case 'LOW_VISION':
      return { profile, textScale: 1.3, speechRate: 1, highContrast: true, reduceMotion: false, reduceTransparency: true, largerTargets: true };
    case 'LOW_DEXTERITY':
      return { profile, textScale: 1, speechRate: 1, highContrast: false, reduceMotion: false, reduceTransparency: false, largerTargets: true };
    case 'COGNITIVE_READING':
      return { profile, textScale: 1.15, speechRate: 0.8, highContrast: false, reduceMotion: true, reduceTransparency: true, largerTargets: true };
    case 'CUSTOM':
      return { ...DEFAULT_ACCESSIBILITY_SETTINGS, profile };
    case 'DEFAULT':
    default:
      return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  }
}

export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadAccessibilitySettings(storage: StoragePort): AccessibilitySettings {
  try {
    const raw = storage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
    const value = JSON.parse(raw) as Partial<AccessibilitySettings>;
    const allowedProfiles: AccessibilityProfileId[] = ['DEFAULT', 'LOW_VISION', 'LOW_DEXTERITY', 'COGNITIVE_READING', 'CUSTOM'];
    const allowedScales: AccessibilityTextScale[] = [1, 1.15, 1.3, 1.5];
    const allowedSpeechRates: AccessibilitySpeechRate[] = [0.65, 0.8, 1, 1.15];
    return {
      profile: allowedProfiles.includes(value.profile as AccessibilityProfileId) ? value.profile as AccessibilityProfileId : 'CUSTOM',
      textScale: allowedScales.includes(value.textScale as AccessibilityTextScale) ? value.textScale as AccessibilityTextScale : 1,
      speechRate: allowedSpeechRates.includes(value.speechRate as AccessibilitySpeechRate) ? value.speechRate as AccessibilitySpeechRate : 1,
      highContrast: value.highContrast === true,
      reduceMotion: value.reduceMotion === true,
      reduceTransparency: value.reduceTransparency === true,
      largerTargets: value.largerTargets === true,
    };
  } catch {
    return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  }
}

export function saveAccessibilitySettings(storage: StoragePort, settings: AccessibilitySettings): boolean {
  try {
    storage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function applyAccessibilitySettings(settings: AccessibilitySettings, root: HTMLElement): void {
  root.style.setProperty('--centipede-text-scale', `${settings.textScale * 100}%`);
  root.classList.toggle('a11y-high-contrast', settings.highContrast);
  root.classList.toggle('a11y-reduce-motion', settings.reduceMotion);
  root.classList.toggle('a11y-reduce-transparency', settings.reduceTransparency);
  root.classList.toggle('a11y-larger-targets', settings.largerTargets);
}
