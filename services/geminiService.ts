
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
        catalogNumber: { type: Type.STRING, description: 'Primary Scott, Michel, or SG catalog number found via search or knowledge.' },
        alternateCatalogNumbers: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Alternative catalog numbers if identification is ambiguous.' },
        condition: { type: Type.STRING, description: 'Grading assessment (e.g., VF, Mint, Used).' },
        perforations: { type: Type.STRING, description: 'Perforation measurement (e.g. "11", "12.5 x 12"). Note varieties.' },
        watermark: { type: Type.STRING, description: 'Description of watermark if visible or characteristic of the issue.' },
        colorShade: { type: Type.STRING, description: 'Specific color shade nuances (e.g., "Carmine vs Rose").' },
        overprint: { type: Type.STRING, description: 'Text of any overprints or surcharges.' },
        plateFlaw: { type: Type.STRING, description: 'Any visible plate flaws or errors.' },
        printingMethod: { type: Type.STRING, description: 'Printing method (Engraving, Lithography, etc.).' },
        imageSide: { type: Type.STRING, description: 'Classify view: "front", "back" (gum/hinge side), or "piece" (on envelope/postcard/fragment).' },
        suggestedRotation: { type: Type.NUMBER, description: 'The exact angle in degrees (e.g. 2.5, -4.0) required to rotate the image so the stamp design is perfectly vertical.' },
        description: { type: Type.STRING, description: 'A brief description.' },
        estimatedValue: { type: Type.STRING, description: 'Estimated eBay value range.' },
        auctionType: { type: Type.STRING, description: 'Must be "Singular Auction" or "Lot Auction".' },
        justification: { type: Type.STRING, description: 'Reason for the auction recommendation.' },
        confidenceBreakdown: { 
            type: Type.OBJECT,
            properties: {
                identification: { type: Type.NUMBER, description: 'Confidence (0.0-1.0) in catalog identification.' },
                condition: { type: Type.NUMBER, description: 'Confidence (0.0-1.0) in condition grading.' },
                valuation: { type: Type.NUMBER, description: 'Confidence (0.0-1.0) in value estimation.' }
            },
            required: ['identification', 'condition', 'valuation']
        },
        isRejected: { type: Type.BOOLEAN, description: 'True if not a philatelic item.' },
        tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'eBay search tags.' }
    },
    required: ['name', 'country', 'year', 'description', 'estimatedValue', 'auctionType', 'isRejected']
};

const videoAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        totalStampsDetected: { type: Type.NUMBER, description: 'Approximate count of distinct stamps visible.' },
        countries: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of countries identified.' },
        notableItems: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of specific rare or notable stamps/series identified.' },
        overallCondition: { type: Type.STRING, description: 'General condition of the collection (e.g., "Mixed", "Mostly Mint", "Heavily Cancelled").' },
        summary: { type: Type.STRING, description: 'A paragraph summarizing the collection contents.' }
    },
    required: ['totalStampsDetected', 'countries', 'summary']
};

const duplicateSchema = {
    type: Type.OBJECT,
    properties: {
        isDuplicate: { type: Type.BOOLEAN },
        similarityScore: { type: Type.NUMBER, description: '0 to 1 score of visual/philatelic similarity' },
        notes: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Differences or similarities noted.' }
    },
    required: ['isDuplicate', 'similarityScore', 'notes']
};

const ebayListingSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "SEO optimized eBay title (max 80 chars). Include Country, Year, Cat#, Condition." },
    description: { type: Type.STRING, description: "Professional HTML description for the listing." },
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
    suggestedPrice: { type: Type.NUMBER, description: "Suggested starting price based on value." },
    categoryId: { type: Type.STRING, description: "Suggested eBay Category ID (e.g. 260 for Stamps)." }
  },
  required: ['title', 'description', 'itemSpecifics', 'suggestedPrice']
};


function getAiClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

export async function identifyAndValueStamp(
    base64Image: string, 
    settings: AppSettings
): Promise<StampData> {
    const ai = getAiClient();
    
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
                    { text: `Analyze this philatelic item with advanced philatelic expertise.

1.  **Identification**: Precise Country, Year, Face Value, and Series.
2.  **Catalog Number**: Use the 'googleSearch' tool to identify the specific Scott, Michel, or Stanley Gibbons number. Construct search queries like "[Country] stamp [Face Value] [Subject]". Verify the result against visual details in the image. If multiple possibilities exist, list them in 'alternateCatalogNumbers'.
3.  **Advanced Philatelic Details**:
    *   **Perforations**: Count (e.g., "Perf 11") and type (Line vs Comb).
    *   **Watermarks**: Identify if visible or characteristic of the identified issue.
    *   **Printing Method**: Engraving, Lithography, Typography, or Photogravure.
    *   **Color Shades**: Identify specific shades (e.g., "Ultramarine" vs "Blue").
    *   **Varieties**: Explicitly check for Overprints, Surcharges, and Plate Flaws.
4.  **Condition & Grading**: Assess centering (Gem, VF, F, AVG), margins, cancellations, and faults (tears, creases, thins).
5.  **Valuation**: Estimate market value range based on *comparable sold listings* found via search.
6.  **Meta**: 
    *   **Image Side**: Classify as 'front', 'back' (gum side), or 'piece' (on cover/postcard).
    *   **Rotation**: Calculate the exact angle (e.g. 2.5, -4.0) needed to straighten the image so the design is vertical.

**Confidence Breakdown (0.0 - 1.0)**:
*   'identification': High (0.8+) if catalog number is verified by search images.
*   'condition': High if image resolution allows detailed inspection of perfs/paper.
*   'valuation': High if direct sales data is found.

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

export async function analyzeCollectionVideo(base64Video: string, mimeType: string): Promise<any> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: mimeType, data: base64Video } },
                    { text: `Analyze this video of a stamp collection. 
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

export async function editStampImage(base64Image: string, prompt: string): Promise<string> {
    const ai = getAiClient();
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

export async function checkIsPhilatelic(base64Image: string): Promise<boolean> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: 'Is this a stamp/cover? Answer ONLY "TRUE" or "FALSE".' }
                ]
            }
        });
        return response.text.trim().toUpperCase().includes('TRUE');
    } catch (e) {
        return false;
    }
}

export async function verifyDuplicate(image1Base64: string, image2Base64: string): Promise<{ isDuplicate: boolean; score: number; notes: string[] }> {
    const ai = getAiClient();
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

export async function generateEbayListing(stamp: Stamp): Promise<any> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                   { text: `Create an optimized eBay listing for this stamp.
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
