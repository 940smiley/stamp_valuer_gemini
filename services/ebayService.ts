
import type { Stamp } from '../types';

export const verifyEbayConnection = async (apiKey: string, token: string): Promise<boolean> => {
    // Simulate API check
    return new Promise((resolve) => {
        setTimeout(() => {
            if (apiKey && token) resolve(true);
            else resolve(false);
        }, 1000);
    });
};

export interface EbayListingDraft {
    stampIds: number[];
    title: string;
    description: string;
    price: number;
    conditionID: number; // 1000 = New, 3000 = Used
    itemSpecifics: { Name: string, Value: string }[];
    categoryId: string;
}

export const postBulkListings = async (listings: EbayListingDraft[]): Promise<{ success: number; failed: number }> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ success: listings.length, failed: 0 });
        }, 2000);
    });
};

export const getEbayCategorySuggestion = async (query: string): Promise<string> => {
    // Mock category ID for Stamps
    return "260";
};
