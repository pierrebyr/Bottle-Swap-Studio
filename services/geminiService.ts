import { GoogleGenAI, Modality, Part } from "@google/genai";
import type { UploadedImage } from '../types';
import { retryWithBackoff } from '../utils/retry';

// Assumes API_KEY is set in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
const model = 'gemini-2.5-flash-image';

const callGenerateContentApi = async (parts: Part[]) => {
    return retryWithBackoff(
        async () => {
            const response = await ai.models.generateContent({
                model: model,
                contents: { parts },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return part.inlineData.data;
                }
            }
            throw new Error("No image data found in the API response.");
        },
        {
            maxAttempts: 3,
            delayMs: 2000,
            backoffMultiplier: 2,
            onRetry: (attempt, error) => {
                console.log(`Retry attempt ${attempt} after error: ${error.message}`);
            },
        }
    );
};


export const generateBottleAngles = async (
    packshotImage: UploadedImage,
): Promise<string[]> => {
    try {
        const objectImagePart = {
            inlineData: {
                data: packshotImage.base64,
                mimeType: packshotImage.mimeType,
            },
        };

        const basePrompt = "You are a professional product photographer. Your task is to take a single product packshot and generate an additional, photorealistic image of the *same product* from a *completely different angle*. It is absolutely critical that you preserve the exact label design, text, cap, glass material, and liquid color. The background MUST be a neutral studio gray. Do not just return the original image. Here is the packshot:";

        const anglePrompts = [
            "Your specific task: Generate a new image of this bottle from a **three-quarter view from the right**. The bottle should be rotated about 45 degrees to the left from the original position.",
            "Your specific task: Generate a new image of this bottle from a **direct side profile view (90-degree turn)**. Show the bottle as if it has been rotated exactly 90 degrees.",
            "Your specific task: Generate a new image of this bottle from a **high angle, looking down at the cap and shoulders** of the bottle. This should be a clear top-down perspective.",
            "Your specific task: Generate a new image of this bottle from a **dramatic low angle, looking up from below the base**. The perspective should be from the ground up."
        ];

        const generationPromises = anglePrompts.map(prompt => {
            const parts: Part[] = [
                { text: basePrompt },
                objectImagePart,
                { text: prompt }
            ];
            return callGenerateContentApi(parts);
        });

        const imageResults = await Promise.all(generationPromises);
        return imageResults.filter((img): img is string => !!img);

    } catch (error) {
        console.error("Error generating bottle angles:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to generate bottle angles: ${error.message}`);
        }
        throw new Error("An unknown error occurred while generating bottle angles.");
    }
};


export const generateImage = async (
  referenceImages: UploadedImage[],
  objectImages: UploadedImage[], // Can now be one or many
  userPrompt: string,
  isStyleReferenceOnly: boolean,
  outputCount: number = 4,
): Promise<string[]> => {
  try {
    const referenceImageParts = referenceImages.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType },
    }));

    const objectImageParts = objectImages.map(img => ({
        inlineData: { data: img.base64, mimeType: img.mimeType },
    }));

    let parts: Part[] = [];

    if (isStyleReferenceOnly) {
      parts = [
        { text: "You are an expert art director. Your task is to generate a new scene based on multiple inputs. First, observe the following images for style reference. You must capture their collective essence—mood, lighting, color, and composition—to define the art direction for the final image." },
        ...referenceImageParts,
        { text: "Next, here is a full set of product images showing the new bottle from multiple angles. It is CRITICAL that you use ALL of these images as a comprehensive 3D reference to accurately render the bottle, which MUST be the central subject of the new scene you create." },
        ...objectImageParts,
        { text: `Now, generate a completely new and unique photorealistic scene that places the product bottle (using the multi-angle reference) within an environment that perfectly matches the art direction established by ALL of the style reference images. Do not copy elements from the reference scenes directly; create a new composition. Apply the user's additional instructions if provided: "${userPrompt.trim() ? userPrompt : "No additional instructions."}"` },
      ];
    } else {
      parts = [
        { text: "You are an expert photo editor. Your task is to perform a photorealistic bottle swap. First, here is the reference scene. The goal is to replace the bottle within this scene." },
        ...referenceImageParts,
        { text: "Next, here is a full set of product images showing the new product bottle from multiple angles. It is CRITICAL that you use ALL of these images as a comprehensive 3D reference to accurately render the bottle that must be placed into the scene." },
        ...objectImageParts,
        { text: `Now, seamlessly integrate the new bottle into the reference scene. The original bottle must be completely removed. The new bottle must be placed at an angle that is natural for the scene, using the provided multi-angle references to render it accurately while preserving its exact shape, label, and liquid color. Match the scene's lighting, shadows, and reflections for a photorealistic result. Apply the user's additional instructions if they are relevant: "${userPrompt.trim() ? userPrompt : "No additional instructions."}"` },
      ];
    }
    
    const generationPromises = Array(outputCount).fill(0).map(() => callGenerateContentApi(parts));
    
    const responses = await Promise.all(generationPromises);
    
    return responses.filter((img): img is string => !!img);

  } catch (error) {
    console.error("Error generating images:", error);
    if (error instanceof Error) {
        throw new Error(`Failed to generate images: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the images.");
  }
};