
import { GoogleGenAI, Type } from '@google/genai';
import type { StampData } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const schema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: 'The official name or title of the stamp (e.g., "Inverted Jenny").'
        },
        country: {
            type: Type.STRING,
            description: 'The country of origin for the stamp (e.g., "United States").'
        },
        year: {
            type: Type.STRING,
            description: 'The estimated year or range the stamp was issued (e.g., "1918").'
        },
        description: {
            type: Type.STRING,
            description: 'A brief, one-paragraph description of the stamp, its history, and any notable features.'
        },
        estimatedValue: {
            type: Type.STRING,
            description: 'An estimated eBay auction value range, considering common conditions (e.g., "$5 - $10" or "$100+").'
        },
        auctionType: {
            type: Type.STRING,
            description: 'The recommended eBay auction type. Must be exactly "Singular Auction" or "Lot Auction".'
        },
        justification: {
            type: Type.STRING,
            description: 'A brief, one-sentence reason for the auction type recommendation, explaining why it is high or low value.'
        },
    },
    required: ['name', 'country', 'year', 'description', 'estimatedValue', 'auctionType', 'justification']
};

export async function identifyAndValueStamp(base64Image: string): Promise<StampData> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image,
                        },
                    },
                    {
                        text: 'Analyze this image of a postage stamp. Identify it, provide its details, and recommend an eBay auction strategy based on its likely value. Respond with a JSON object matching the provided schema.',
                    },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        });

        const jsonString = response.text.trim();
        const stampData: StampData = JSON.parse(jsonString);
        
        return stampData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API request failed: ${error.message}`);
        }
        throw new Error('An unknown error occurred while communicating with the Gemini API.');
    }
}
