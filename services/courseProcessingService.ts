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
      contents: [{
        parts: [
          { text: 'Transcribe el siguiente audio a texto en Español. Responde solo con el texto transcrito, sin comentarios adicionales.' },
          { inlineData: { mimeType: 'audio/webm', data: base64Audio } }
        ]
      }]
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
          // Clean quiz to ensure all items are valid
          const cleanedQuiz = quiz
            .filter((q: any) => {
              return q && 
                     typeof q === 'object' && 
                     q.question && 
                     typeof q.question === 'string' &&
                     Array.isArray(q.options) &&
                     q.options.length > 0;
            })
            .map((q: any) => ({
              question: String(q.question || ''),
              options: Array.isArray(q.options) 
                ? q.options
                    .filter((opt: any) => opt != null && opt !== '')
                    .map((opt: any) => String(opt))
                : [],
              correctAnswerIndex: typeof q.correctAnswerIndex === 'number' 
                ? Math.max(0, Math.min(q.correctAnswerIndex, (q.options?.length || 1) - 1))
                : 0
            }));
          
          if (cleanedQuiz.length > 0) {
            // Add quiz to first module or create a quiz module
            updates.modules = [
              {
                id: `quiz-${Date.now()}`,
                title: 'Cuestionario de Evaluación',
                description: 'Cuestionario generado automáticamente',
                type: ModuleType.DOCUMENT,
                quiz: cleanedQuiz,
                textContent: 'Complete el cuestionario para evaluar su comprensión.'
              }
            ];
          }
        }
      } catch (error) {
        console.error('Error generating quiz:', error);
      }
    }

    // Generate podcast if requested
    if (options.generatePodcast) {
      try {
        console.log('Generating podcast...');
        const audioDataUrl = await generatePodcast(extractedText);
        console.log('Podcast generated, uploading to Storage...');
        
        // Convert data URL to Blob and upload to Storage
        const response = await fetch(audioDataUrl);
        const blob = await response.blob();
        const audioFile = new File([blob], `podcast-${Date.now()}.wav`, { type: 'audio/wav' });
        
        // Upload to Storage
        const { uploadCourseFile } = await import('../lib/firebase/storage');
        const storageUrl = await uploadCourseFile(audioFile, courseId);
        console.log('Podcast uploaded to Storage, URL:', storageUrl);
        
        const podcastModule = {
          id: `pod-${Date.now()}`,
          title: 'Podcast del Curso',
          description: 'Podcast generado por IA',
          type: 'AUDIO' as const, // Use string literal instead of enum
          contentUrl: storageUrl,
          quiz: [] as any[]
        };
        
        console.log('Podcast module created:', podcastModule);
        modules.push(podcastModule);
      } catch (error) {
        console.error('Error generating podcast:', error);
      }
    }

    // Generate diagram if requested
    if (options.generateDiagram) {
      try {
        console.log('Generating diagram...');
        const imgDataUrl = await generateDiagram(extractedText);
        console.log('Diagram generated, uploading to Storage...');
        
        // Convert data URL to Blob and upload to Storage
        const response = await fetch(imgDataUrl);
        const blob = await response.blob();
        const imgFile = new File([blob], `diagram-${Date.now()}.png`, { type: 'image/png' });
        
        // Upload to Storage
        const { uploadCourseFile } = await import('../lib/firebase/storage');
        const storageUrl = await uploadCourseFile(imgFile, courseId);
        console.log('Diagram uploaded to Storage, URL:', storageUrl);
        
        const diagramModule = {
          id: `diag-${Date.now()}`,
          title: 'Diagrama Visual',
          description: 'Diagrama generado por IA',
          type: 'DOCUMENT' as const, // Use string literal instead of enum
          contentUrl: storageUrl,
          quiz: [] as any[]
        };
        
        console.log('Diagram module created:', diagramModule);
        modules.push(diagramModule);
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
      console.log(`Updating course ${courseId} with ${modules.length} new modules from modules array`);
      if (updates.modules) {
        console.log(`Also have ${updates.modules.length} modules from updates.modules`);
      }
      const { getCourse } = await import('../lib/firebase/firestore');
      const currentCourse = await getCourse(courseId);
      if (currentCourse) {
        const existingModules = currentCourse.modules || [];
        console.log(`Existing modules: ${existingModules.length}`);
        
        // Merge all modules: existing + modules (podcast, diagram, etc.) + quiz (last)
        // Quiz should always be the last module
        const allModules = [
          ...existingModules,
          ...modules,
          ...(updates.modules || [])  // Quiz goes last
        ];
        
        console.log(`Total modules after merge: ${allModules.length}`);
        console.log('Modules to save:', allModules.map(m => ({ id: m.id, title: m.title, type: m.type, hasContentUrl: !!m.contentUrl })));
        
        await updateCourse(courseId, { modules: allModules });
        console.log('Course updated successfully');
      } else {
        console.error(`Course ${courseId} not found`);
      }
    } else {
      console.log('No modules to add');
    }
  } catch (error) {
    console.error('Error processing course in background:', error);
    // Don't throw - background processing should be fire-and-forget
  }
};

