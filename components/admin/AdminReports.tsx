import React from 'react';
import { Icons } from '../Icon';
import { User, Course, Assignment } from '../../types';
import { getStatusColor, getStatusLabel, formatDate, isOverdue } from '../../lib/utils';

interface AdminReportsProps {
  assignments: Assignment[];
  users: User[];
  courses: Course[];
}

export const AdminReports: React.FC<AdminReportsProps> = ({ assignments, users, courses }) => {
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

