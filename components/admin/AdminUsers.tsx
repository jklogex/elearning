import React from 'react';
import { Icons } from '../Icon';
import { User } from '../../types';

interface AdminUsersProps {
  users: User[];
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ users }) => {
  return (
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
  );
};

