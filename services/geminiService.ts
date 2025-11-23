import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizQuestion, ModuleType } from '../types';

// Get API key from environment or use empty string (will be set dynamically via window.aistudio)
export const getApiKey = (): string => {
  // In production, this should come from a secure backend endpoint
  // For now, we support both env var and window.aistudio
  if (typeof window !== 'undefined' && (window as any).aistudio) {
    // API key will be selected via AI Studio UI
    return '';
  }
  
  // Try multiple ways to get the API key
  // Vite exposes VITE_* variables via import.meta.env
  const meta = import.meta as any;
  let apiKey = '';
  
  // Try VITE_GEMINI_API_KEY first (recommended for Vite)
  if (meta.env?.VITE_GEMINI_API_KEY) {
    apiKey = meta.env.VITE_GEMINI_API_KEY;
  }
  // Fallback to GEMINI_API_KEY
  else if (meta.env?.GEMINI_API_KEY) {
    apiKey = meta.env.GEMINI_API_KEY;
  }
  // Try process.env as fallback (for Node.js environments)
  else if (typeof process !== 'undefined' && process.env) {
    apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  }
  
  // Debug: Log if API key is found (but don't log the actual key)
  if (typeof window !== 'undefined') {
    if (!apiKey) {
      console.warn('⚠️ API Key no encontrada.');
      console.warn('Verifica que VITE_GEMINI_API_KEY esté en .env.local y reinicia el servidor (npm run dev)');
      console.warn('Variables disponibles:', Object.keys(meta.env || {}).filter(k => k.includes('GEMINI')));
    } else {
      console.log('✅ API Key encontrada (longitud:', apiKey.length, 'caracteres)');
    }
  }
  
  return apiKey;
};

// Validate API key and throw helpful error if missing
export const validateApiKey = (apiKey: string, operation: string = 'operación'): void => {
  if (!apiKey || apiKey.trim() === '') {
    const errorMessage = `Se requiere una clave API de Gemini para ${operation}.\n\n` +
      `Por favor, configura VITE_GEMINI_API_KEY en tu archivo .env.local:\n\n` +
      `1. Crea o edita el archivo .env.local en la raíz del proyecto\n` +
      `2. Agrega: VITE_GEMINI_API_KEY=tu_clave_api_aqui\n` +
      `3. Reinicia el servidor de desarrollo (npm run dev)\n\n` +
      `Obtén tu clave API en: https://aistudio.google.com/apikey`;
    throw new Error(errorMessage);
  }
};

let ai: GoogleGenAI | null = null;

export const getAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = getApiKey();
    // Validate API key before initializing
    validateApiKey(apiKey, 'usar los servicios de IA');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

// Helper: Add WAVE header to PCM data to make it playable in <audio>
function pcmToWav(pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Blob {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + pcmData.length, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sampleRate * blockAlign)
  view.setUint32(28, sampleRate * numChannels * 2, true);
  // block align (channel count * bytes per sample)
  view.setUint16(32, numChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.length, true);

  // write the PCM samples
  const pcmDataView = new Uint8Array(buffer, 44);
  pcmDataView.set(pcmData);

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Extract text content from a PDF or image file using Gemini AI
 * This function reads the document and returns the extracted text
 */
export const extractTextFromFile = async (
  fileData: { mimeType: string; data: string }
): Promise<string> => {
  try {
    // Validate API key before proceeding
    const apiKey = getApiKey();
    validateApiKey(apiKey, 'extraer texto del documento');
    
    const parts = [
      { 
        text: "Extrae y devuelve TODO el texto del documento adjunto. Preserva la estructura y el formato cuando sea posible. Si el documento está en otro idioma, tradúcelo al Español. Responde SOLO con el texto extraído, sin comentarios adicionales." 
      },
      { 
        inlineData: { 
          mimeType: fileData.mimeType, 
          data: fileData.data 
        } 
      }
    ];

    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
    });

    if (response.text) {
      return response.text.trim();
    }
    
    throw new Error("No text extracted from document");
  } catch (error: any) {
    console.error("Failed to extract text from file:", error);
    // Re-throw with original message if it's our validation error
    if (error.message && error.message.includes('Se requiere una clave API')) {
      throw error;
    }
    throw new Error(`Error al extraer texto: ${error.message || 'Error desconocido'}`);
  }
};

