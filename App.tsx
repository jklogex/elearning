import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './components/Icon';
import { 
  Course, 
  CourseModule, 
  ModuleType, 
  QuizQuestion, 
  User, 
  Assignment, 
  Department,
  AssignmentStatus,
  Certificate
} from './types';
import { generateQuizFromContent, generatePodcast, generateDiagram, generateVideo, extractTextFromFile } from './services/geminiService';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { extractCourseInfo, transcribeAudio, processCourseInBackground } from './services/courseProcessingService';
import { useAuthContext } from './components/auth/AuthProvider';
import { logout } from './lib/firebase/auth';
import { 
  getAllCourses, 
  createCourse, 
  getAllAssignments, 
  createAssignment, 
  updateAssignment,
  getUserAssignments,
  getAllUsers,
  createCertificate,
  getUserCertificates
} from './lib/firebase/firestore';

// --- Mock Initial Data ---

const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alicia Admin', email: 'alicia@empresa.ec', role: 'admin', department: 'RR.HH.', avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: 'Roberto Gerente', email: 'roberto@empresa.ec', role: 'manager', department: 'Bodega', avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: 'Carlos Bodega', email: 'carlos@empresa.ec', role: 'employee', department: 'Bodega', avatar: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', name: 'David Conductor', email: 'david@empresa.ec', role: 'employee', department: 'Operaciones', avatar: 'https://i.pravatar.cc/150?u=u4' },
  { id: 'u5', name: 'Elena Ventas', email: 'elena@empresa.ec', role: 'employee', department: 'Ventas', avatar: 'https://i.pravatar.cc/150?u=u5' },
  { id: 'u6', name: 'Fernando Tech', email: 'fernando@empresa.ec', role: 'employee', department: 'Tecnología', avatar: 'https://i.pravatar.cc/150?u=u6' },
];

