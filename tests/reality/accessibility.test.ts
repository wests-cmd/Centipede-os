import { describe, expect, it } from 'vitest';
import {
  ACCESSIBILITY_STORAGE_KEY,
  AccessibilitySettings,
  applyAccessibilitySettings,
  createAccessibilityPreset,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from '../../src/platform/accessibility';
import { redactSpeechSecrets } from '../../src/ai/accessibilitySpeech';

describe('Accessibility settings', () => {
  it('provides usable presets without assuming a profile describes the user', () => {
    const lowVision = createAccessibilityPreset('LOW_VISION');
    expect(lowVision.textScale).toBe(1.3);
    expect(lowVision.highContrast).toBe(true);
    expect(lowVision.largerTargets).toBe(true);

    const custom = createAccessibilityPreset('CUSTOM');
    expect(custom.profile).toBe('CUSTOM');
    expect(custom.textScale).toBe(1);
  });

  it('persists and restores settings in the provided browser storage', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
    };
    const settings: AccessibilitySettings = {
      ...createAccessibilityPreset('LOW_DEXTERITY'),
      textScale: 1.15,
    };

    expect(saveAccessibilitySettings(storage, settings)).toBe(true);
    expect(values.has(ACCESSIBILITY_STORAGE_KEY)).toBe(true);
    expect(loadAccessibilitySettings(storage)).toEqual(settings);
  });

  it('falls back safely for malformed saved preferences', () => {
    const storage = { getItem: () => '{not json', setItem: () => undefined };
    expect(loadAccessibilitySettings(storage).profile).toBe('DEFAULT');
    expect(saveAccessibilitySettings({ getItem: () => null, setItem: () => { throw new Error('blocked'); } }, createAccessibilityPreset('DEFAULT'))).toBe(false);
  });

  it('applies display preferences to the document root', () => {
    const classes = new Map<string, boolean>();
    const variables = new Map<string, string>();
    const root = {
      classList: { toggle: (name: string, enabled: boolean) => classes.set(name, enabled) },
      style: { setProperty: (name: string, value: string) => variables.set(name, value) },
    } as unknown as HTMLElement;
    const settings = createAccessibilityPreset('LOW_VISION');

    applyAccessibilitySettings(settings, root);
    expect(variables.get('--centipede-text-scale')).toBe('130%');
    expect(classes.get('a11y-high-contrast')).toBe(true);
    expect(classes.get('a11y-larger-targets')).toBe(true);
  });

  it('redacts common credentials before a response is spoken', () => {
    const response = 'Password: hunter2, Bearer abc.def.ghi, API key=sk-test_12345678901234567890';
    const spoken = redactSpeechSecrets(response);
    expect(spoken).not.toContain('hunter2');
    expect(spoken).not.toContain('abc.def.ghi');
    expect(spoken).not.toContain('sk-test_12345678901234567890');
    expect(spoken).toContain('Password: hidden');
  });
});
