import React from 'react';
import { Course } from '../../types';
import { Icons } from '../Icon';

interface LibraryProps {
  courses: Course[];
  onStartCourse: (courseId: string) => void;
  onDeleteCourse?: (courseId: string) => void;
  isAdmin?: boolean;
}

export const Library: React.FC<LibraryProps> = ({ courses, onStartCourse, onDeleteCourse, isAdmin = false }) => {
  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Biblioteca de Cursos</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courses.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col relative">
            {isAdmin && onDeleteCourse && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCourse(c.id);
                }}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors z-10"
                title="Eliminar curso"
              >
                <Icons.Trash2 size={16} />
              </button>
            )}
            <div className="h-40 overflow-hidden">
              <img src={c.thumbnail} className="w-full h-full object-cover" alt=""/>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded uppercase tracking-wider">{c.category}</span>
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-2">{c.title}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2 flex-1">{c.description}</p>
              <button onClick={() => onStartCourse(c.id)} className="w-full border border-slate-300 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-50">
                Ver Curso
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

