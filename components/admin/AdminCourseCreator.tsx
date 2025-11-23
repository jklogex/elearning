import React, { useState, useRef } from 'react';
import { Icons } from '../Icon';
import { Course, CourseModule, ModuleType } from '../../types';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { extractCourseInfo, transcribeAudio, processCourseInBackground } from '../../services/courseProcessingService';

interface AdminCourseCreatorProps {
  onSave: (course: Course & { extractedText?: string; genOptions?: any }) => void;
  onCancel: () => void;
}

export const AdminCourseCreator: React.FC<AdminCourseCreatorProps> = ({ onSave, onCancel }) => {
  // Source selection
  const [sourceType, setSourceType] = useState<'document' | 'url'>('document');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  // Auto-filled fields (from AI extraction)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [extractedText, setExtractedText] = useState<string>('');
  
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

  // Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("Archivo demasiado grande (Máximo 10MB)");
      return;
    }

    setUploadedFile(file);
    
    // Convert to data URL for preview and extract info
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setFileDataUrl(dataUrl);
      
      // Auto-extract course info
      setIsProcessing(true);
      setProcessingStatus('Extrayendo información del documento...');
      
      try {
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          const info = await extractCourseInfo('document', { mimeType, data: base64Data });
          setTitle(info.title);
          setCategory(info.category);
          setDescription(info.description);
          setExtractedText(info.extractedText);
        }
      } catch (error: any) {
        console.error('Error extracting course info:', error);
        if (error.message && error.message.includes('Se requiere una clave API')) {
          alert(error.message);
        } else {
          alert('Error al extraer información del documento. Puedes completar los campos manualmente.');
        }
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle URL input
  const handleUrlProcess = async () => {
    if (!urlInput.trim()) {
      alert('Por favor, ingresa una URL válida');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Procesando URL...');
    
    try {
      const info = await extractCourseInfo('url', urlInput);
      setTitle(info.title);
      setCategory(info.category);
      setDescription(info.description);
      setExtractedText(info.extractedText);
    } catch (error: any) {
      console.error('Error processing URL:', error);
      alert('Error al procesar la URL. Puedes completar los campos manualmente.');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
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
      setDescription(transcribedText);
      clearRecording();
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      if (error.message && error.message.includes('Se requiere una clave API')) {
        alert(error.message);
      } else {
        alert('Error al transcribir el audio. Puedes escribir la descripción manualmente.');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Handle course creation
  const handleCreateCourse = async () => {
    if (!title.trim()) {
      alert('Por favor, ingresa un título para el curso');
      return;
    }

    if (!extractedText && sourceType === 'document' && !uploadedFile) {
      alert('Por favor, sube un documento o proporciona una URL');
      return;
    }

    // Create initial course with source content
    const initialModules: CourseModule[] = [];
    
    if (sourceType === 'document' && fileDataUrl) {
      // Add uploaded document as first module
      const matches = fileDataUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        initialModules.push({
          id: `source-${Date.now()}`,
          title: uploadedFile?.name || 'Documento del Curso',
          description: 'Documento fuente del curso',
          type: ModuleType.DOCUMENT,
          contentUrl: fileDataUrl,
          quiz: []
        });
      }
    } else if (sourceType === 'url' && urlInput) {
      // Add URL as video/audio module
      const isVideo = urlInput.includes('youtube.com') || urlInput.includes('youtu.be') || urlInput.includes('vimeo.com');
      const isAudio = urlInput.includes('.mp3') || urlInput.includes('.wav') || urlInput.includes('soundcloud.com');
      
      initialModules.push({
        id: `source-${Date.now()}`,
        title: isVideo ? 'Video del Curso' : isAudio ? 'Podcast del Curso' : 'Recurso del Curso',
        description: 'Recurso fuente del curso',
        type: isVideo ? ModuleType.VIDEO : isAudio ? ModuleType.AUDIO : ModuleType.DOCUMENT,
        contentUrl: urlInput,
        quiz: []
      });
    }

    const courseData: Course & { extractedText?: string; genOptions?: any } = {
      id: `c-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Curso de capacitación',
      category: category || 'General',
      thumbnail: 'https://picsum.photos/400/225',
      modules: initialModules,
      passThreshold: 70,
      extractedText: extractedText,
      genOptions: genOptions
    };

    onSave(courseData);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Crear Nuevo Curso</h2>
        <button onClick={onCancel}><Icons.X className="text-slate-500 hover:text-slate-700" /></button>
      </div>

      {/* Step 1: Source Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Selecciona la Fuente de Contenido</h3>
        
        <div className="flex space-x-4 mb-4">
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              checked={sourceType === 'document'} 
              onChange={() => setSourceType('document')} 
              className="mr-2"
            />
            <Icons.File className="mr-2" size={18} />
            Documento Local
          </label>
          <label className="flex items-center cursor-pointer">
            <input 
              type="radio" 
              checked={sourceType === 'url'} 
              onChange={() => setSourceType('url')} 
              className="mr-2"
            />
            <Icons.Link className="mr-2" size={18} />
            URL de Video/Podcast
          </label>
        </div>

        {sourceType === 'document' ? (
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
        ) : (
          <div className="flex gap-2">
            <input 
              type="text" 
              value={urlInput} 
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=... o https://..."
              className="flex-1 p-2 border rounded-lg"
            />
            <button 
              onClick={handleUrlProcess}
              className="bg-brand-50 text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-100"
            >
              Procesar
            </button>
          </div>
        )}
      </div>

      {/* Step 2: Auto-filled Course Fields */}
      <div className="mb-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Información del Curso (Completada automáticamente)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full p-2 border rounded-lg" 
              placeholder="Título del Curso (se completa automáticamente)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              className="w-full p-2 border rounded-lg"
            >
              <option>General</option>
              <option>Seguridad</option>
              <option>RR.HH.</option>
              <option>Ventas</option>
              <option>Tecnología</option>
            </select>
          </div>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <div className="flex gap-2">
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className="flex-1 p-2 border rounded-lg" 
              rows={3} 
              placeholder="Descripción del curso (se completa automáticamente o graba con el micrófono)"
            />
            <div className="flex flex-col gap-2">
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
                    <audio src={audioUrl} controls className="w-full" />
                  )}
                  <button
                    onClick={handleTranscribeAudio}
                    disabled={isProcessing}
                    className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                  >
                    Transcribir
                  </button>
                  <button
                    onClick={clearRecording}
                    className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded hover:bg-red-100"
                  >
                    Limpiar
                  </button>
                </>
              )}
            </div>
          </div>
          {audioError && (
            <p className="mt-1 text-sm text-red-600">{audioError}</p>
          )}
        </div>
      </div>

      {/* Step 3: Content Generation Options */}
      <div className="mb-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">3. Opciones de Generación de Contenido</h3>
        
        <div className="bg-slate-50 p-4 rounded-lg">
          <p className="text-sm text-slate-600 mb-4">
            Selecciona qué contenido adicional deseas generar automáticamente en segundo plano:
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
      {isProcessing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-700 flex items-center">
            <Icons.Clock className="mr-2" size={18} />
            {processingStatus}
          </p>
        </div>
      )}

      {/* Create Course Button */}
      <button 
        onClick={handleCreateCourse}
        disabled={isProcessing || !title.trim()}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? 'Procesando...' : 'Crear Curso y Generar Contenido'}
      </button>
      
      <p className="mt-2 text-xs text-slate-500 text-center">
        El curso se guardará inmediatamente y el contenido se generará en segundo plano
      </p>
    </div>
  );
};

