import { Injectable, signal } from '@angular/core';
import { GoogleGenAI } from '@google/genai';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI | null = null;
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    try {
      // The API key is expected to be available in the execution environment.
      this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    } catch (e) {
      console.error('Failed to initialize GoogleGenAI:', e);
      this.error.set('Failed to initialize AI service. API_KEY might be missing.');
    }
  }

  async generateImage(prompt: string, aspectRatio: '1:1' | '16:9' = '1:1'): Promise<string | null> {
    if (!this.ai) {
      this.error.set('AI Service not initialized.');
      return null;
    }

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await this.ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
          aspectRatio,
        },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/png;base64,${base64ImageBytes}`;
      }
      return null;
    } catch (e: any) {
      console.error('Error generating image:', e);
      this.error.set(`An error occurred while generating the image: ${e.message || 'Unknown error'}`);
      return null;
    } finally {
      this.isLoading.set(false);
    }
  }
}
