/**
 * Service for processing courses in the background
 * Handles automatic field extraction and content generation
 */

import { extractTextFromFile, generateQuizFromContent, generatePodcast, generateDiagram, generateVideo } from './geminiService';
import { Course, CourseModule, ModuleType } from '../types';
import { updateCourse } from '../lib/firebase/firestore';

/**
 * Extract course information from document or URL
 */
export const extractCourseInfo = async (
  sourceType: 'document' | 'url',
  sourceData: string | { mimeType: string; data: string }
): Promise<{
  title: string;
  description: string;
  category: string;
  extractedText: string;
}> => {
  try {
    let extractedText = '';
    
    if (sourceType === 'document') {
      // Extract text from uploaded document
      const fileData = sourceData as { mimeType: string; data: string };
      extractedText = await extractTextFromFile(fileData);
    } else {
      // For URLs, we'll extract metadata (this would need to be enhanced)
      extractedText = `Contenido de: ${sourceData}`;
    }

    // Use Gemini to extract structured information
    const geminiService = await import('./geminiService');
    const apiKey = geminiService.getApiKey();
    geminiService.validateApiKey(apiKey, 'extraer información del curso');

    const prompt = `Analiza el siguiente contenido y extrae información para un curso de capacitación:

${extractedText.substring(0, 15000)}

Proporciona la siguiente información en formato JSON:
{
  "title": "Título sugerido para el curso (máximo 60 caracteres)",
  "description": "Descripción breve del curso (2-3 oraciones)",
  "category": "Una de estas categorías: General, Seguridad, RR.HH., Ventas, Tecnología"
}`;

    const response = await geminiService.getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    if (response.text) {
      const info = JSON.parse(response.text);
      return {
        title: info.title || 'Nuevo Curso',
        description: info.description || '',
        category: info.category || 'General',
        extractedText
      };
    }

    // Fallback
    return {
      title: 'Nuevo Curso',
      description: extractedText.substring(0, 200) + '...',
      category: 'General',
      extractedText
    };
  } catch (error) {
    console.error('Error extracting course info:', error);
    throw error;
  }
};

/**
 * Transcribe audio to text using Gemini
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  try {
    const geminiService = await import('./geminiService');
    const apiKey = geminiService.getApiKey();
    geminiService.validateApiKey(apiKey, 'transcribir audio');

    // Convert blob to base64
    const base64Audio = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });

    const response = await geminiService.getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: 'Transcribe el siguiente audio a texto en Español. Responde solo con el texto transcrito, sin comentarios adicionales.' },
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
        ]
      }
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

/**
 * Process course in background - generate content asynchronously
 */
export const processCourseInBackground = async (
  courseId: string,
  extractedText: string,
  options: {
    generateQuiz?: boolean;
    generatePodcast?: boolean;
    generateDiagram?: boolean;
    generateVideo?: boolean;
  }
): Promise<void> => {
  try {
    const modules: CourseModule[] = [];
    const updates: Partial<Course> = {};

    // Generate quiz if requested
    if (options.generateQuiz) {
      try {
        const quiz = await generateQuizFromContent(extractedText);
        if (quiz.length > 0) {
          // Add quiz to first module or create a quiz module
          updates.modules = [
            {
              id: `quiz-${Date.now()}`,
              title: 'Cuestionario de Evaluación',
              description: 'Cuestionario generado automáticamente',
              type: ModuleType.DOCUMENT,
              quiz,
              textContent: 'Complete el cuestionario para evaluar su comprensión.'
            }
          ];
        }
      } catch (error) {
        console.error('Error generating quiz:', error);
      }
    }

    // Generate podcast if requested
    if (options.generatePodcast) {
      try {
        const audioData = await generatePodcast(extractedText);
        modules.push({
          id: `pod-${Date.now()}`,
          title: 'Podcast del Curso',
          description: 'Podcast generado por IA',
          type: ModuleType.AUDIO,
          contentUrl: audioData,
          quiz: []
        });
      } catch (error) {
        console.error('Error generating podcast:', error);
      }
    }

    // Generate diagram if requested
    if (options.generateDiagram) {
      try {
        const imgData = await generateDiagram(extractedText);
        modules.push({
          id: `diag-${Date.now()}`,
          title: 'Diagrama Visual',
          description: 'Diagrama generado por IA',
          type: ModuleType.DOCUMENT,
          contentUrl: imgData,
          quiz: []
        });
      } catch (error) {
        console.error('Error generating diagram:', error);
      }
    }

    // Generate video if requested
    if (options.generateVideo) {
      try {
        const videoData = await generateVideo(extractedText);
        modules.push({
          id: `vid-${Date.now()}`,
          title: 'Video del Curso',
          description: 'Video generado por IA',
          type: ModuleType.VIDEO,
          contentUrl: videoData,
          quiz: []
        });
      } catch (error) {
        console.error('Error generating video:', error);
      }
    }

    // Update course with generated modules
    if (modules.length > 0 || updates.modules) {
      const { getCourse } = await import('../lib/firebase/firestore');
      const currentCourse = await getCourse(courseId);
      if (currentCourse) {
        const existingModules = currentCourse.modules || [];
        const allModules = updates.modules ? [...existingModules, ...updates.modules] : [...existingModules, ...modules];
        await updateCourse(courseId, { modules: allModules });
      }
    }
  } catch (error) {
    console.error('Error processing course in background:', error);
    // Don't throw - background processing should be fire-and-forget
  }
};

