import React from 'react';
import { Icons } from '../Icon';
import { User } from '../../types';

interface SidebarProps {
  view: string;
  setView: (view: string) => void;
  currentUser: User;
  onLogout: () => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  view, 
  setView, 
  currentUser, 
  onLogout, 
  isMobileOpen, 
  setIsMobileOpen 
}) => {
  const isAdmin = currentUser.role === 'admin';
  
  const NavItem = ({ id, label, icon: Icon }: { id: string; label: string; icon: any }) => (
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
              <NavItem id="admin_ai_generator" label="Generador IA" icon={Icons.BrainCircuit} />
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

