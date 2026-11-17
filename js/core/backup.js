// Export / Import als JSON-Datei.

import { exportAll, importAll } from './db.js';
import { updateSettings } from './settings.js';
import { today } from './dates.js';

export async function createBackup() {
  const data = await exportAll();
  return { name: `mathub-backup-${today()}.json`, text: JSON.stringify(data), data };
}

export function downloadFile(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Teilen-Dialog von Android (z. B. in Google Drive speichern). false, wenn nicht unterstützt. */
export async function shareFile(name, text) {
  const file = new File([text], name, { type: 'application/json' });
  if (!navigator.canShare?.({ files: [file] })) return false;
  await navigator.share({ files: [file], title: name });
  return true;
}

export async function markBackupDone() {
  await updateSettings({ backup: { lastAt: Date.now() } });
}

export async function readBackupFile(file) {
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (data?.app !== 'mathub') throw new Error('Das ist keine Backup-Datei von Mathub.');
  return data;
}

export const restoreBackup = (data, mode) => importAll(data, { mode });
