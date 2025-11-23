export enum ModuleType {
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT'
}

export type Role = 'admin' | 'manager' | 'employee';
export type Department = 'RR.HH.' | 'Bodega' | 'Ventas' | 'Operaciones' | 'Tecnología';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: Department;
  avatar: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  type: ModuleType;
  contentUrl?: string; // For video/audio/pdf
  textContent?: string; // For text content
  quiz: QuizQuestion[];
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  category: string;
  thumbnail: string;
  modules: CourseModule[];
  passThreshold: number; // Percentage required to pass
}

export type AssignmentStatus = 'pending' | 'in-progress' | 'completed' | 'overdue';

export interface Assignment {
  id: string;
  userId: string;
  courseId: string;
  assignedBy: string;
  assignedDate: string;
  dueDate?: string;
  status: AssignmentStatus;
  progress: number; // 0-100
  score?: number; // Final averaged score
  completedDate?: string;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  issueDate: string;
  code: string;
}