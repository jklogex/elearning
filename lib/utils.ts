import { AssignmentStatus } from '../types';

export const getStatusColor = (status: AssignmentStatus | 'overdue') => {
  switch(status) {
    case 'completed': return 'text-green-600 bg-green-100';
    case 'overdue': return 'text-red-600 bg-red-100';
    case 'in-progress': return 'text-blue-600 bg-blue-100';
    default: return 'text-slate-600 bg-slate-100';
  }
};

export const getStatusLabel = (status: AssignmentStatus | 'overdue', isOverdueFlag?: boolean) => {
  if (isOverdueFlag) return 'Atrasado';
  switch(status) {
    case 'completed': return 'Completado';
    case 'overdue': return 'Atrasado';
    case 'in-progress': return 'En Curso';
    case 'pending': return 'Pendiente';
    default: return status;
  }
};

export const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Sin Fecha';
  return new Date(dateStr).toLocaleDateString('es-EC', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const isOverdue = (dueDate?: string) => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};

