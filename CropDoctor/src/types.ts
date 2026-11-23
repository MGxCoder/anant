export type DiseaseInfo = {
  crop: string;
  disease: string;
  healthy: boolean;
  pathogen?: string;
  description: string;
  symptoms: string[];
  prevention: string[];
  /** General management only. null = no verified treatment information in the app. */
  treatment: string[] | null;
  source: string;
};

export type Scan = {
  id: string;
  imageUri: string;
  /** Model output index and the exact class_names.json label at that index. */
  classIndex: number;
  className: string;
  crop: string;
  disease: string;
  healthy: boolean;
  confidence: number; // 0..1
  /** Top 3 predictions for transparency / comparing with Colab. */
  top: { className: string; p: number }[];
  createdAt: string; // ISO date
};