export const generateQuizFromContent = async (
  input: string | { mimeType: string; data: string }
): Promise<QuizQuestion[]> => {
  try {
    // Validate API key before proceeding
    const apiKey = getApiKey();
    validateApiKey(apiKey, 'generar el cuestionario');
    let parts: any[] = [];
    
    if (typeof input === 'string') {
      parts = [{ text: `Genera un cuestionario de opción múltiple basado en el siguiente material de capacitación.
      Crea de 5 a 8 preguntas desafiantes para evaluar la comprensión.
      El idioma de salida debe ser Español.
      
      Material de Capacitación:
      ${input.substring(0, 20000)}` }];
    } else {
      parts = [
        { text: "Genera un cuestionario de opción múltiple basado en el material de capacitación adjunto. Crea de 3 a 5 preguntas desafiantes para evaluar la comprensión. El idioma de salida debe ser Español." },
        { inlineData: { mimeType: input.mimeType, data: input.data } }
      ];
    }

    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correctAnswerIndex: { 
                type: Type.INTEGER, 
                description: "El índice basado en cero de la opción correcta" 
              }
            },
            required: ["question", "options", "correctAnswerIndex"]
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as QuizQuestion[];
    }
    return [];
  } catch (error: any) {
    console.error("Failed to generate quiz:", error);
    // Re-throw with original message if it's our validation error
    if (error.message && error.message.includes('Se requiere una clave API')) {
      throw error;
    }
    throw new Error(`Error al generar cuestionario: ${error.message || 'Error desconocido'}`);
  }
};

export const generatePodcast = async (content: string): Promise<string> => {
  try {
    // Validate API key before proceeding
    const apiKey = getApiKey();
    validateApiKey(apiKey, 'generar el podcast');
    // 1. Generate Script
    const scriptResponse = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Escribe un guion de podcast corto e informativo (aprox. 1 minuto) en Español entre dos anfitriones (Ana y Carlos) resumiendo los puntos clave del siguiente texto para empleados:
      
      ${content.substring(0, 10000)}`
    });
    
    const script = scriptResponse.text || content;

    // 2. Generate Audio (Multi-speaker)
    // Note: Using gemini-2.5-flash-preview-tts with specific voices
    const audioResponse = await getAI().models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              { speaker: 'Ana', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              { speaker: 'Carlos', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } }
            ]
          }
        }
      }
    });

    const base64Audio = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio generated");

    const pcmBytes = base64ToUint8Array(base64Audio);
    const wavBlob = pcmToWav(pcmBytes);
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(wavBlob);
    });
  } catch (error) {
    console.error("Podcast generation failed:", error);
    throw error;
  }
};

export const generateDiagram = async (content: string): Promise<string> => {
  try {
    // Validate API key before proceeding
    const apiKey = getApiKey();
    validateApiKey(apiKey, 'generar el diagrama');
    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Crea un diagrama educativo visual, plano y profesional que explique estos conceptos clave en Español: ${content.substring(0, 1000)}. Estilo corporativo, limpio, fondo blanco.` }] },
    });

    for (const part of response.candidates![0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Diagram generation failed:", error);
    throw error;
  }
};

export const generateVideo = async (content: string): Promise<string> => {
  try {
    // Validate API key before proceeding
    const apiKey = getApiKey();
    validateApiKey(apiKey, 'generar el video');
    
    // 1. Generate Prompt for Veo
    const promptResponse = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Describe una escena visual cinematográfica de 5 segundos para un video corporativo que represente el siguiente concepto. Solo describe la imagen visual en inglés (para mejor compatibilidad con el modelo de video): ${content.substring(0, 500)}`
    });
    
    const videoPrompt = promptResponse.text || "Corporate training concept visualization";

    // 2. Call Veo
    // Note: Video generation requires a paid API key
    // API key is already validated above
    const freshAi = new GoogleGenAI({ apiKey });
    
    let operation = await freshAi.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: videoPrompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    // Poll for completion
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await freshAi.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation returned no URI");

    // Fetch the actual video bytes to display
    const videoRes = await fetch(`${downloadLink}&key=${apiKey}`);
    const blob = await videoRes.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
};