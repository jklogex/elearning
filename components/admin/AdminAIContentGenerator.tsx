import React, { useState, useRef } from 'react';
import { Icons } from '../Icon';
import { Course, ModuleType } from '../../types';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { extractTextFromFile } from '../../services/geminiService';
import { extractCourseInfo, transcribeAudio, processCourseInBackground } from '../../services/courseProcessingService';

interface AdminAIContentGeneratorProps {
  courses: Course[];
  onBack: () => void;
  onCourseUpdated?: () => void; // Callback to refresh courses
}

export const AdminAIContentGenerator: React.FC<AdminAIContentGeneratorProps> = ({ courses, onBack, onCourseUpdated }) => {
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [sourceType, setSourceType] = useState<'document' | 'url' | 'existing'>('existing');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  const [extractedText, setExtractedText] = useState<string>('');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  // Audio recording for description
  const { 
    isRecording, 
    audioBlob, 
    audioUrl, 
    startRecording, 
    stopRecording, 
    clearRecording,
    error: audioError 
  } = useAudioRecorder();
  
  // Content generation options
  const [genOptions, setGenOptions] = useState({
    generateQuiz: true,
    generatePodcast: false,
    generateDiagram: true,
    generateVideo: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedCourse = courses.find(c => c.id === selectedCourseId);

  // Handle file upload and extract text
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("Archivo demasiado grande (Máximo 10MB)");
      return;
    }

    setUploadedFile(file);
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setFileDataUrl(dataUrl);
      
      // Extract text from document
      setIsProcessing(true);
      setProcessingStatus('Extrayendo texto del documento...');
      
      try {
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          const text = await extractTextFromFile({ mimeType, data: base64Data });
          setExtractedText(text);
          setProcessingStatus('Texto extraído exitosamente');
        }
      } catch (error: any) {
        console.error('Error extracting text:', error);
        if (error.message && error.message.includes('Se requiere una clave API')) {
          alert(error.message);
        } else {
          alert('Error al extraer texto del documento. Verifica que el archivo sea válido.');
        }
      } finally {
        setIsProcessing(false);
        setTimeout(() => setProcessingStatus(''), 2000);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL processing
  const handleUrlProcess = async () => {
    if (!urlInput.trim()) {
      alert('Por favor, ingresa una URL válida');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Procesando URL...');
    
    try {
      const info = await extractCourseInfo('url', urlInput);
      setExtractedText(info.extractedText);
      setProcessingStatus('URL procesada exitosamente');
    } catch (error: any) {
      console.error('Error processing URL:', error);
      alert('Error al procesar la URL. Verifica que sea una URL válida.');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(''), 2000);
    }
  };

  // Handle audio transcription
  const handleTranscribeAudio = async () => {
    if (!audioBlob) {
      alert('No hay audio grabado');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Transcribiendo audio...');
    
    try {
      const transcribedText = await transcribeAudio(audioBlob);
      setExtractedText(transcribedText);
      clearRecording();
      setProcessingStatus('Audio transcrito exitosamente');
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      if (error.message && error.message.includes('Se requiere una clave API')) {
        alert(error.message);
      } else {
        alert('Error al transcribir el audio. Puedes escribir el texto manualmente.');
      }
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(''), 2000);
    }
  };

  // Handle content generation
  const handleGenerateContent = async () => {
    if (!selectedCourseId) {
      alert('Por favor, selecciona un curso');
      return;
    }

    if (!extractedText.trim() && sourceType !== 'existing') {
      alert('Por favor, proporciona contenido (documento, URL o audio) para generar contenido');
      return;
    }

    // If using existing course content, extract text from first module
    let textToUse = extractedText;
    if (sourceType === 'existing' && selectedCourse) {
      // Try to extract text from the first document module
      const firstDocModule = selectedCourse.modules.find(m => 
        (m.type === 'DOCUMENT' || m.type === ModuleType.DOCUMENT) && m.contentUrl
      );
      
      if (firstDocModule?.contentUrl) {
        setIsProcessing(true);
        setProcessingStatus('Extrayendo texto del módulo existente...');
        try {
          // Check if it's a data URL
          if (firstDocModule.contentUrl.startsWith('data:')) {
            const matches = firstDocModule.contentUrl.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              textToUse = await extractTextFromFile({ mimeType, data: base64Data });
            } else {
              textToUse = firstDocModule.textContent || '';
            }
          } else if (firstDocModule.contentUrl.startsWith('http')) {
            // It's a Storage URL - use textContent if available (extracted when file was uploaded)
            // This avoids CORS issues with downloading from Storage
            console.log('File is in Storage, checking for extracted text...');
            if (firstDocModule.textContent && firstDocModule.textContent.trim().length > 0) {
              console.log('Using pre-extracted text from module, length:', firstDocModule.textContent.length);
              textToUse = firstDocModule.textContent;
            } else {
              console.warn('No extracted text available. Please upload the document again or use the "Subir Documento" option to extract text.');
              alert('El documento no tiene texto extraído. Por favor, usa la opción "Subir Documento" para generar contenido, o vuelve a subir el documento para extraer su texto.');
              setIsProcessing(false);
              return;
            }
          } else {
            textToUse = firstDocModule.textContent || '';
          }
        } catch (error) {
          console.error('Error extracting from module:', error);
          textToUse = firstDocModule.textContent || '';
        } finally {
          setIsProcessing(false);
        }
      } else {
        textToUse = selectedCourse.modules[0]?.textContent || selectedCourse.description || '';
      }
    }

    if (!textToUse.trim()) {
      alert('No se pudo obtener contenido para generar. Por favor, proporciona un documento o texto.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Generando contenido con IA...');
    
    try {
      await processCourseInBackground(selectedCourseId, textToUse, genOptions);
      alert('Contenido generado exitosamente. Los módulos se agregarán al curso en breve. Por favor, espera unos segundos y recarga la página o navega de nuevo al curso.');
      
      // Refresh courses after a delay to allow Firestore to update
      // Multiple refreshes to catch the updates
      if (onCourseUpdated) {
        setTimeout(() => {
          onCourseUpdated();
        }, 2000);
        setTimeout(() => {
          onCourseUpdated();
        }, 5000);
        setTimeout(() => {
          onCourseUpdated();
        }, 10000);
      }
      
      // Reset form
      setExtractedText('');
      setUploadedFile(null);
      setFileDataUrl('');
      setUrlInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      console.error('Error generating content:', error);
      alert(`Error al generar contenido: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Generador de Contenido IA</h2>
        <button onClick={onBack}><Icons.X className="text-slate-500 hover:text-slate-700" /></button>
      </div>

      {/* Step 1: Select Course */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Seleccionar Curso</h3>
        <select 
          value={selectedCourseId} 
          onChange={e => setSelectedCourseId(e.target.value)}
          className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Elige un curso...</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        {selectedCourse && (
          <p className="mt-2 text-sm text-slate-500">
            Curso seleccionado: {selectedCourse.title} ({selectedCourse.modules.length} módulos)
          </p>
        )}
      </div>

      {/* Step 2: Source Selection */}
      <div className="mb-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Fuente de Contenido</h3>
        
        <div className="flex space-x-4 mb-4">
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              checked={sourceType === 'existing'} 
              onChange={() => setSourceType('existing')} 
              className="mr-2"
            />
            <Icons.FileText className="mr-2" size={18} />
            Usar contenido del curso
          </label>
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              checked={sourceType === 'document'} 
              onChange={() => setSourceType('document')} 
              className="mr-2"
            />
            <Icons.File className="mr-2" size={18} />
            Subir Documento
          </label>
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              checked={sourceType === 'url'} 
              onChange={() => setSourceType('url')} 
              className="mr-2"
            />
            <Icons.Link className="mr-2" size={18} />
            URL
          </label>
        </div>

        {sourceType === 'document' && (
          <div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            {uploadedFile && (
              <p className="mt-2 text-sm text-green-600">
                ✓ Archivo seleccionado: {uploadedFile.name}
              </p>
            )}
          </div>
        )}

        {sourceType === 'url' && (
          <div className="flex gap-2">
            <input 
              type="text" 
              value={urlInput} 
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://..."
              className="flex-1 p-2 border rounded-lg"
            />
            <button 
              onClick={handleUrlProcess}
              disabled={isProcessing}
              className="bg-brand-50 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-100 disabled:opacity-50"
            >
              Procesar
            </button>
          </div>
        )}

        {sourceType === 'existing' && selectedCourse && (
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600">
              Se usará el contenido del primer módulo del curso para generar nuevo contenido.
            </p>
          </div>
        )}

        {/* Audio transcription option */}
        <div className="mt-4 p-4 border border-slate-200 rounded-lg">
          <label className="block text-sm font-medium text-slate-700 mb-2">O grabar audio para transcribir</label>
          <div className="flex gap-2 items-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-4 py-2 rounded-lg font-medium ${
                isRecording 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
              }`}
            >
              {isRecording ? <Icons.MicOff size={20} /> : <Icons.Mic size={20} />}
            </button>
            {audioBlob && (
              <>
                {audioUrl && (
                  <audio src={audioUrl} controls className="flex-1" />
                )}
                <button
                  onClick={handleTranscribeAudio}
                  disabled={isProcessing}
                  className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded hover:bg-green-100 disabled:opacity-50"
                >
                  Transcribir
                </button>
                <button
                  onClick={clearRecording}
                  className="text-sm bg-red-50 text-red-700 px-3 py-1 rounded hover:bg-red-100"
                >
                  Limpiar
                </button>
              </>
            )}
          </div>
          {audioError && (
            <p className="mt-2 text-sm text-red-600">{audioError}</p>
          )}
        </div>

        {extractedText && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium mb-2">Texto extraído ({extractedText.length} caracteres):</p>
            <p className="text-sm text-green-600 line-clamp-3">{extractedText.substring(0, 200)}...</p>
          </div>
        )}
      </div>

      {/* Step 3: Content Generation Options */}
      <div className="mb-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Opciones de Generación</h3>
        
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 mb-4">
            Selecciona qué contenido deseas generar automáticamente:
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={genOptions.generateQuiz} 
                onChange={e => setGenOptions({...genOptions, generateQuiz: e.target.checked})} 
                className="mr-2"
              />
              <Icons.FileText size={18} className="mr-2" />
              Cuestionario
            </label>
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={genOptions.generateDiagram} 
                onChange={e => setGenOptions({...genOptions, generateDiagram: e.target.checked})} 
                className="mr-2"
              />
              <Icons.FileText size={18} className="mr-2" />
              Diagrama
            </label>
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={genOptions.generatePodcast} 
                onChange={e => setGenOptions({...genOptions, generatePodcast: e.target.checked})} 
                className="mr-2"
              />
              <Icons.Headphones size={18} className="mr-2" />
              Podcast
            </label>
            <label className="flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={genOptions.generateVideo} 
                onChange={e => setGenOptions({...genOptions, generateVideo: e.target.checked})} 
                className="mr-2"
              />
              <Icons.Video size={18} className="mr-2" />
              Video
            </label>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      {isProcessing && processingStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 flex items-center">
            <Icons.Clock className="mr-2" size={18} />
            {processingStatus}
          </p>
        </div>
      )}

      {/* Generate Button */}
      <button 
        onClick={handleGenerateContent}
        disabled={isProcessing || !selectedCourseId || (!extractedText.trim() && sourceType !== 'existing')}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Generando...' : 'Generar Contenido con IA'}
      </button>
      
      <p className="mt-2 text-xs text-slate-500 text-center">
        El contenido se generará en segundo plano y se agregará al curso seleccionado
      </p>
    </div>
  );
};

