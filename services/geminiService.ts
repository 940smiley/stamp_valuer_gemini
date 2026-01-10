
import { GoogleGenAI, Type } from '@google/genai';
import type { StampData, AppSettings, Stamp } from '../types';

const stampSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: 'The official name or title of the stamp.' },
        country: { type: Type.STRING, description: 'The country of origin.' },
        year: { type: Type.STRING, description: 'The estimated year or range of issue.' },
        faceValue: { type: Type.STRING, description: 'The denomination printed on the stamp.' },
        currency: { type: Type.STRING, description: 'The currency unit.' },
        catalogNumber: { type: Type.STRING, description: 'Primary Scott, Michel, or SG catalog number.' },
        alternateCatalogNumbers: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Alternative catalog numbers.' },
        condition: { type: Type.STRING, description: 'Grading assessment (e.g., VF, Mint, Used, Cover, FDC).' },
        itemType: { type: Type.STRING, description: 'CRITICAL: Classify as one of: "stamp", "cover" (envelope), "block" (multiple attached), "pane", "fdc" (first day cover), "clipping" (on paper square), "stationery", or "other".' },
        perforations: { type: Type.STRING, description: 'Perforation measurement.' },
        watermark: { type: Type.STRING, description: 'Watermark description.' },
        colorShade: { type: Type.STRING, description: 'Specific color shade nuances.' },
        overprint: { type: Type.STRING, description: 'Text of any overprints or surcharges.' },
        plateFlaw: { type: Type.STRING, description: 'Any visible plate flaws or errors.' },
        printingMethod: { type: Type.STRING, description: 'Printing method.' },
        imageSide: { type: Type.STRING, description: 'Classify view: "front", "back", or "piece".' },
        suggestedRotation: { type: Type.NUMBER, description: 'Angle to straighten image.' },
        description: { type: Type.STRING, description: 'A brief description.' },
        estimatedValue: { type: Type.STRING, description: 'Estimated eBay value range.' },
        auctionType: { type: Type.STRING, description: 'Singular vs Lot Auction.' },
        justification: { type: Type.STRING, description: 'Reason for auction type.' },
        verificationNotes: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'AI notes on authenticity, condition quirks, or identification reasoning.' },
        confidenceBreakdown: {
            type: Type.OBJECT,
            properties: {
                identification: { type: Type.NUMBER },
                condition: { type: Type.NUMBER },
                valuation: { type: Type.NUMBER }
            },
            required: ['identification', 'condition', 'valuation']
        },
        isRejected: { type: Type.BOOLEAN, description: 'True if not a philatelic item.' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'eBay search tags.' }
    },
    required: ['name', 'country', 'year', 'description', 'estimatedValue', 'auctionType', 'isRejected', 'itemType']
};

const videoAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        totalStampsDetected: { type: Type.NUMBER, description: 'Approximate count of distinct stamps visible.' },
        countries: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of countries identified.' },
        notableItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of specific rare or notable stamps/series identified.' },
        overallCondition: { type: Type.STRING, description: 'General condition of the collection.' },
        summary: { type: Type.STRING, description: 'A paragraph summarizing the collection contents.' }
    },
    required: ['totalStampsDetected', 'countries', 'summary']
};

const duplicateSchema = {
    type: Type.OBJECT,
    properties: {
        isDuplicate: { type: Type.BOOLEAN },
        similarityScore: { type: Type.NUMBER },
        notes: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['isDuplicate', 'similarityScore', 'notes']
};

const ebayListingSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "SEO optimized eBay title." },
        description: { type: Type.STRING, description: "HTML description." },
        itemSpecifics: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    Name: { type: Type.STRING },
                    Value: { type: Type.STRING }
                }
            }
        },
        suggestedPrice: { type: Type.NUMBER },
        categoryId: { type: Type.STRING }
    },
    required: ['title', 'description', 'itemSpecifics', 'suggestedPrice']
};


function getAiClient(customKey?: string) {
    const key = customKey || import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || (window as any).process?.env?.API_KEY;
    return new GoogleGenAI({ apiKey: key });
}

