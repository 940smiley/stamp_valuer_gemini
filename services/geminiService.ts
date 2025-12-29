
import { GoogleGenAI, Type } from '@google/genai';
import type { StampData, AppSettings } from '../types';

// Updated schema to include rejection flag for better handling of non-stamp images
const stampSchema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: 'The official name or title of the stamp.'
        },
        country: {
            type: Type.STRING,
            description: 'The country of origin.'
        },
        year: {
            type: Type.STRING,
            description: 'The estimated year or range of issue.'
        },
        description: {
            type: Type.STRING,
            description: 'A brief, one-paragraph description of history and features.'
        },
        estimatedValue: {
            type: Type.STRING,
            description: 'Estimated eBay value range (e.g., "$10-$20").'
        },
        auctionType: {
            type: Type.STRING,
            description: 'Must be "Singular Auction" or "Lot Auction".'
        },
        justification: {
            type: Type.STRING,
            description: 'Reason for the auction recommendation.'
        },
        isRejected: {
            type: Type.BOOLEAN,
            description: 'True if the image is NOT a philatelic item (postage stamp, cover, etc.).'
        },
        tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Relevant search tags for eBay listing.'
        }
    },
    required: ['name', 'country', 'year', 'description', 'estimatedValue', 'auctionType', 'justification', 'isRejected']
};

export async function identifyAndValueStamp(
    base64Image: string, 
    settings: AppSettings
): Promise<StampData> {
    // Initializing AI inside the function to ensure the latest API key is used
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        // Model selection based on task type and search requirements
        let model = 'gemini-flash-latest';
        if (settings.modelQuality === 'pro' || settings.useThinkingMode) {
            model = 'gemini-3-pro-preview';
        }
        
        // Use gemini-3-pro-image-preview if search grounding is requested for multimodal tasks
        if (settings.useSearchGrounding) {
            model = 'gemini-3-pro-image-preview';
        }

        const config: any = {
            responseMimeType: 'application/json',
            responseSchema: stampSchema,
        };

        if (settings.useThinkingMode && model.includes('pro')) {
            config.thinkingConfig = { thinkingBudget: 32768 };
        }

        if (settings.useSearchGrounding) {
            config.tools = [{ googleSearch: {} }];
            // Note: Guideline suggests response.text might not be JSON with search grounding.
            // We keep the JSON request but handle potential parsing issues.
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image,
                        },
                    },
                    {
                        text: `Analyze this image. Identify if it is a philatelic item (stamp, cover, or letter). Provide full identification details and recommend an eBay auction strategy based on current market trends.`,
                    },
                ],
            },
            config: config,
        });

        // Extracting text output safely
        let jsonString = response.text.trim();
        
        // Handle potential markdown wrapping if the model ignores responseMimeType
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const stampData = JSON.parse(jsonString) as StampData;

        // Extracting grounding sources from candidates
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            stampData.sources = groundingChunks
                .map((chunk: any) => {
                    if (chunk.web) {
                        return { uri: chunk.web.uri, title: chunk.web.title };
                    }
                    return null;
                })
                .filter((s: any): s is { uri: string; title: string } => !!s && !!s.uri);
        }
        
        return stampData;

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error(error instanceof Error ? error.message : 'Unknown API error');
    }
}

export async function checkIsPhilatelic(base64Image: string): Promise<boolean> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest', // Corrected model name
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: 'Is this an image of a postage stamp, philatelic cover, or postal history item? Answer with ONLY "TRUE" or "FALSE".' }
                ]
            }
        });
        return response.text.trim().toUpperCase().includes('TRUE');
    } catch (e) {
        return false;
    }
}
