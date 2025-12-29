
export interface StampData {
  name: string;
  country: string;
  year: string;
  description: string;
  estimatedValue: string;
  auctionType: 'Singular Auction' | 'Lot Auction' | string;
  justification: string;
  tags?: string[];
  // Added fields for search grounding and filtering
  isRejected?: boolean;
  sources?: { uri: string; title: string }[];
}

export interface Stamp {
  id: number;
  imageUrl: string;
  name: string;
  country: string;
  year: string;
  description: string;
  estimatedValue: string;
  auctionType: 'Singular Auction' | 'Lot Auction' | string;
  justification: string;
  tags?: string[];
  isRejected?: boolean;
  sources?: { uri: string; title: string }[];
}

export type SortBy = 'date' | 'name' | 'country' | 'value';
export type SortOrder = 'asc' | 'desc';

export interface AppSettings {
  ebayApiKey: string;
  useThinkingMode: boolean;
  useSearchGrounding: boolean;
  modelQuality: 'fast' | 'pro';
}

export type AppView = 'dashboard' | 'batch' | 'settings';

export interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'checking' | 'processing' | 'completed' | 'rejected' | 'error';
  error?: string;
  result?: StampData;
}
