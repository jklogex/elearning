import React from 'react';
import { Icons } from '../Icon';
import { Course, Assignment, User, ModuleType } from '../../types';
import { ModuleViewer } from './ModuleViewer';

interface CoursePlayerProps {
  course: Course;
  currentUser: User;
  assignments: Assignment[];
  activeModuleIndex: number;
  onSetActiveModuleIndex: (index: number) => void;
  onModuleComplete: (score: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({
  course,
  currentUser,
  assignments,
  activeModuleIndex,
  onSetActiveModuleIndex,
  onModuleComplete,
  onNext,
  onBack
}) => {
  const assignment = assignments.find(a => a.courseId === course.id && a.userId === currentUser.id);
  // All modules are available immediately - no progress locking
  const maxUnlockedModule = course.modules.length - 1;

  return (
    <div className="max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
      <div className="mb-4 flex items-center space-x-2 text-sm">
        <button onClick={onBack} className="text-slate-500 hover:text-brand-600">Tablero</button>
        <Icons.ChevronRight size={14} className="text-slate-300"/>
        <span className="font-medium text-slate-900">{course.title}</span>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <ModuleViewer 
              module={course.modules[activeModuleIndex]} 
              onComplete={onModuleComplete}
              onNext={onNext}
              isLast={activeModuleIndex === course.modules.length - 1}
            />
          </div>
        </div>
        <div className="w-full lg:w-80">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-bold text-slate-800 mb-4">Contenido del Curso</h3>
            <div className="space-y-1">
              {course.modules.map((m, i) => (
                <button 
                  key={i} 
                  onClick={() => onSetActiveModuleIndex(i)}
                  disabled={i > maxUnlockedModule}
                  className={`w-full text-left p-3 rounded-lg text-sm flex items-start space-x-3 ${
                    i === activeModuleIndex ? 'bg-brand-50 text-brand-700 border-brand-100 border' : 'text-slate-600 hover:bg-slate-50'
                  } ${i > maxUnlockedModule ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="mt-0.5">
                    {(m.type === ModuleType.VIDEO || m.type === 'VIDEO') && <Icons.Video size={16}/>}
                    {(m.type === ModuleType.AUDIO || m.type === 'AUDIO') && <Icons.Headphones size={16}/>}
                    {(m.type === ModuleType.DOCUMENT || m.type === 'DOCUMENT') && <Icons.FileText size={16}/>}
                  </div>
                  <span className="line-clamp-1">{m.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

