import React, { useState, useEffect } from 'react';
import { Icons } from '../Icon';
import { CourseModule, ModuleType } from '../../types';

interface ModuleViewerProps {
  module: CourseModule;
  onComplete: (score: number) => void;
  onNext: () => void;
  isLast: boolean;
}

export const ModuleViewer: React.FC<ModuleViewerProps> = ({ module, onComplete, onNext, isLast }) => {
  const [mode, setMode] = useState<'learn' | 'quiz' | 'result'>('learn');
  const [answers, setAnswers] = useState<number[]>([]);
  const [score, setScore] = useState(0);

  useEffect(() => { 
    setMode('learn'); 
    setAnswers([]); 
  }, [module.id]);

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
           {(module.type === ModuleType.VIDEO || module.type === 'VIDEO') ? (
              module.contentUrl?.startsWith('data:') || module.contentUrl?.startsWith('blob:')
              ? <video controls src={module.contentUrl} className="w-full max-h-[500px]" />
              : <iframe src={module.contentUrl} className="w-full h-[400px]" title="v" />
           ) : (module.type === ModuleType.AUDIO || module.type === 'AUDIO') ? (
               <div className="text-center p-10 w-full">
                  <Icons.Headphones size={64} className="mx-auto text-slate-300 mb-4"/>
                  <audio controls src={module.contentUrl} className="w-full" />
               </div>
           ) : (module.type === ModuleType.DOCUMENT || module.type === 'DOCUMENT') && module.contentUrl ? (
               // Handle different document types
               (() => {
                 const url = module.contentUrl;
                 const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.startsWith('data:image') || url.startsWith('blob:');
                 const isPDF = url.match(/\.pdf$/i) || url.includes('pdf') || url.startsWith('data:application/pdf');
                 
                 if (isImage) {
                   return <img src={url} className="max-w-full max-h-[600px] object-contain" alt={module.title} />;
                 } else if (isPDF) {
                   return <iframe src={url} className="w-full h-[600px]" title={module.title} />;
                 } else {
                   // For other document types, try to display in iframe or provide download link
                   return (
                     <div className="p-8 text-center w-full">
                       <Icons.FileText size={64} className="mx-auto text-slate-300 mb-4"/>
                       <p className="text-slate-600 mb-4">{module.title}</p>
                       <a 
                         href={url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="inline-flex items-center space-x-2 bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700"
                       >
                         <Icons.Link size={18} />
                         <span>Abrir Documento</span>
                       </a>
                     </div>
                   );
                 }
               })()
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

