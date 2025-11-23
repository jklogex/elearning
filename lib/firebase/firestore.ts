import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from './config';
import { User, Course, Assignment, Certificate } from '../../types';

// Users collection
export const usersCollection = collection(db, 'users');

export const getUser = async (userId: string): Promise<User | null> => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as User;
  }
  return null;
};

export const createUser = async (user: User) => {
  await setDoc(doc(db, 'users', user.id), user);
};

export const updateUser = async (userId: string, updates: Partial<User>) => {
  await updateDoc(doc(db, 'users', userId), updates);
};

export const getAllUsers = async (): Promise<User[]> => {
  const snapshot = await getDocs(usersCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Courses collection
export const coursesCollection = collection(db, 'courses');

export const getCourse = async (courseId: string): Promise<Course | null> => {
  const courseDoc = await getDoc(doc(db, 'courses', courseId));
  if (courseDoc.exists()) {
    return { id: courseDoc.id, ...courseDoc.data() } as Course;
  }
  return null;
};

// Helper function to remove undefined values and clean data for Firestore
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanForFirestore).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        // Skip undefined values
        if (value !== undefined) {
          // Convert enum values to strings
          if (typeof value === 'object' && value !== null && 'constructor' in value && value.constructor.name === 'Object') {
            cleaned[key] = cleanForFirestore(value);
          } else if (Array.isArray(value)) {
            cleaned[key] = cleanForFirestore(value);
          } else {
            cleaned[key] = value;
          }
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

export const createCourse = async (course: Omit<Course, 'id'>): Promise<string> => {
  // Clean the course data before saving - Firestore doesn't accept undefined values
  const cleanedModules = (course.modules || []).map((module, index) => {
    try {
      // Convert ModuleType enum to string
      // ModuleType is a string enum, so it should already be a string
      let typeString: string = 'DOCUMENT'; // default
      if (typeof module.type === 'string') {
        typeString = module.type;
      } else if (module.type) {
        // Handle enum case
        const typeValue = String(module.type);
        if (['VIDEO', 'AUDIO', 'DOCUMENT'].includes(typeValue)) {
          typeString = typeValue;
        } else {
          // Extract from enum string like "ModuleType.DOCUMENT"
          const match = typeValue.match(/(VIDEO|AUDIO|DOCUMENT)/);
          typeString = match ? match[1] : 'DOCUMENT';
        }
      }
      
      // Clean quiz array - CRITICAL: Always ensure quiz is an array, never undefined or null
      let quizArray: any[] = [];
      if (Array.isArray(module.quiz)) {
        quizArray = module.quiz;
      } else if (module.quiz !== undefined && module.quiz !== null) {
        // If quiz exists but is not an array, log and use empty array
        console.warn(`Module ${index} has non-array quiz, converting to array:`, module.quiz);
        quizArray = [];
      }
      // If quiz is undefined or null, quizArray is already []
      
      const cleanedQuiz = quizArray
        .filter(q => q && typeof q === 'object') // Filter out invalid items
        .map((q, qIndex) => {
          return {
            question: String(q.question || ''),
            options: Array.isArray(q.options) 
              ? q.options.filter(opt => opt != null && opt !== '').map(opt => String(opt))
              : [],
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' 
              ? Math.max(0, Math.min(q.correctAnswerIndex, 3)) // Ensure valid index
              : 0
          };
        });
      
      // Build module object - ALWAYS include quiz as an array, never undefined
      const cleanedModule: Record<string, any> = {
        id: String(module.id || `module-${index}`),
        title: String(module.title || ''),
        description: String(module.description || ''),
        type: typeString,
        quiz: cleanedQuiz // This is always an array now
      };
      
      // Only add optional fields if they have truthy values
      if (module.contentUrl && typeof module.contentUrl === 'string' && module.contentUrl.trim() !== '') {
        cleanedModule.contentUrl = module.contentUrl.trim();
      }
      if (module.textContent && typeof module.textContent === 'string' && module.textContent.trim() !== '') {
        cleanedModule.textContent = module.textContent.trim();
      }
      
      return cleanedModule;
    } catch (error) {
      console.error(`Error cleaning module at index ${index}:`, error, module);
      // Return a minimal valid module
      return {
        id: String(module?.id || `module-${index}`),
        title: String(module?.title || 'Módulo sin título'),
        description: String(module?.description || ''),
        type: 'DOCUMENT',
        quiz: []
      };
    }
  });
  
  const cleanedCourse: Record<string, any> = {
    title: String(course.title || ''),
    description: String(course.description || ''),
    category: String(course.category || 'General'),
    thumbnail: String(course.thumbnail || 'https://picsum.photos/400/225'),
    modules: cleanedModules,
    passThreshold: typeof course.passThreshold === 'number' ? course.passThreshold : 70
  };
  
  // Deep clean function: recursively remove undefined, null, and invalid values
  // BUT preserve required fields like 'quiz' which must always be an array
  const deepClean = (obj: any, depth: number = 0): any => {
    // Prevent infinite recursion
    if (depth > 10) {
      return null;
    }
    
    if (obj === null || obj === undefined) {
      return null;
    }
    
    // Handle arrays - filter out invalid items but preserve the array structure
    if (Array.isArray(obj)) {
      const cleaned = obj
        .map(item => deepClean(item, depth + 1))
        .filter(item => {
          // Remove null, undefined, empty objects, and empty strings
          if (item === null || item === undefined || item === '') return false;
          if (typeof item === 'object' && Object.keys(item).length === 0) return false;
          return true;
        });
      return cleaned;
    }
    
    // Handle objects - special handling for modules to ensure quiz is always an array
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      
      // Check if this looks like a module (has id, title, type)
      const isModule = obj.id !== undefined && obj.title !== undefined && obj.type !== undefined;
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          
          // Special handling for quiz field in modules - always ensure it's an array
          if (isModule && key === 'quiz') {
            if (Array.isArray(value)) {
              cleaned[key] = deepClean(value, depth + 1);
            } else {
              // Force quiz to be an array if it's not
              cleaned[key] = [];
            }
            continue;
          }
          
          // Skip undefined and null for other fields
          if (value !== undefined && value !== null) {
            const cleanedValue = deepClean(value, depth + 1);
            // Only add if it's a valid value (not null, undefined, or empty object)
            if (cleanedValue !== undefined && cleanedValue !== null) {
              // For arrays, always include them (even if empty)
              if (Array.isArray(cleanedValue)) {
                cleaned[key] = cleanedValue;
              } else if (typeof cleanedValue !== 'object' || Object.keys(cleanedValue).length > 0) {
                cleaned[key] = cleanedValue;
              }
            }
          }
        }
      }
      return cleaned;
    }
    
    // Handle primitives - return as is
    return obj;
  };
  
  // CRITICAL: Ensure all modules have quiz as an array BEFORE deepClean
  cleanedModules.forEach((module: any) => {
    if (!Array.isArray(module.quiz)) {
      module.quiz = [];
    }
  });
  
  // Update cleanedCourse with the fixed modules
  cleanedCourse.modules = cleanedModules;
  
  // Deep clean the entire course object
  const finalCleanedCourse = deepClean(cleanedCourse);
  
  // Ensure modules is an array (even if empty)
  if (!Array.isArray(finalCleanedCourse.modules)) {
    finalCleanedCourse.modules = [];
  }
  
  // CRITICAL: Ensure all modules have quiz as an array AFTER deepClean too
  finalCleanedCourse.modules.forEach((module: any) => {
    if (!Array.isArray(module.quiz)) {
      module.quiz = [];
    }
  });
  
  // Final validation and logging
  console.log('Final course data:', JSON.stringify(finalCleanedCourse, null, 2));
  console.log('Modules count:', finalCleanedCourse.modules.length);
  
  // Validate each module structure
  finalCleanedCourse.modules.forEach((module: any, idx: number) => {
    if (!module || typeof module !== 'object') {
      console.error(`Module at index ${idx} is not an object:`, module);
      throw new Error(`Module at index ${idx} is invalid`);
    }
    if (!module.id || typeof module.id !== 'string') {
      console.error(`Module at index ${idx} missing valid id:`, module);
      throw new Error(`Module at index ${idx} is missing id`);
    }
    if (!module.title || typeof module.title !== 'string') {
      console.error(`Module at index ${idx} missing valid title:`, module);
      throw new Error(`Module at index ${idx} is missing title`);
    }
    if (!module.type || typeof module.type !== 'string') {
      console.error(`Module at index ${idx} missing valid type:`, module);
      throw new Error(`Module at index ${idx} is missing type`);
    }
    // Ensure quiz is always an array
    if (!Array.isArray(module.quiz)) {
      console.warn(`Module at index ${idx} has invalid quiz, fixing:`, module.quiz);
      module.quiz = []; // Fix it
    }
    // Validate and clean quiz items
    if (Array.isArray(module.quiz)) {
      module.quiz = module.quiz
        .filter((q: any) => {
          return q && typeof q === 'object' && q.question && Array.isArray(q.options);
        })
        .map((q: any) => ({
          question: String(q.question || ''),
          options: Array.isArray(q.options) ? q.options.map((opt: any) => String(opt)) : [],
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0
        }));
    } else {
      // Fallback: ensure it's an array
      module.quiz = [];
    }
  });
  
  const docRef = await addDoc(coursesCollection, finalCleanedCourse);
  return docRef.id;
};

