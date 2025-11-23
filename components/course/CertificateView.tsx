import React from 'react';
import { Icons } from '../Icon';
import { Course, User } from '../../types';
import { formatDate } from '../../lib/utils';

interface CertificateViewProps {
  course: Course;
  user: User;
  date: string;
  onPrint: () => void;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ course, user, date, onPrint }) => (
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