const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Fundamentos de Seguridad Laboral',
    category: 'Seguridad',
    description: 'Protocolos de seguridad esenciales para todo el personal de bodega y operaciones.',
    thumbnail: 'https://picsum.photos/id/180/400/225',
    passThreshold: 80,
    modules: [
      {
        id: 'm1',
        title: 'Conceptos Básicos de Seguridad contra Incendios',
        description: 'Aprenda a identificar peligros de incendio y utilizar un extintor.',
        type: ModuleType.VIDEO,
        contentUrl: 'https://www.youtube.com/embed/14dC-S1B8vQ', 
        textContent: 'La seguridad contra incendios es primordial...',
        quiz: [
          {
            question: "¿Qué significa la 'T' en el acrónimo para usar extintores (en inglés PASS)?",
            options: ["Tirar", "Traer", "Temer", "Tocar"],
            correctAnswerIndex: 0
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'Excelencia en Ventas 101',
    category: 'Ventas',
    description: 'Dominando el arte de la negociación y las relaciones con los clientes.',
    thumbnail: 'https://picsum.photos/id/20/400/225',
    passThreshold: 70,
    modules: []
  }
];

// --- Helper Functions ---

const getStatusColor = (status: AssignmentStatus) => {
  switch(status) {
    case 'completed': return 'text-green-600 bg-green-100';
    case 'overdue': return 'text-red-600 bg-red-100';
    case 'in-progress': return 'text-blue-600 bg-blue-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

// Map internal status to Spanish display
const getStatusLabel = (status: AssignmentStatus | 'overdue', isOverdueFlag?: boolean) => {
    if (isOverdueFlag) return 'Atrasado';
    switch(status) {
        case 'completed': return 'Completado';
        case 'overdue': return 'Atrasado';
        case 'in-progress': return 'En Curso';
        case 'pending': return 'Pendiente';
        default: return status;
    }
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Sin Fecha';
  return new Date(dateStr).toLocaleDateString('es-EC', { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

// --- Components ---

const CertificateView = ({ course, user, date, onPrint }: { course: Course, user: User, date: string, onPrint: () => void }) => (
  <div className="bg-white p-8 md:p-12 rounded-xl shadow-lg border-4 border-double border-brand-200 max-w-3xl mx-auto text-center relative overflow-hidden">
    <div className="absolute top-0 left-0 w-32 h-32 bg-brand-50 rounded-br-full -z-0 opacity-50"></div>
    <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-50 rounded-tl-full -z-0 opacity-50"></div>
    
    <div className="relative z-10">
      <div className="flex justify-center mb-6">
        <Icons.Award size={64} className="text-brand-600" />
      </div>
      <h1 className="text-4xl font-serif font-bold text-slate-900 mb-2">Certificado de Finalización</h1>
      <p className="text-slate-500 uppercase tracking-widest text-sm mb-12">Esto certifica que</p>
      
      <h2 className="text-3xl font-bold text-brand-700 mb-4 border-b-2 border-slate-100 pb-4 inline-block min-w-[300px]">{user.name}</h2>
      
      <p className="text-slate-600 mb-2">ha completado exitosamente el curso</p>
      <h3 className="text-2xl font-bold text-slate-800 mb-12">{course.title}</h3>
      
      <div className="flex justify-between items-end text-left mt-12 px-8 md:px-16">
        <div>
          <p className="text-sm text-slate-400 uppercase">Fecha de Emisión</p>
          <p className="font-medium text-slate-800">{formatDate(date)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400 uppercase">Firma Autorizada</p>
          <p className="font-serif italic text-xl text-brand-800">Admin SimpleLMS</p>
        </div>
      </div>
      
      <div className="mt-12 print:hidden">
        <button onClick={onPrint} className="flex items-center justify-center space-x-2 bg-slate-900 text-white px-6 py-3 rounded-lg mx-auto hover:bg-slate-800 transition-colors">
          <Icons.Printer size={18} />
          <span>Imprimir Certificado</span>
        </button>
      </div>
    </div>
  </div>
);

const Sidebar = ({ view, setView, currentUser, onLogout, isMobileOpen, setIsMobileOpen }: any) => {
  const isAdmin = currentUser.role === 'admin';
  
  const NavItem = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => { setView(id); setIsMobileOpen(false); }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors mb-1 ${
        view === id 
          ? 'bg-brand-50 text-brand-700 font-medium' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  return (
    <>
       {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMobileOpen(false)} />
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-slate-100 flex items-center space-x-2">
          <div className="bg-brand-600 p-2 rounded-lg">
            <Icons.GraduationCap className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold text-slate-800">SimpleLMS</span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-4 mt-2">Aprendizaje</div>
          <NavItem id="dashboard" label="Mi Tablero" icon={Icons.LayoutDashboard} />
          <NavItem id="library" label="Biblioteca de Cursos" icon={Icons.BookOpen} />
          
          {isAdmin && (
            <>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-4 mt-6">Administración</div>
              <NavItem id="admin_users" label="Equipo" icon={Icons.Users} />
              <NavItem id="admin_assignments" label="Asignaciones" icon={Icons.Calendar} />
              <NavItem id="admin_reports" label="Reportes" icon={Icons.BarChart3} />
              <NavItem id="admin_create" label="Creador de Cursos" icon={Icons.Plus} />
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3 px-2 mb-4">
            <img src={currentUser.avatar} alt="User" className="w-10 h-10 rounded-full bg-slate-200 border border-white shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'manager' ? 'Gerente' : 'Empleado'} • {currentUser.department}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full text-xs text-red-600 hover:text-red-800 font-medium text-center border border-red-200 rounded py-2 bg-white hover:bg-red-50"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </>
  );
};

// --- Admin Components ---

const AdminAssignments = ({ users, courses, assignments, onAssign }: any) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [targetType, setTargetType] = useState<'user' | 'department'>('user');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleAssign = () => {
    if (!selectedCourse || !selectedTarget) return;
    
    let userIds: string[] = [];
    if (targetType === 'user') {
      userIds = [selectedTarget];
    } else {
      userIds = users.filter((u: User) => u.department === selectedTarget).map((u: User) => u.id);
    }

    onAssign(selectedCourse, userIds, dueDate);
    // Reset
    setSelectedCourse('');
    setSelectedTarget('');
    setDueDate('');
    alert(`Asignado a ${userIds.length} usuarios exitosamente.`);
  };

  const uniqueDepts = Array.from(new Set(users.map((u: User) => u.department)));

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Asignar Capacitación</h2>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Curso</label>
            <select 
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
            >
              <option value="">Elige un curso...</option>
              {courses.map((c: Course) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Límite (Opcional)</label>
            <input 
              type="date" 
              className="w-full p-2.5 border border-slate-300 rounded-lg"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-6">
           <div className="flex space-x-6 mb-3">
             <label className="flex items-center cursor-pointer">
               <input type="radio" checked={targetType === 'user'} onChange={() => setTargetType('user')} className="mr-2 text-brand-600" />
               <span className="text-sm font-medium text-slate-700">Asignar a Individuo</span>
             </label>
             <label className="flex items-center cursor-pointer">
               <input type="radio" checked={targetType === 'department'} onChange={() => setTargetType('department')} className="mr-2 text-brand-600" />
               <span className="text-sm font-medium text-slate-700">Asignar por Departamento</span>
             </label>
           </div>
           
           {targetType === 'user' ? (
             <select 
               className="w-full p-2.5 border border-slate-300 rounded-lg"
               value={selectedTarget}
               onChange={e => setSelectedTarget(e.target.value)}
             >
               <option value="">Seleccionar Empleado...</option>
               {users.map((u: User) => (
                 <option key={u.id} value={u.id}>{u.name} ({u.role}) - {u.department}</option>
               ))}
             </select>
           ) : (
             <select 
                className="w-full p-2.5 border border-slate-300 rounded-lg"
                value={selectedTarget}
                onChange={e => setSelectedTarget(e.target.value)}
              >
                <option value="">Seleccionar Departamento...</option>
                {uniqueDepts.map((d: any) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
           )}
        </div>

        <button 
          onClick={handleAssign}
          disabled={!selectedCourse || !selectedTarget}
          className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 disabled:opacity-50 font-medium"
        >
          Confirmar Asignación
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Asignaciones Recientes</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
             <tr>
               <th className="px-6 py-3 font-medium">Curso</th>
               <th className="px-6 py-3 font-medium">Usuario</th>
               <th className="px-6 py-3 font-medium">Asignado</th>
               <th className="px-6 py-3 font-medium">Estado</th>
             </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
             {assignments.slice().reverse().slice(0, 10).map((a: Assignment) => {
               const course = courses.find((c: Course) => c.id === a.courseId);
               const user = users.find((u: User) => u.id === a.userId);
               const isLate = a.status !== 'completed' && isOverdue(a.dueDate);
               return (
                 <tr key={a.id} className="hover:bg-slate-50">
                   <td className="px-6 py-3 font-medium text-slate-900">{course?.title || 'Curso Desconocido'}</td>
                   <td className="px-6 py-3 text-slate-600">{user?.name || 'Usuario Desconocido'}</td>
                   <td className="px-6 py-3 text-slate-500">{new Date(a.assignedDate).toLocaleDateString('es-EC')}</td>
                   <td className="px-6 py-3">
                     <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(isLate ? 'overdue' : a.status)}`}>
                       {getStatusLabel(a.status, isLate)}
                     </span>
                   </td>
                 </tr>
               );
             })}
          </tbody>
        </table>
        {assignments.length === 0 && <div className="p-8 text-center text-slate-500">No se encontraron asignaciones.</div>}
      </div>
    </div>
  );
};

const AdminReports = ({ assignments, users, courses }: any) => {
  // Simple stats
  const totalAssignments = assignments.length;
  const completed = assignments.filter((a: Assignment) => a.status === 'completed').length;
  const overdue = assignments.filter((a: Assignment) => a.status === 'overdue' || (a.status !== 'completed' && isOverdue(a.dueDate))).length;
  const rate = totalAssignments ? Math.round((completed / totalAssignments) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Reportes de Capacitación</h2>
        <button className="flex items-center space-x-2 text-brand-600 hover:text-brand-800 bg-brand-50 px-4 py-2 rounded-lg">
          <Icons.Printer size={18} />
          <span>Exportar Reporte</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm mb-1 font-medium uppercase">Tasa de Finalización</div>
          <div className="text-3xl font-bold text-slate-900">{rate}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
             <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${rate}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm mb-1 font-medium uppercase">Capacitaciones Atrasadas</div>
          <div className="text-3xl font-bold text-red-600">{overdue}</div>
          <p className="text-xs text-slate-400 mt-2">Asignaciones vencidas</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm mb-1 font-medium uppercase">Total Asignados</div>
          <div className="text-3xl font-bold text-slate-900">{totalAssignments}</div>
          <p className="text-xs text-slate-400 mt-2">Módulos de entrenamiento activos</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Reporte Detallado de Estado</h3>
          <div className="flex space-x-2">
             {/* Mock Filters */}
             <button className="p-2 text-slate-400 hover:text-slate-600"><Icons.Filter size={18}/></button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 font-medium">Empleado</th>
                <th className="px-6 py-3 font-medium">Depto</th>
                <th className="px-6 py-3 font-medium">Curso</th>
                <th className="px-6 py-3 font-medium">Fecha Límite</th>
                <th className="px-6 py-3 font-medium">Puntaje</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a: Assignment) => {
                const user = users.find((u: User) => u.id === a.userId);
                const course = courses.find((c: Course) => c.id === a.courseId);
                const isLate = a.status !== 'completed' && isOverdue(a.dueDate);
                
                return (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 flex items-center space-x-3">
                       <img src={user?.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt="" />
                       <span className="font-medium text-slate-900">{user?.name}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{user?.department}</td>
                    <td className="px-6 py-4 text-slate-700">{course?.title}</td>
                    <td className={`px-6 py-4 ${isLate ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                      {formatDate(a.dueDate)}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono">{a.score ? `${Math.round(a.score)}%` : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(isLate ? 'overdue' : a.status)}`}>
                         {getStatusLabel(a.status, isLate)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// --- Creator & Viewer Components ---

import { AdminCourseCreator } from './components/admin/AdminCourseCreator';

const AdminCourseCreatorOld = ({ onSave, onCancel }: { onSave: (c: Course) => void; onCancel: () => void }) => {
  // New simplified flow state
  const [sourceType, setSourceType] = useState<'document' | 'url'>('document');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string>('');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  // Auto-filled fields (from AI extraction)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  
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

  const handleGenerateQuiz = async () => {
    if (!newModContent) return;
    setIsGeneratingQuiz(true);
    try {
      let quizInput: string | { mimeType: string, data: string } = newModContent;
      if (inputType === 'file' && newModContent.startsWith('data:')) {
         const matches = newModContent.match(/^data:(.+);base64,(.+)$/);
         if (matches) quizInput = { mimeType: matches[1], data: matches[2] };
      }
      const questions = await generateQuizFromContent(quizInput);
      setGeneratedQuiz(questions);
    } catch (e: any) {
      // Show user-friendly error messages
      if (e.message && e.message.includes('Se requiere una clave API')) {
        alert(e.message);
      } else {
        alert(`Error al generar cuestionario: ${e.message || 'Error desconocido'}`);
      }
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleGenerateMedia = async () => {
    if (!newModContent) return;
    
    // For Veo (video generation), check if AI Studio is available or if we have an API key
    if (genVideo) {
      const envApiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
      const hasEnvApiKey = !!envApiKey;
      const hasAistudio = typeof window !== 'undefined' && (window as any).aistudio;
      
      // If no API key in env and no AI Studio, show error
      if (!hasEnvApiKey && !hasAistudio) {
        alert("Para generar video, necesitas:\n1. Configurar VITE_GEMINI_API_KEY en .env.local, O\n2. Usar el entorno de AI Studio con una clave API pagada.");
        return;
      }
      
      // If AI Studio is available, check for selected key
      if (hasAistudio) {
        try {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            try {
              await (window as any).aistudio.openSelectKey();
              const checkAgain = await (window as any).aistudio.hasSelectedApiKey();
              if (!checkAgain) {
                alert("Se requiere una clave API pagada para generar video. Por favor, selecciona una clave API en AI Studio.");
                return;
              }
            } catch (e) {
              console.error("Error selecting API key:", e);
              // If env key exists, continue with that
              if (!hasEnvApiKey) {
                alert("Error al seleccionar la clave API. Asegúrate de tener VITE_GEMINI_API_KEY configurada en .env.local.");
                return;
              }
            }
          }
        } catch (e) {
          console.error("Error checking AI Studio key:", e);
          // If env key exists, continue with that
          if (!hasEnvApiKey) {
            alert("Error al verificar la clave API. Asegúrate de tener VITE_GEMINI_API_KEY configurada en .env.local.");
            return;
          }
        }
      }
      // If we have env API key, continue (video generation will use it)
    }

    setIsGeneratingMedia(true);
    
    try {
      // Extract text for prompt usage
      let textForPrompt = "";
      
      if (inputType === 'text') {
        // Use text content directly
        textForPrompt = newModContent;
      } else if (inputType === 'file' && newModContent.startsWith('data:')) {
        // Extract text from uploaded file (PDF, images, etc.) using Gemini AI
        try {
          const matches = newModContent.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            
            // Check if it's a supported file type for text extraction
            const supportedTypes = [
              'application/pdf',
              'image/png',
              'image/jpeg',
              'image/jpg',
              'image/gif',
              'image/webp'
            ];
            
            if (supportedTypes.some(type => mimeType.includes(type))) {
              // Show loading state for text extraction
              setIsExtractingText(true);
              
              // Extract text from the file using Gemini AI
              const extractedText = await extractTextFromFile({ mimeType, data: base64Data });
              textForPrompt = extractedText;
              
              setIsExtractingText(false);
              
              // If extraction is successful but text is short, add context
              if (textForPrompt.length < 100) {
                textForPrompt = `${textForPrompt}\n\nTema: ${newModTitle}. Nombre de archivo: ${fileName}.`;
              }
            } else {
              // For unsupported file types, use filename and title as fallback
              textForPrompt = `Tema: ${newModTitle}. Nombre de archivo: ${fileName}.`;
            }
          } else {
            textForPrompt = `Tema: ${newModTitle}. Nombre de archivo: ${fileName}.`;
          }
        } catch (extractError: any) {
          console.error("Error extracting text from file:", extractError);
          setIsExtractingText(false);
          
          // If it's an API key error, show it to the user
          if (extractError.message && extractError.message.includes('Se requiere una clave API')) {
            alert(extractError.message);
            setIsGeneratingMedia(false);
            return;
          }
          
          // Fallback to filename/title if extraction fails for other reasons
          textForPrompt = `Tema: ${newModTitle}. Nombre de archivo: ${fileName}.`;
        }
      } else {
        // Fallback
        textForPrompt = `Tema: ${newModTitle}. Nombre de archivo: ${fileName || 'documento'}.`;
      }

      const newModules: CourseModule[] = [];

      if (genDiagram) {
        const imgData = await generateDiagram(textForPrompt);
        newModules.push({
          id: `gen-diag-${Date.now()}`,
          title: `Diagrama: ${newModTitle}`,
          description: 'Diagrama generado por IA',
          type: ModuleType.DOCUMENT, // Display as image/doc
          contentUrl: imgData,
          quiz: []
        });
      }

      if (genPodcast) {
        const audioData = await generatePodcast(textForPrompt);
        newModules.push({
          id: `gen-pod-${Date.now()}`,
          title: `Podcast: ${newModTitle}`,
          description: 'Podcast generado por IA',
          type: ModuleType.AUDIO,
          contentUrl: audioData,
          quiz: []
        });
      }

      if (genVideo) {
        const videoData = await generateVideo(textForPrompt);
        newModules.push({
          id: `gen-vid-${Date.now()}`,
          title: `Video: ${newModTitle}`,
          description: 'Video generado por IA (Veo)',
          type: ModuleType.VIDEO,
          contentUrl: videoData,
          quiz: []
        });
      }

      setModules([...modules, ...newModules]);
      alert(`Se generaron ${newModules.length} recursos nuevos.`);
      
      // Reset selection
      setGenVideo(false);
      setGenPodcast(false);
      setGenDiagram(false);

    } catch (e: any) {
      console.error(e);
      
      // Show user-friendly error messages
      if (e.message && e.message.includes('Se requiere una clave API')) {
        alert(e.message);
      } else {
        alert(`Error al generar contenido multimedia: ${e.message || 'Error desconocido'}\n\nRevisa la consola para más detalles.`);
      }
    } finally {
      setIsGeneratingMedia(false);
      setIsExtractingText(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Archivo demasiado grande (Max 5MB)"); return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setNewModContent(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAddModule = () => {
    const module: CourseModule = {
      id: `m-${Date.now()}`,
      title: newModTitle,
      description: 'Módulo personalizado',
      type: newModType,
      quiz: generatedQuiz,
      contentUrl: (inputType === 'file' || newModType !== ModuleType.DOCUMENT) ? newModContent : undefined,
      textContent: (inputType === 'text' && newModType === ModuleType.DOCUMENT) ? newModContent : undefined
    };
    setModules([...modules, module]);
    setNewModTitle(''); setNewModContent(''); setFileName(''); setGeneratedQuiz([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Crear Nuevo Curso</h2>
        <button onClick={onCancel}><Icons.X className="text-slate-500 hover:text-slate-700" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Título del Curso" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full p-2 border rounded-lg">
            <option>General</option><option>Seguridad</option><option>RR.HH.</option><option>Ventas</option><option>Tecnología</option>
          </select>
        </div>
      </div>
      <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg" rows={2} placeholder="Breve descripción..." />
      </div>

      <div className="border-t border-slate-100 pt-6 mb-6 bg-slate-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Agregar Contenido de Aprendizaje</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input type="text" value={newModTitle} onChange={e => setNewModTitle(e.target.value)} className="w-full p-2 border rounded-lg" placeholder="Título (ej. Manual de Procedimientos)" />
          <select value={newModType} onChange={e => setNewModType(e.target.value as ModuleType)} className="w-full p-2 border rounded-lg">
            <option value={ModuleType.DOCUMENT}>Documento</option>
            <option value={ModuleType.VIDEO}>Video</option>
            <option value={ModuleType.AUDIO}>Audio</option>
          </select>
        </div>
        
        <div className="flex space-x-4 mb-2">
           <label className="flex items-center"><input type="radio" checked={inputType === 'text'} onChange={() => setInputType('text')} className="mr-2"/> Pegar URL/Texto</label>
           <label className="flex items-center"><input type="radio" checked={inputType === 'file'} onChange={() => setInputType('file')} className="mr-2"/> Subir Archivo</label>
        </div>

        {inputType === 'file' ? (
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 mb-4"/>
        ) : (
          newModType === ModuleType.DOCUMENT 
            ? <textarea value={newModContent} onChange={e => setNewModContent(e.target.value)} className="w-full p-2 border rounded-lg mb-4" rows={4} placeholder="Contenido del texto..."/>
            : <input type="text" value={newModContent} onChange={e => setNewModContent(e.target.value)} className="w-full p-2 border rounded-lg mb-4" placeholder="URL..."/>
        )}

        {/* AI Features Section */}
        <div className="bg-white border border-brand-200 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-brand-700 mb-2 flex items-center"><Icons.BrainCircuit size={18} className="mr-2"/> Asistente IA</h4>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
             {/* Quiz Gen */}
             <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || !newModContent} className="text-sm text-slate-600 hover:text-brand-600 flex items-center">
                {isGeneratingQuiz ? 'Creando Quiz...' : 'Generar Cuestionario'} 
                {generatedQuiz.length > 0 && <Icons.CheckCircle size={16} className="ml-1 text-green-500"/>}
             </button>

             {/* Content Gen */}
             <div className="flex flex-col md:flex-row gap-3 items-start md:items-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase">Crear Assets:</span>
                <label className="flex items-center text-sm"><input type="checkbox" checked={genDiagram} onChange={e => setGenDiagram(e.target.checked)} className="mr-1"/> Diagrama</label>
                <label className="flex items-center text-sm"><input type="checkbox" checked={genPodcast} onChange={e => setGenPodcast(e.target.checked)} className="mr-1"/> Podcast</label>
                <label className="flex items-center text-sm"><input type="checkbox" checked={genVideo} onChange={e => setGenVideo(e.target.checked)} className="mr-1"/> Video</label>
                <button 
                  onClick={handleGenerateMedia} 
                  disabled={isGeneratingMedia || isExtractingText || (!genVideo && !genPodcast && !genDiagram) || !newModContent}
                  className="bg-brand-50 text-brand-700 px-3 py-1 rounded text-xs font-bold hover:bg-brand-100 disabled:opacity-50"
                >
                  {isExtractingText ? 'Extrayendo texto...' : isGeneratingMedia ? 'Generando...' : 'Generar'}
                </button>
             </div>
          </div>
        </div>

        <button onClick={handleAddModule} disabled={!newModTitle} className="w-full bg-white border border-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-50 font-medium">Agregar Módulo Manualmente</button>
      </div>

      <div className="space-y-2 mb-6">
        {modules.map((m, i) => (
          <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
            <div className="flex items-center space-x-2">
               {m.type === ModuleType.VIDEO && <Icons.Video size={16}/>}
               {m.type === ModuleType.AUDIO && <Icons.Headphones size={16}/>}
               {m.type === ModuleType.DOCUMENT && <Icons.FileText size={16}/>}
               <span>{m.title}</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-slate-500 text-xs">{m.quiz.length} Pregs</span>
              <button onClick={() => setModules(modules.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Icons.Trash2 size={16}/></button>
            </div>
          </div>
        ))}
        {modules.length === 0 && <p className="text-center text-slate-400 text-sm italic">No hay módulos agregados aún.</p>}
      </div>

      <button onClick={() => onSave({ id: `c-${Date.now()}`, title, description, category, thumbnail: 'https://picsum.photos/400/225', modules, passThreshold: 70 })} className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700">Publicar Curso</button>
    </div>
  );
};

const ModuleViewer = ({ module, onComplete, onNext, isLast }: any) => {
  const [mode, setMode] = useState<'learn' | 'quiz' | 'result'>('learn');
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => { setMode('learn'); setAnswers([]); }, [module.id]);

  const submitQuiz = () => {
    const correct = module.quiz.reduce((acc: number, q: any, i: number) => acc + (answers[i] === q.correctAnswerIndex ? 1 : 0), 0);
    const final = (correct / module.quiz.length) * 100;
    setScore(final);
    setMode('result');
    onComplete(final);
  };

  if (mode === 'learn') {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold mb-2">{module.title}</h2>
        <p className="text-slate-500 mb-6">{module.description}</p>
        <div className="bg-slate-100 rounded-lg overflow-hidden mb-6 border border-slate-200 min-h-[300px] flex items-center justify-center">
           {module.type === ModuleType.VIDEO ? (
              module.contentUrl?.startsWith('data:') || module.contentUrl?.startsWith('blob:')
              ? <video controls src={module.contentUrl} className="w-full max-h-[500px]" />
              : <iframe src={module.contentUrl} className="w-full h-[400px]" title="v" />
           ) : module.type === ModuleType.AUDIO ? (
               <div className="text-center p-10 w-full">
                  <Icons.Headphones size={64} className="mx-auto text-slate-300 mb-4"/>
                  <audio controls src={module.contentUrl} className="w-full" />
               </div>
           ) : module.type === ModuleType.DOCUMENT && (module.contentUrl?.startsWith('data:image') || module.contentUrl?.startsWith('blob:')) ? (
               <img src={module.contentUrl} className="max-w-full" alt="content" />
           ) : module.type === ModuleType.DOCUMENT && module.contentUrl?.startsWith('data:application/pdf') ? (
              <iframe src={module.contentUrl} className="w-full h-[600px]" title="d" />
           ) : (
             <div className="p-8 prose max-w-none whitespace-pre-wrap w-full text-left">{module.textContent || 'No se proporcionó contenido.'}</div>
           )}
        </div>
        <div className="flex justify-end">
           {module.quiz.length > 0 
             ? <button onClick={() => setMode('quiz')} className="bg-brand-600 text-white px-6 py-2 rounded-lg">Tomar Cuestionario</button>
             : <button onClick={() => onComplete(100)} className="bg-green-600 text-white px-6 py-2 rounded-lg">Completar</button>
           }
        </div>
      </div>
    );
  }
  if (mode === 'quiz') {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        <h2 className="text-xl font-bold mb-6">Cuestionario: {module.title}</h2>
        {module.quiz.map((q: any, i: number) => (
          <div key={i} className="mb-6">
            <p className="font-medium mb-2">{i+1}. {q.question}</p>
            {q.options.map((opt: string, oi: number) => (
              <label key={oi} className="flex items-center p-3 border rounded-lg mb-2 cursor-pointer hover:bg-slate-50">
                <input type="radio" name={`q${i}`} checked={answers[i] === oi} onChange={() => { const n = [...answers]; n[i] = oi; setAnswers(n); }} className="mr-3 text-brand-600"/>
                {opt}
              </label>
            ))}
          </div>
        ))}
        <button onClick={submitQuiz} disabled={answers.length < module.quiz.length} className="bg-brand-600 text-white px-8 py-2 rounded-lg w-full disabled:opacity-50">Enviar</button>
      </div>
    );
  }
  return (
    <div className="text-center py-12 animate-fade-in">
       <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${score >= 70 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
         {score >= 70 ? <Icons.CheckCircle size={40}/> : <Icons.X size={40}/>}
       </div>
       <h2 className="text-2xl font-bold mb-2">Puntaje: {Math.round(score)}%</h2>
       <p className="text-slate-500 mb-6">{score >= 70 ? 'Módulo Completado' : 'Por favor repasa e intenta de nuevo'}</p>
       <div className="flex justify-center space-x-4">
         {score < 70 && <button onClick={() => setMode('learn')} className="border px-4 py-2 rounded-lg">Repasar</button>}
         <button onClick={onNext} className="bg-brand-600 text-white px-6 py-2 rounded-lg">{isLast ? 'Finalizar Curso' : 'Siguiente Módulo'}</button>
       </div>
    </div>
  );
};

// --- Main App ---

function App() {
  // Firebase Auth
  const { user: currentUser } = useAuthContext();
  
  // State
  const [view, setView] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load courses
        const coursesData = await getAllCourses();
        if (coursesData.length === 0) {
          // Initialize with default courses if none exist
          setCourses(INITIAL_COURSES);
        } else {
          setCourses(coursesData);
        }

        // Load users (only if admin)
        if (currentUser.role === 'admin') {
          const usersData = await getAllUsers();
          setUsers(usersData);
        }

        // Load assignments
        if (currentUser.role === 'admin') {
          const assignmentsData = await getAllAssignments();
          setAssignments(assignmentsData);
        } else {
          const assignmentsData = await getUserAssignments(currentUser.id);
          setAssignments(assignmentsData);
        }

        // Load certificates
        const certificatesData = await getUserCertificates(currentUser.id);
        setCertificates(certificatesData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to local data on error
        setCourses(INITIAL_COURSES);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Actions
  const handleLogout = async () => {
    try {
      await logout();
      setView('dashboard');
      setActiveCourse(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const assignCourse = async (courseId: string, userIds: string[], dueDate?: string) => {
    try {
      const newAssignments: Omit<Assignment, 'id'>[] = userIds.map(uid => ({
        userId: uid,
        courseId,
        assignedBy: currentUser.id,
        assignedDate: new Date().toISOString(),
        dueDate: dueDate || undefined,
        status: 'pending' as AssignmentStatus,
        progress: 0
      }));

      // Create assignments in Firestore
      for (const assignment of newAssignments) {
        await createAssignment(assignment);
      }

      // Reload assignments
      if (currentUser.role === 'admin') {
        const assignmentsData = await getAllAssignments();
        setAssignments(assignmentsData);
      }
    } catch (error) {
      console.error('Error assigning course:', error);
      alert('Error al asignar el curso. Por favor, intenta de nuevo.');
    }
  };

  const handleModuleComplete = async (score: number) => {
    if (!activeCourse || !currentUser) return;
    
    try {
      // Find assignment
      const assignment = assignments.find(a => a.courseId === activeCourse.id && a.userId === currentUser.id);
      if (!assignment) return;

      // Calculate new progress
      const completedModules = Math.floor((activeModuleIndex + 1) / activeCourse.modules.length * 100);
      const updates: Partial<Assignment> = {
        progress: completedModules,
        status: 'in-progress' as AssignmentStatus,
      };
      
      // If last module
      if (activeModuleIndex === activeCourse.modules.length - 1) {
        updates.status = 'completed' as AssignmentStatus;
        updates.completedDate = new Date().toISOString();
        updates.score = score;
        
        // Generate Certificate
        if (score >= activeCourse.passThreshold) {
          const cert: Omit<Certificate, 'id'> = {
            userId: currentUser.id,
            courseId: activeCourse.id,
            issueDate: new Date().toISOString(),
            code: Math.random().toString(36).substring(7).toUpperCase()
          };
          await createCertificate(cert);
          
          // Reload certificates
          const certificatesData = await getUserCertificates(currentUser.id);
          setCertificates(certificatesData);
        }
      }
      
      // Update assignment in Firestore
      await updateAssignment(assignment.id, updates);
      
      // Reload assignments
      const assignmentsData = await getUserAssignments(currentUser.id);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error completing module:', error);
    }
  };

  const handleNext = () => {
    if (!activeCourse) return;
    if (activeModuleIndex < activeCourse.modules.length - 1) {
      setActiveModuleIndex(prev => prev + 1);
    } else {
      // Course Complete View
      setView('certificate_view');
    }
  };

  const startCourse = async (courseId: string) => {
    if (!currentUser) return;
    
    try {
      // Check if assignment exists, if not create one (Self-enrollment)
      let assignment = assignments.find(a => a.userId === currentUser.id && a.courseId === courseId);
      if (!assignment) {
        const newAsg: Omit<Assignment, 'id'> = {
          userId: currentUser.id,
          courseId,
          assignedBy: 'self',
          assignedDate: new Date().toISOString(),
          status: 'in-progress' as AssignmentStatus,
          progress: 0
        };
        await createAssignment(newAsg);
        
        // Reload assignments
        const assignmentsData = await getUserAssignments(currentUser.id);
        setAssignments(assignmentsData);
      }
      
      const course = courses.find(c => c.id === courseId);
      if (course) {
        setActiveCourse(course);
        setActiveModuleIndex(0);
        setView('course_player');
      }
    } catch (error) {
      console.error('Error starting course:', error);
    }
  };

  // Filtering for Dashboard
  const myAssignments = assignments.filter(a => a.userId === currentUser.id);
  const pendingAssignments = myAssignments.filter(a => a.status !== 'completed');
  const completedAssignments = myAssignments.filter(a => a.status === 'completed');

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-900">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <Sidebar 
          view={view} 
          setView={setView} 
          currentUser={currentUser} 
          onLogout={handleLogout}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />
      )}
      
      {!loading && (
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-64 transition-all duration-200">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
           <div className="flex items-center space-x-3">
             <button onClick={() => setIsMobileOpen(true)} className="text-slate-600">
               <Icons.Menu />
             </button>
             <span className="font-bold text-slate-800">SimpleLMS</span>
           </div>
           <img src={currentUser.avatar} className="w-8 h-8 rounded-full" alt="av"/>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          
          {view === 'dashboard' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
              <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Hola, {currentUser.name.split(' ')[0]}</h1>
                <p className="text-slate-500 mt-1">Tienes {pendingAssignments.length} capacitaciones pendientes.</p>
              </header>

              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-brand-600 mb-2"><Icons.BookOpen size={24} /></div>
                    <div className="text-2xl font-bold">{myAssignments.length}</div>
                    <div className="text-xs text-slate-400">Cursos Totales</div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-green-600 mb-2"><Icons.CheckCircle size={24} /></div>
                    <div className="text-2xl font-bold">{completedAssignments.length}</div>
                    <div className="text-xs text-slate-400">Completados</div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-blue-600 mb-2"><Icons.Clock size={24} /></div>
                    <div className="text-2xl font-bold">{pendingAssignments.length}</div>
                    <div className="text-xs text-slate-400">En Curso</div>
                 </div>
                 <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <div className="text-yellow-600 mb-2"><Icons.Award size={24} /></div>
                    <div className="text-2xl font-bold">{certificates.filter(c => c.userId === currentUser.id).length}</div>
                    <div className="text-xs text-slate-400">Certificados</div>
                 </div>
              </div>

              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
                <Icons.AlertCircle className="mr-2 text-brand-500" size={20}/> 
                Capacitación Asignada
              </h2>
              
              <div className="grid gap-4 mb-10">
                {pendingAssignments.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-slate-200 border-dashed text-slate-400">
                    No hay asignaciones pendientes. ¡Buen trabajo!
                  </div>
                ) : (
                  pendingAssignments.map(a => {
                    const course = courses.find(c => c.id === a.courseId);
                    if(!course) return null;
                    const overdue = isOverdue(a.dueDate);
                    return (
                      <div key={a.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between hover:shadow-md transition-shadow">
                         <div className="flex items-center space-x-4 mb-4 md:mb-0 w-full md:w-auto">
                            <img src={course.thumbnail} className="w-16 h-16 rounded-lg object-cover bg-slate-200" alt="" />
                            <div>
                               <h3 className="font-bold text-slate-900">{course.title}</h3>
                               <div className="flex items-center space-x-3 text-sm mt-1">
                                 <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${getStatusColor(overdue ? 'overdue' : a.status)}`}>
                                   {getStatusLabel(a.status, overdue)}
                                 </span>
                                 <span className="text-slate-400 flex items-center"><Icons.Calendar size={12} className="mr-1"/> Límite: {formatDate(a.dueDate)}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right mr-4">
                               <div className="text-xs text-slate-400 mb-1">Progreso</div>
                               <div className="w-24 bg-slate-100 h-2 rounded-full">
                                  <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${a.progress}%` }}></div>
                               </div>
                            </div>
                            <button onClick={() => startCourse(course.id)} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors">
                               {a.status === 'pending' ? 'Iniciar' : 'Continuar'}
                            </button>
                         </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">Historial Completado</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {completedAssignments.map(a => {
                    const course = courses.find(c => c.id === a.courseId);
                    if(!course) return null;
                    return (
                      <div key={a.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                         <div>
                            <h4 className="font-bold text-slate-700">{course.title}</h4>
                            <p className="text-xs text-slate-500">Completado el {formatDate(a.completedDate)}</p>
                         </div>
                         {a.score && a.score >= course.passThreshold && (
                           <button 
                             onClick={() => { setActiveCourse(course); setView('certificate_view'); }}
                             className="text-brand-600 hover:bg-brand-50 p-2 rounded-full" 
                             title="Ver Certificado"
                           >
                              <Icons.Award size={20} />
                           </button>
                         )}
                      </div>
                    );
                 })}
                 {completedAssignments.length === 0 && <p className="text-slate-400 text-sm italic">No hay cursos completados.</p>}
              </div>
            </div>
          )}

          {view === 'library' && (
             <div className="max-w-6xl mx-auto animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Biblioteca de Cursos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {courses.map(c => (
                    <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                       <div className="h-40 overflow-hidden">
                         <img src={c.thumbnail} className="w-full h-full object-cover" alt=""/>
                       </div>
                       <div className="p-5 flex-1 flex flex-col">
                          <div className="flex justify-between items-start mb-2">
                             <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded uppercase tracking-wider">{c.category}</span>
                          </div>
                          <h3 className="font-bold text-lg text-slate-900 mb-2">{c.title}</h3>
                          <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{c.description}</p>
                          <button onClick={() => startCourse(c.id)} className="w-full border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50">
                            Ver Curso
                          </button>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          )}

          {view === 'course_player' && activeCourse && (
             <div className="max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
               <div className="mb-4 flex items-center space-x-2 text-sm">
                 <button onClick={() => setView('dashboard')} className="text-slate-500 hover:text-brand-600">Tablero</button>
                 <Icons.ChevronRight size={14} className="text-slate-300"/>
                 <span className="font-medium text-slate-900">{activeCourse.title}</span>
               </div>
               
               <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                     <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <ModuleViewer 
                           module={activeCourse.modules[activeModuleIndex]} 
                           onComplete={handleModuleComplete}
                           onNext={handleNext}
                           isLast={activeModuleIndex === activeCourse.modules.length - 1}
                        />
                     </div>
                  </div>
                  <div className="w-full lg:w-80">
                     <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-800 mb-4">Contenido del Curso</h3>
                        <div className="space-y-1">
                           {activeCourse.modules.map((m, i) => (
                             <button 
                               key={i} 
                               onClick={() => setActiveModuleIndex(i)}
                               disabled={i > (assignments.find(a => a.courseId === activeCourse?.id && a.userId === currentUser.id)?.progress || 0) / (100/activeCourse.modules.length)} 
                               className={`w-full text-left p-3 rounded-lg text-sm flex items-start space-x-3 ${
                                 i === activeModuleIndex ? 'bg-brand-50 text-brand-700 border-brand-100 border' : 'text-slate-600 hover:bg-slate-50'
                               }`}
                             >
                               <div className="mt-0.5">
                                 {m.type === ModuleType.VIDEO && <Icons.Video size={16}/>}
                                 {m.type === ModuleType.AUDIO && <Icons.Headphones size={16}/>}
                                 {m.type === ModuleType.DOCUMENT && <Icons.FileText size={16}/>}
                               </div>
                               <span className="line-clamp-1">{m.title}</span>
                             </button>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
             </div>
          )}

          {view === 'certificate_view' && activeCourse && (
             <CertificateView 
               course={activeCourse} 
               user={currentUser} 
               date={new Date().toISOString()} 
               onPrint={() => window.print()} 
             />
          )}

          {/* Admin Views */}
          {view === 'admin_users' && (
             <div className="max-w-5xl mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-bold text-slate-900">Gestión de Equipo</h2>
                   <button className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-brand-700">
                      <Icons.Plus size={18}/><span>Agregar Empleado</span>
                   </button>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                         <tr>
                            <th className="px-6 py-4 font-medium">Empleado</th>
                            <th className="px-6 py-4 font-medium">Rol</th>
                            <th className="px-6 py-4 font-medium">Departamento</th>
                            <th className="px-6 py-4 font-medium">Estado</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50">
                               <td className="px-6 py-4 flex items-center space-x-3">
                                  <img src={u.avatar} className="w-8 h-8 rounded-full bg-slate-200" alt=""/>
                                  <div>
                                     <div className="font-medium text-slate-900">{u.name}</div>
                                     <div className="text-xs text-slate-500">{u.email}</div>
                                  </div>
                               </td>
                               <td className="px-6 py-4 capitalize">{u.role === 'admin' ? 'Administrador' : u.role === 'manager' ? 'Gerente' : 'Empleado'}</td>
                               <td className="px-6 py-4">{u.department}</td>
                               <td className="px-6 py-4"><span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Activo</span></td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {view === 'admin_assignments' && (
            <AdminAssignments users={users} courses={courses} assignments={assignments} onAssign={assignCourse} />
          )}

          {view === 'admin_reports' && (
            <AdminReports users={users} courses={courses} assignments={assignments} />
          )}

          {view === 'admin_create' && (
             <AdminCourseCreator 
               onSave={async (courseData) => { 
                 try {
                   // Remove id, extractedText, and genOptions before saving (Firestore doesn't need them)
                   const { id, extractedText, genOptions, ...courseWithoutId } = courseData;
                   
                   // Log what we're about to save
                   console.log('Course data before cleaning:', courseWithoutId);
                   console.log('Modules:', courseWithoutId.modules);
                   
                   const courseId = await createCourse(courseWithoutId);
                   
                   // Start background processing
                   if (extractedText) {
                     processCourseInBackground(courseId, extractedText, genOptions || {})
                       .catch(err => console.error('Background processing error:', err));
                   }
                   
                   const coursesData = await getAllCourses();
                   setCourses(coursesData);
                   setView('library');
                   alert('Curso creado exitosamente. El contenido se está generando en segundo plano.');
                 } catch (error: any) {
                   console.error('Error creating course:', error);
                   alert(`Error al crear el curso: ${error.message || 'Error desconocido'}`);
                 }
               }} 
               onCancel={() => setView('library')} 
             />
          )}

        </div>
      </main>
      )}
    </div>
  );
}

export default App;