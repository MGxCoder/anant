import { File, Paths } from 'expo-file-system';
import type { Scan } from '@/types';

const MAX_SCANS = 100; // ponytail: hard cap instead of a manual "delete" UI; oldest scans + photos are removed
const file = new File(Paths.document, 'scan-history.json');
let cache: Scan[] | null = null;

export async function getScans(): Promise<Scan[]> {
  if (cache) return cache;
  if (!file.exists) return (cache = []);
  try {
    cache = JSON.parse(await file.text()) as Scan[];
  } catch {
    // Keep the unreadable file for recovery instead of overwriting it on the next save.
    file.move(new File(Paths.document, `scan-history.corrupt-${Date.now()}.json`));
    cache = [];
  }
  return cache;
}

export async function getScan(id: string) {
  return (await getScans()).find((s) => s.id === id) ?? null;
}

export async function addScan(scan: Scan) {
  const scans = [scan, ...(await getScans())];
  const dropped = scans.splice(MAX_SCANS);
  // Write to a temp file then move, so a crash mid-write can't corrupt the history.
  const tmp = new File(Paths.document, 'scan-history.tmp.json');
  tmp.write(JSON.stringify(scans));
  tmp.move(file, { overwrite: true });
  cache = scans;
  for (const s of dropped) {
    try { new File(s.imageUri).delete(); } catch {}
  }
}
