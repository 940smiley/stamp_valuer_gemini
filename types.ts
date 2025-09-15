
export interface StampData {
  name: string;
  country: string;
  year: string;
  description: string;
  estimatedValue: string;
  auctionType: 'Singular Auction' | 'Lot Auction' | string;
  justification: string;
}

export interface Stamp extends StampData {
  id: number;
  imageUrl: string;
}

export type SortBy = 'date' | 'name' | 'country' | 'value';
export type SortOrder = 'asc' | 'desc';
