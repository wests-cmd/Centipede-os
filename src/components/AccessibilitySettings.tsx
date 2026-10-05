import React, { useEffect, useState } from 'react';
import { Accessibility, Check, Eye, Focus, MousePointer2, Type, Volume2 } from 'lucide-react';
import {
  ACCESSIBILITY_PROFILES,
  AccessibilitySettings as AccessibilitySettingsModel,
  AccessibilitySpeechRate,
  AccessibilityTextScale,
  applyAccessibilitySettings,
  createAccessibilityPreset,
  loadAccessibilitySettings,
  saveAccessibilitySettings,
} from '../platform/accessibility';

export const AccessibilitySettings: React.FC = () => {
  const [settings, setSettings] = useState<AccessibilitySettingsModel>(() => {
    if (typeof window === 'undefined') return createAccessibilityPreset('DEFAULT');
    try {
      return loadAccessibilitySettings(window.localStorage);
    } catch {
      return createAccessibilityPreset('DEFAULT');
    }
  });
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    applyAccessibilitySettings(settings, document.documentElement);
  }, [settings]);

  const update = (next: AccessibilitySettingsModel) => {
    setSettings(next);
    if (typeof window !== 'undefined') {
      applyAccessibilitySettings(next, document.documentElement);
      let saved = false;
      try {
        saved = saveAccessibilitySettings(window.localStorage, next);
      } catch {
        saved = false;
      }
      setSaveMessage(saved ? 'Accessibility settings saved in this browser.' : 'This browser blocked saving. Settings apply until you close the page.');
    }
  };

  const updateSetting = <K extends keyof AccessibilitySettingsModel>(key: K, value: AccessibilitySettingsModel[K]) => {
    update({ ...settings, profile: 'CUSTOM', [key]: value });
  };

  return (
    <section aria-labelledby="accessibility-settings-heading" className="rounded-2xl border border-cyan-900/70 bg-slate-900/80 p-5 shadow-xl sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <Accessibility aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-cyan-300" />
        <div>
          <h3 id="accessibility-settings-heading" className="text-lg font-bold text-white">Accessibility</h3>
          <p className="mt-1 text-sm text-slate-300">Choose settings that make Centipede easier to see and operate. Profiles are starting points; adjust every setting to fit you.</p>
          <p className="mt-1 text-xs text-slate-400">Saved in this browser only. These controls do not install a screen reader or change host operating-system settings.</p>
        </div>
      </header>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Starting profile</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {ACCESSIBILITY_PROFILES.map((profile) => {
            const selected = settings.profile === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                aria-pressed={selected}
                onClick={() => update(profile.id === 'CUSTOM' ? { ...settings, profile: 'CUSTOM' } : createAccessibilityPreset(profile.id))}
                className={`min-h-11 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 ${selected ? 'border-cyan-400 bg-cyan-950/50 text-white' : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-slate-500'}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                  {profile.name}
                  {selected && <Check aria-hidden="true" className="h-4 w-4 text-cyan-200" />}
                </span>
                <span className="mt-1 block text-xs font-normal text-slate-400">{profile.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <Type aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
          <span className="flex-1">Text size</span>
          <select
            aria-label="Text size"
            value={settings.textScale}
            onChange={(event) => updateSetting('textScale', Number(event.target.value) as AccessibilityTextScale)}
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <option value={1}>Standard</option>
            <option value={1.15}>Large</option>
            <option value={1.3}>Extra large</option>
            <option value={1.5}>Largest</option>
          </select>
        </label>

        <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
          <Volume2 aria-hidden="true" className="h-4 w-4 shrink-0 text-cyan-300" />
          <span className="flex-1">Speaking speed</span>
          <select
            aria-label="Speaking speed"
            value={settings.speechRate}
            onChange={(event) => updateSetting('speechRate', Number(event.target.value) as AccessibilitySpeechRate)}
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
          >
            <option value={0.65}>Very slow</option>
            <option value={0.8}>Slow</option>
            <option value={1}>Standard</option>
            <option value={1.15}>Fast</option>
          </select>
        </label>

        <Toggle icon={<Eye aria-hidden="true" className="h-4 w-4 text-cyan-300" />} label="High contrast" checked={settings.highContrast} onChange={(value) => updateSetting('highContrast', value)} />
        <Toggle icon={<Focus aria-hidden="true" className="h-4 w-4 text-cyan-300" />} label="Reduce motion" checked={settings.reduceMotion} onChange={(value) => updateSetting('reduceMotion', value)} />
        <Toggle icon={<Eye aria-hidden="true" className="h-4 w-4 text-cyan-300" />} label="Reduce transparency" checked={settings.reduceTransparency} onChange={(value) => updateSetting('reduceTransparency', value)} />
        <Toggle icon={<MousePointer2 aria-hidden="true" className="h-4 w-4 text-cyan-300" />} label="Larger controls" checked={settings.largerTargets} onChange={(value) => updateSetting('largerTargets', value)} />
      </div>

      <p className="mt-4 text-sm text-slate-300" role="status" aria-live="polite">{saveMessage || 'Changes apply immediately.'}</p>
      <details className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
        <summary className="cursor-pointer font-medium text-slate-300">What these settings do</summary>
        <p className="mt-2 leading-relaxed">Text size scales the interface. High contrast strengthens text, borders, and focus outlines. Reduced motion and transparency limit visual effects. Larger controls increase minimum click and touch target size. Your browser or operating system provides screen-reader and switch-control features.</p>
      </details>
    </section>
  );
};

interface ToggleProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ icon, label, checked, onChange }) => (
  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-200">
    {icon}
    <span className="flex-1">{label}</span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-5 w-5 accent-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
    />
  </label>
);
