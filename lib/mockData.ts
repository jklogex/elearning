import { User, Course, ModuleType } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Alicia Admin', email: 'alicia@empresa.ec', role: 'admin', department: 'RR.HH.', avatar: 'https://i.pravatar.cc/150?u=u1' },
  { id: 'u2', name: 'Roberto Gerente', email: 'roberto@empresa.ec', role: 'manager', department: 'Bodega', avatar: 'https://i.pravatar.cc/150?u=u2' },
  { id: 'u3', name: 'Carlos Bodega', email: 'carlos@empresa.ec', role: 'employee', department: 'Bodega', avatar: 'https://i.pravatar.cc/150?u=u3' },
  { id: 'u4', name: 'David Conductor', email: 'david@empresa.ec', role: 'employee', department: 'Operaciones', avatar: 'https://i.pravatar.cc/150?u=u4' },
  { id: 'u5', name: 'Elena Ventas', email: 'elena@empresa.ec', role: 'employee', department: 'Ventas', avatar: 'https://i.pravatar.cc/150?u=u5' },
  { id: 'u6', name: 'Fernando Tech', email: 'fernando@empresa.ec', role: 'employee', department: 'Tecnología', avatar: 'https://i.pravatar.cc/150?u=u6' },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Fundamentos de Seguridad Laboral',
    category: 'Seguridad',
    description: 'Protocolos de seguridad esenciales para todo el personal de bodega y operaciones.',
    thumbnail: 'https://picsum.photos/id/180/400/225',
    passThreshold: 80,
    modules: [
      {
        id: 'm1',
        title: 'Conceptos Básicos de Seguridad contra Incendios',
        description: 'Aprenda a identificar peligros de incendio y utilizar un extintor.',
        type: ModuleType.VIDEO,
        contentUrl: 'https://www.youtube.com/embed/14dC-S1B8vQ', 
        textContent: 'La seguridad contra incendios es primordial...',
        quiz: [
          {
            question: "¿Qué significa la 'T' en el acrónimo para usar extintores (en inglés PASS)?",
            options: ["Tirar", "Traer", "Temer", "Tocar"],
            correctAnswerIndex: 0
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    title: 'Excelencia en Ventas 101',
    category: 'Ventas',
    description: 'Dominando el arte de la negociación y las relaciones con los clientes.',
    thumbnail: 'https://picsum.photos/id/20/400/225',
    passThreshold: 70,
    modules: []
  }
];