export const updateCourse = async (courseId: string, updates: Partial<Course>) => {
  await updateDoc(doc(db, 'courses', courseId), updates);
};

export const deleteCourse = async (courseId: string) => {
  await deleteDoc(doc(db, 'courses', courseId));
};

export const getAllCourses = async (): Promise<Course[]> => {
  const snapshot = await getDocs(coursesCollection);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Assignments collection
export const assignmentsCollection = collection(db, 'assignments');

export const getAssignment = async (assignmentId: string): Promise<Assignment | null> => {
  const assignmentDoc = await getDoc(doc(db, 'assignments', assignmentId));
  if (assignmentDoc.exists()) {
    const data = assignmentDoc.data();
    return {
      id: assignmentDoc.id,
      ...data,
      assignedDate: data.assignedDate?.toDate?.().toISOString() || data.assignedDate,
      dueDate: data.dueDate?.toDate?.().toISOString() || data.dueDate,
      completedDate: data.completedDate?.toDate?.().toISOString() || data.completedDate,
    } as Assignment;
  }
  return null;
};

export const createAssignment = async (assignment: Omit<Assignment, 'id'>): Promise<string> => {
  const assignmentData = {
    ...assignment,
    assignedDate: Timestamp.fromDate(new Date(assignment.assignedDate)),
    dueDate: assignment.dueDate ? Timestamp.fromDate(new Date(assignment.dueDate)) : null,
    completedDate: assignment.completedDate ? Timestamp.fromDate(new Date(assignment.completedDate)) : null,
  };
  const docRef = await addDoc(assignmentsCollection, assignmentData);
  return docRef.id;
};

export const updateAssignment = async (assignmentId: string, updates: Partial<Assignment>) => {
  const updateData: any = { ...updates };
  if (updates.dueDate) {
    updateData.dueDate = Timestamp.fromDate(new Date(updates.dueDate));
  }
  if (updates.completedDate) {
    updateData.completedDate = Timestamp.fromDate(new Date(updates.completedDate));
  }
  await updateDoc(doc(db, 'assignments', assignmentId), updateData);
};

export const getUserAssignments = async (userId: string): Promise<Assignment[]> => {
  const q = query(assignmentsCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      assignedDate: data.assignedDate?.toDate?.().toISOString() || data.assignedDate,
      dueDate: data.dueDate?.toDate?.().toISOString() || data.dueDate,
      completedDate: data.completedDate?.toDate?.().toISOString() || data.completedDate,
    } as Assignment;
  });
};

export const getAllAssignments = async (): Promise<Assignment[]> => {
  const snapshot = await getDocs(assignmentsCollection);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      assignedDate: data.assignedDate?.toDate?.().toISOString() || data.assignedDate,
      dueDate: data.dueDate?.toDate?.().toISOString() || data.dueDate,
      completedDate: data.completedDate?.toDate?.().toISOString() || data.completedDate,
    } as Assignment;
  });
};

// Certificates collection
export const certificatesCollection = collection(db, 'certificates');

export const createCertificate = async (certificate: Omit<Certificate, 'id'>): Promise<string> => {
  const certificateData = {
    ...certificate,
    issueDate: Timestamp.fromDate(new Date(certificate.issueDate)),
  };
  const docRef = await addDoc(certificatesCollection, certificateData);
  return docRef.id;
};

export const getUserCertificates = async (userId: string): Promise<Certificate[]> => {
  const q = query(certificatesCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      issueDate: data.issueDate?.toDate?.().toISOString() || data.issueDate,
    } as Certificate;
  });
};

