
export interface StampData {
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
  
  // Advanced Philatelic Data
  catalogNumber?: string;
  alternateCatalogNumbers?: string[];
  condition?: string;
  perforations?: string;
  watermark?: string;
  printingMethod?: string;
  faceValue?: string; // e.g. "5c"
  currency?: string;
  imageSide?: 'front' | 'back' | 'piece';
  itemType?: 'stamp' | 'cover' | 'block' | 'pane' | 'fdc' | 'clipping' | 'other'; // New classification
  suggestedRotation?: number; // degrees to straighten
  colorShade?: string;
  overprint?: string;
  plateFlaw?: string;
  
  // Confidence Metrics
  confidenceBreakdown?: {
      identification: number;
      condition: number;
      valuation: number;
  };

  // Duplicate / Inventory Info
  duplicateOf?: number; // ID of the original stamp
  similarityScore?: number;
  verificationNotes?: string[];
}

export interface Stamp extends StampData {
  id: number;
  imageUrl: string;
  collectionId?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
}

export type SortBy = 'date' | 'name' | 'country' | 'value';
export type SortOrder = 'asc' | 'desc';

export interface AppSettings {
  // eBay Integration
  ebayApiKey: string; // App ID
  ebayDevId?: string;
  ebayCertId?: string;
  ebayOAuthToken?: string;
  
  // Social & Privacy
  facebookPageId?: string;
  facebookAccessToken?: string;
  isPrivateCollection: boolean;

  // Google Integration
  googleClientId?: string;
  googleDeveloperKey?: string;
  
  // AI Settings
  useThinkingMode: boolean;
  useSearchGrounding: boolean;
  modelQuality: 'fast' | 'pro';
}

export type AppView = 'dashboard' | 'batch' | 'settings' | 'duplicates' | 'googlePhotos';

export interface BatchItem {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'checking' | 'processing' | 'completed' | 'rejected' | 'error';
  error?: string;
  result?: StampData;
}
