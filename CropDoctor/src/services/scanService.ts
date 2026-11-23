import { imageToPng, saveScanImage } from './imageService';
import { predict } from './modelService';
import { getDiseaseInfo, labelOf } from './diseaseService';
import { addScan } from './historyService';
import { topK } from '@/utils/tensor';
import type { Scan } from '@/types';

/** Full pipeline: photo -> preprocess -> on-device inference -> class mapping -> saved scan. */
export async function analyzeLeaf(uri: string, onStep?: (step: string) => void): Promise<Scan> {
  onStep?.('Preparing image…');
  const png = await imageToPng(uri);
  onStep?.('Analyzing leaf…');
  const probs = await predict(png);
  const top = topK(probs, 3);
  const best = top[0];
  if (!best || !Number.isFinite(best.p)) throw new Error('The model returned an invalid result.');

  const className = labelOf(best.index);
  const info = getDiseaseInfo(className);
  const id = `${Date.now()}`;
  onStep?.('Saving result…');
  const scan: Scan = {
    id,
    imageUri: await saveScanImage(uri, id),
    classIndex: best.index,
    className,
    crop: info.crop,
    disease: info.disease,
    healthy: info.healthy,
    confidence: best.p,
    top: top.map((t) => ({ className: labelOf(t.index), p: t.p })),
    createdAt: new Date().toISOString(),
  };
  await addScan(scan);
  return scan;
}
