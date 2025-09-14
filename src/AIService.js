import { GoogleGenAI, Modality } from "@google/genai";

export class AIService {
  constructor(apiKey) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  // Create structured JSON prompt for Nano Banana visual prompting
  createJSONPrompt(customPrompt = null) {
    // Default comprehensive visual prompting schema
    const defaultPrompt = {
      "task": "visual_image_enhancement",
      "input_analysis": {
        "canvas_type": "visual_prompting_canvas",
        "contains_instructions": true,
        "instruction_types": ["arrows", "text_annotations", "visual_cues", "markup_elements"],
        "content_identification": "identify_main_subject_and_instructions"
      },
      "instruction_processing": {
        "read_arrows": true,
        "follow_text_annotations": true,
        "interpret_visual_cues": true,
        "understand_composition": true,
        "maintain_creative_intent": true
      },
      "output_requirements": {
        "exclude_from_output": [
          "instruction_arrows",
          "annotation_text", 
          "canvas_interface",
          "toolbars",
          "markup_elements",
          "ui_elements",
          "borders",
          "empty_canvas_space"
        ],
        "include_in_output": "content_only",
        "cropping": {
          "crop_tightly": true,
          "remove_white_space": true,
          "natural_boundaries": true,
          "professional_framing": true
        }
      },
      "quality_standards": {
        "lighting": {
          "consistent_across_elements": true,
          "natural_light_direction": true,
          "harmonious_shadows": true,
          "unified_color_temperature": true
        },
        "integration": {
          "seamless_blending": true,
          "cohesive_style": true,
          "natural_composition": true,
          "professional_finish": true
        },
        "resolution": "maintain_or_enhance",
        "clarity": "maximum_detail_retention"
      },
      "style_preservation": {
        "maintain_artistic_intent": true,
        "preserve_core_composition": true,
        "respect_visual_hierarchy": true,
        "enhance_without_changing_concept": true
      }
    };

    // If custom prompt provided, create a custom JSON structure
    if (customPrompt) {
      return this.createCustomJSONPrompt(customPrompt, defaultPrompt);
    }

    return JSON.stringify(defaultPrompt, null, 2);
  }

  // Convert custom text prompt to structured JSON format
  createCustomJSONPrompt(customPrompt, baseStructure) {
    // Analyze custom prompt to determine the enhancement type
    const prompt = customPrompt.toLowerCase();
    
    let enhancementType = "general_enhancement";
    let styleDirection = "professional_quality";
    let specificRequirements = [];

    // Detect enhancement type from custom prompt
    if (prompt.includes("sketch") || prompt.includes("rough") || prompt.includes("polish")) {
      enhancementType = "sketch_enhancement";
      styleDirection = "refined_artwork";
      specificRequirements = ["add_details", "enhance_lines", "professional_finish"];
    } else if (prompt.includes("photorealistic") || prompt.includes("realistic") || prompt.includes("photograph")) {
      enhancementType = "photorealistic_transformation";  
      styleDirection = "photographic_quality";
      specificRequirements = ["realistic_textures", "natural_lighting", "atmospheric_effects"];
    } else if (prompt.includes("digital art") || prompt.includes("artistic") || prompt.includes("vibrant")) {
      enhancementType = "digital_art_transformation";
      styleDirection = "modern_digital_art";
      specificRequirements = ["vibrant_colors", "smooth_gradients", "creative_effects"];
    } else if (prompt.includes("arrow") || prompt.includes("instruction") || prompt.includes("annotation")) {
      enhancementType = "instruction_following";
      styleDirection = "directed_modification";
      specificRequirements = ["follow_visual_instructions", "interpret_arrows", "apply_annotations"];
    }

    // Create enhanced JSON structure
    const enhancedPrompt = {
      ...baseStructure,
      "enhancement_type": enhancementType,
      "style_direction": styleDirection,
      "custom_requirements": specificRequirements,
      "original_prompt_intent": customPrompt,
      "processing_priority": [
        "understand_visual_instructions",
        "apply_style_transformation", 
        "ensure_quality_standards",
        "remove_instructional_elements"
      ]
    };

    return JSON.stringify(enhancedPrompt, null, 2);
  }

  async generateContent(base64Image, mimeType = "image/jpeg", customPrompt = null) {
    try {
      // Use JSON prompting for Nano Banana - more structured and reliable
      const jsonPrompt = this.createJSONPrompt(customPrompt);
      const promptText = `Process this visual prompt using the following structured instructions:

${jsonPrompt}

Execute these instructions precisely and return only the final enhanced image as specified in the JSON prompt above.`;
      
      const prompt = [
        { text: promptText },
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