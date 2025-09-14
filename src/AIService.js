import { GoogleGenAI, Modality } from "@google/genai";

export class AIService {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateContent(base64Image, mimeType = "image/jpeg") {
    try {
      const prompt = [
        { text: "This is a canvas screenshot with instruction arrows and text annotations that tell you what to create or modify. READ and FOLLOW the arrows and text instructions, but DO NOT include them in your output. Generate the final image based on the instructions, but exclude: all instruction arrows, annotation text, UI elements, canvas interface, toolbars, and annotation markings. IMPORTANT: Crop tightly around the actual content - remove ALL empty white canvas space, borders, and padding. Return only the essential image content itself, properly cropped to its natural boundaries with no excess white space. Ensure ALL elements have consistent lighting, shadows, color temperature, and visual style - everything should look naturally integrated and cohesive, not like separate pasted elements. The final image should feel unified with harmonious lighting and seamless blending of all components." },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
      ];

      const response = await this.ai.models.generateContent({
        model: "gemini-2.5-flash-image-preview",
        contents: prompt,
      });

      // Process the response following your exact pattern
      const results = {
        text: null,
        image: null,
      };

      if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            results.text = part.text;
          } else if (part.inlineData) {
            results.image = part.inlineData.data;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('AI generation error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}

export default AIService;