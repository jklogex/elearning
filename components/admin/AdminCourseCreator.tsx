import React, { useState, useRef } from 'react';
import { Icons } from '../Icon';
import { Course, CourseModule, ModuleType } from '../../types';
import { uploadCourseFile } from '../../lib/firebase/storage';

interface AdminCourseCreatorProps {
  onSave: (course: Course, file?: File) => Promise<void>;
  onCancel: () => void;
}

export const AdminCourseCreator: React.FC<AdminCourseCreatorProps> = ({ onSave, onCancel }) => {
  // Source selection
  const [sourceType, setSourceType] = useState<'document' | 'url'>('document');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  
  // Course fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("Archivo demasiado grande (Máximo 10MB)");
      return;
    }

    setUploadedFile(file);
    
    // Auto-fill title from filename if empty
    if (!title.trim()) {
      const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileNameWithoutExt);
    }
  };

  // Handle course creation
  const handleCreateCourse = async () => {
    if (!title.trim()) {
      alert('Por favor, ingresa un título para el curso');
      return;
    }

    // Create initial course with source content
    const initialModules: CourseModule[] = [];
    
    if (sourceType === 'document' && uploadedFile) {
      // File will be uploaded to Storage after course creation
      // For now, create module placeholder
      initialModules.push({
        id: `source-${Date.now()}`,
        title: uploadedFile.name || 'Documento del Curso',
        description: 'Documento fuente del curso',
        type: ModuleType.DOCUMENT,
        contentUrl: '', // Will be updated after upload
        quiz: []
      });
    } else if (sourceType === 'url' && urlInput.trim()) {
      // Add URL as video/audio module
      const isVideo = urlInput.includes('youtube.com') || urlInput.includes('youtu.be') || urlInput.includes('vimeo.com');
      const isAudio = urlInput.includes('.mp3') || urlInput.includes('.wav') || urlInput.includes('soundcloud.com');
      
      initialModules.push({
        id: `source-${Date.now()}`,
        title: isVideo ? 'Video del Curso' : isAudio ? 'Podcast del Curso' : 'Recurso del Curso',
        description: 'Recurso fuente del curso',
        type: isVideo ? ModuleType.VIDEO : isAudio ? ModuleType.AUDIO : ModuleType.DOCUMENT,
        contentUrl: urlInput.trim(),
        quiz: []
      });
    }

    const courseData: Course = {
      id: `c-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || 'Curso de capacitación',
      category: category || 'General',
      thumbnail: 'https://picsum.photos/400/225',
      modules: initialModules,
      passThreshold: 70
    };

    // Pass the file separately so it can be uploaded to Storage
    await onSave(courseData, sourceType === 'document' && uploadedFile ? uploadedFile : undefined);
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Crear Nuevo Curso</h2>
        <button onClick={onCancel}><Icons.X className="text-slate-500 hover:text-slate-700" /></button>
      </div>

      {/* Step 1: Source Selection */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">1. Agregar Contenido (Opcional)</h3>
        
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
          <div>
            <input 
              type="text" 
              value={urlInput} 
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://youtube.com/watch?v=... o https://..."
              className="w-full p-2 border rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Step 2: Course Information */}
      <div className="mb-6 border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">2. Información del Curso</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full p-2 border rounded-lg" 
              placeholder="Título del Curso"
              required
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
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full p-2 border rounded-lg" 
            rows={3} 
            placeholder="Descripción del curso"
          />
        </div>
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <Icons.AlertCircle className="inline mr-2" size={16} />
          Puedes crear el curso ahora y usar el Generador de Contenido IA después para agregar cuestionarios, diagramas y más contenido.
        </p>
      </div>

      {/* Create Course Button */}
      <button 
        onClick={handleCreateCourse}
        disabled={!title.trim()}
        className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Crear Curso
      </button>
    </div>
  );
};
