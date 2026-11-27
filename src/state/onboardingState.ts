import type { ComponentScanStatus } from '../types';

export const ONBOARDING_VISITED_KEY = 'bci_hub_onboarding_visited';
export const PRESCAN_UPLOADED_KEY = 'bci_hub_prescan_uploaded';
export const HAS_INSTALLED_KEY = 'bci_hub_has_installed';

function readBoolFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeBoolFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // ignore storage failures
  }
}

export function hasVisitedOnboarding(): boolean {
  return readBoolFlag(ONBOARDING_VISITED_KEY);
}

export function markOnboardingVisited(): void {
  writeBoolFlag(ONBOARDING_VISITED_KEY);
}

export function hasUploadedPreScan(): boolean {
  return readBoolFlag(PRESCAN_UPLOADED_KEY);
}

export function markPreScanUploaded(): void {
  writeBoolFlag(PRESCAN_UPLOADED_KEY);
}

export function hasInstalledBefore(): boolean {
  return readBoolFlag(HAS_INSTALLED_KEY);
}

export function markHasInstalled(): void {
  writeBoolFlag(HAS_INSTALLED_KEY);
}

export function hasWorkshopSetupOnDisk(scans: ComponentScanStatus[]): boolean {
  const byId = new Map(scans.map((s) => [s.id, s]));
  return Boolean(
    byId.get('python_env')?.installed ||
      byId.get('openbci_gui')?.installed ||
      byId.get('lab_recorder')?.installed ||
      byId.get('arduino_ide')?.notes === 'ide_and_cli_ready'
  );
}
