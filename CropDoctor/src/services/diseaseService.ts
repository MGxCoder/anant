import classNames from '@/data/class_names.json';
import diseases from '@/data/diseases.json';
import type { DiseaseInfo } from '@/types';

export const DEFAULT_SOURCE =
  'Summary of widely published plant-pathology and agricultural extension information. Not reviewed by an agronomist for your region.';

export const CHEMICAL_NOTE =
  'This app does not recommend specific pesticides or doses. Ask your local agricultural extension officer which products are registered for this problem in your area, and always follow the label.';

const db = diseases as Record<string, Omit<DiseaseInfo, 'healthy' | 'source'> & { source?: string }>;

/** "Pepper,_bell___healthy" -> "Bell pepper" */
const cropOf = (className: string) =>
  className.split('___')[0].replace('Pepper,_bell', 'Bell pepper').replace('Corn', 'Corn (maize)').replace(/_/g, ' ');

export function getDiseaseInfo(className: string): DiseaseInfo {
  const entry = db[className];
  if (entry) return { ...entry, healthy: false, source: entry.source ?? DEFAULT_SOURCE };
  const crop = cropOf(className);
  if (className.endsWith('___healthy'))
    return {
      crop,
      disease: 'Healthy',
      healthy: true,
      description: `No disease was detected on this ${crop.toLowerCase()} leaf. Keep checking your plants regularly — early signs are easiest to manage.`,
      symptoms: [],
      prevention: [
        'Inspect leaves (both sides) every week',
        'Water at the base of plants and avoid wetting leaves late in the day',
        'Remove fallen leaves and plant debris',
        'Rotate crops and use healthy seed or planting material',
      ],
      treatment: null,
      source: DEFAULT_SOURCE,
    };
  // Should not happen: every class in class_names.json is either in diseases.json or "___healthy".
  return { crop, disease: className, healthy: false, description: 'No information available for this class.', symptoms: [], prevention: [], treatment: null, source: '' };
}

export const labelOf = (index: number): string => classNames[index];

export const SUPPORTED_CROPS = [...new Set(classNames.map(cropOf))];