export async function identifyAndValueStamp(
    base64Image: string,
    settings: AppSettings
): Promise<StampData> {
    const ai = getAiClient(settings.geminiApiKey);

    try {
        let model = 'gemini-flash-latest';
        if (settings.modelQuality === 'pro' || settings.useThinkingMode) {
            model = 'gemini-3-pro-preview';
        }
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
        }

        const response = await ai.models.generateContent({
            model: model,
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    {
                        text: `Analyze this philatelic item with expert precision.
                    
1.  **Strictly Classify Item Type**: Identify if this is a standard "stamp", "block" (multiples), "cover" (envelope), "fdc" (First Day Cover), "pane", "clipping" (stamp on paper piece), or "stationery".
2.  **Identification**: Country, Year, Face Value, Series.
3.  **Cataloging**: Identify catalog number (Scott/Michel).
4.  **Details**: Perforations, Watermark, Printing, Shades, Overprints.
5.  **Condition**: Grade it (Mint NH, Hinged, Used, VF, F, etc.). Look for faults.
6.  **Valuation**: Estimate market value based on similar sold items.
7.  **Meta**: Image side and rotation angle.
8.  **Verification Notes**: Provide 1-3 short bullet points explaining WHY you identified it this way or noting specific condition issues (e.g. "Short perf at top", "Cancel obscures value").

Output JSON.` },
                ],
            },
            config: config,
        });

        let jsonString = response.text.trim();
        if (jsonString.startsWith('```json')) {
            jsonString = jsonString.replace(/^```json\n/, '').replace(/\n```$/, '');
        } else if (jsonString.startsWith('```')) {
            jsonString = jsonString.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        const stampData = JSON.parse(jsonString) as StampData;

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            stampData.sources = groundingChunks
                .map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
                .filter((s: any): s is { uri: string; title: string } => !!s && !!s.uri);
        }

        return stampData;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error(error instanceof Error ? error.message : 'Unknown API error');
    }
}

export async function analyzeCollectionVideo(base64Video: string, mimeType: string, customKey?: string): Promise<any> {
    const ai = getAiClient(customKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Video } },
                    {
                        text: `Analyze this video of a stamp collection. 
                    1. Estimate the total count of distinct stamps visible.
                    2. Identify the main countries or regions represented.
                    3. List any potential high-value or notable sets/issues seen.
                    4. Assess the general condition (Mint, Used, Mixed).
                    5. Provide a brief summary of the collection content.
                    Output JSON.` }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: videoAnalysisSchema
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Video Analysis Error:", error);
        throw new Error("Failed to analyze video.");
    }
}

export async function editStampImage(base64Image: string, prompt: string, customKey?: string): Promise<string> {
    const ai = getAiClient(customKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: prompt },
                ],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData && part.inlineData.data) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image generated.");
    } catch (error) {
        console.error("Gemini Image Edit Error:", error);
        throw new Error("Failed to edit image using AI.");
    }
}

export async function checkIsPhilatelic(base64Image: string, customKey?: string): Promise<boolean> {
    const ai = getAiClient(customKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: 'Analyze this image. Is it a postage stamp, a revenue stamp, or a first day cover? Return "TRUE" if it is any of these, or "FALSE" if it is anything else (like a coin, banknote, or random object). Answer ONLY "TRUE" or "FALSE".' }
                ]
            }
        });
        const result = response.text.trim().toUpperCase();
        return result.includes('TRUE');
    } catch (e) {
        return false;
    }
}

export async function verifyDuplicate(image1Base64: string, image2Base64: string, customKey?: string): Promise<{ isDuplicate: boolean; score: number; notes: string[] }> {
    const ai = getAiClient(customKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: image1Base64 } },
                    { inlineData: { mimeType: 'image/jpeg', data: image2Base64 } },
                    { text: 'Compare these two stamp images. Are they the EXACT same item (duplicate)? Ignore minor lighting differences. Return JSON.' }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: duplicateSchema
            }
        });

        const res = JSON.parse(response.text);
        return { isDuplicate: res.isDuplicate, score: res.similarityScore, notes: res.notes };
    } catch (e) {
        console.error("Duplicate check failed", e);
        return { isDuplicate: false, score: 0, notes: ['Check failed'] };
    }
}

export async function generateEbayListing(stamp: Stamp, customKey?: string): Promise<any> {
    const ai = getAiClient(customKey);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        text: `Create an optimized eBay listing for this stamp.
                   Stamp Data: ${JSON.stringify(stamp)}
                   
                   Requirements:
                   1. Title: Max 80 characters. Keywords: Country, Year, Catalog #, Condition.
                   2. Description: HTML format. Professional tone. Highlight condition and rarity.
                   3. Item Specifics: Key-Value pairs for eBay (e.g. "Year of Issue", "Quality", "Grade").
                   4. Price: Suggest a competitive starting bid based on the estimated value.
                   ` }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: ebayListingSchema
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Listing Generation Failed", error);
        throw error;
    }
}
