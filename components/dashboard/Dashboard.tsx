import React from 'react';
import { Icons } from '../Icon';
import { User, Course, Assignment, Certificate } from '../../types';
import { getStatusColor, getStatusLabel, formatDate, isOverdue } from '../../lib/utils';

interface DashboardProps {
  currentUser: User;
  courses: Course[];
  assignments: Assignment[];
  certificates: Certificate[];
  onStartCourse: (courseId: string) => void;
  onViewCertificate: (course: Course) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  courses,
  assignments,
  certificates,
  onStartCourse,
  onViewCertificate
}) => {
  const myAssignments = assignments.filter(a => a.userId === currentUser.id);
  const pendingAssignments = myAssignments.filter(a => a.status !== 'completed');
  const completedAssignments = myAssignments.filter(a => a.status === 'completed');

  return (
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
                  <button onClick={() => onStartCourse(course.id)} className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors">
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
                  onClick={() => onViewCertificate(course)}
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
  );
};

