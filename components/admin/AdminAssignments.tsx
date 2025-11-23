import React, { useState } from 'react';
import { User, Course, Assignment } from '../../types';
import { getStatusColor, getStatusLabel, formatDate, isOverdue } from '../../lib/utils';

interface AdminAssignmentsProps {
  users: User[];
  courses: Course[];
  assignments: Assignment[];
  onAssign: (courseId: string, userIds: string[], dueDate?: string) => void;
}

export const AdminAssignments: React.FC<AdminAssignmentsProps> = ({ users, courses, assignments, onAssign }) => {
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

