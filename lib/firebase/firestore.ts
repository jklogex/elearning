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
      // Convert ModuleType enum to string - handle both enum and string values
      let typeString: string = 'DOCUMENT'; // default
      if (module.type) {
        // If it's already a string, use it
        if (typeof module.type === 'string') {
          typeString = module.type;
        } else {
          // If it's an enum, get the value
          typeString = (module.type as any).valueOf ? String((module.type as any).valueOf()) : String(module.type);
        }
        // Validate it's one of the allowed values
        if (!['VIDEO', 'AUDIO', 'DOCUMENT'].includes(typeString)) {
          typeString = 'DOCUMENT';
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
      // Check data URL size - Firestore has 1MB limit per field
      if (module.contentUrl && typeof module.contentUrl === 'string' && module.contentUrl.trim() !== '') {
        const contentUrl = module.contentUrl.trim();
        // If it's a data URL, check size (base64 is ~33% larger than binary)
        if (contentUrl.startsWith('data:')) {
          const base64Data = contentUrl.split(',')[1] || '';
          const sizeInBytes = (base64Data.length * 3) / 4;
          // Warn if too large, but still try to save (Firestore will error if too big)
          if (sizeInBytes > 900000) { // ~900KB to be safe
            console.warn(`Module ${index} contentUrl is large (${Math.round(sizeInBytes / 1024)}KB). Consider using Firebase Storage instead.`);
          }
        }
        cleanedModule.contentUrl = contentUrl;
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
  
  // Simple function to remove undefined values and ensure all arrays are valid
  const removeUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj
        .map(item => removeUndefined(item))
        .filter(item => item !== null && item !== undefined);
    }
    
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = removeUndefined(value);
          }
        }
      }
      return cleaned;
    }
    
    return obj;
  };
  
  // Update cleanedCourse with the fixed modules
  cleanedCourse.modules = cleanedModules;
  
  // Remove undefined values
  const finalCleanedCourse = removeUndefined(cleanedCourse);
  
  // Ensure modules is an array (even if empty)
  if (!Array.isArray(finalCleanedCourse.modules)) {
    finalCleanedCourse.modules = [];
  }
  
  // CRITICAL: Ensure all modules have quiz as an array and are properly structured
  finalCleanedCourse.modules.forEach((module: any, idx: number) => {
    // Ensure quiz is always an array
    if (!Array.isArray(module.quiz)) {
      module.quiz = [];
    }
    
    // Clean quiz items - ensure all are valid objects with no undefined values
    if (Array.isArray(module.quiz)) {
      module.quiz = module.quiz
        .filter((q: any) => {
          // Only keep valid quiz items
          return q && 
                 typeof q === 'object' && 
                 q.question && 
                 typeof q.question === 'string' &&
                 Array.isArray(q.options);
        })
        .map((q: any) => ({
          question: String(q.question || ''),
          options: Array.isArray(q.options) 
            ? q.options
                .filter((opt: any) => opt != null && opt !== '')
                .map((opt: any) => String(opt))
            : [],
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' 
            ? Math.max(0, Math.min(q.correctAnswerIndex, (q.options?.length || 1) - 1))
            : 0
        }));
    }
    
    // Ensure all required fields are strings (not undefined)
    if (!module.id || typeof module.id !== 'string') {
      module.id = `module-${idx}`;
    }
    if (!module.title || typeof module.title !== 'string') {
      module.title = 'Módulo sin título';
    }
    // CRITICAL: Ensure type is always a string, not an enum
    if (!module.type || typeof module.type !== 'string') {
      module.type = 'DOCUMENT';
    } else {
      // Force to string if it's somehow still an enum
      module.type = String(module.type);
      if (!['VIDEO', 'AUDIO', 'DOCUMENT'].includes(module.type)) {
        module.type = 'DOCUMENT';
      }
    }
    
    // Ensure description is always a string
    if (!module.description || typeof module.description !== 'string') {
      module.description = '';
    }
  });
  
  // Final sanitization - remove any undefined values and ensure all nested structures are valid
  const sanitizeForFirestore = (obj: any, depth: number = 0): any => {
    // Prevent infinite recursion
    if (depth > 10) {
      return null;
    }
    
    if (obj === null || obj === undefined) {
      return null;
    }
    
    // Handle arrays - ensure all items are valid
    if (Array.isArray(obj)) {
      const cleaned = obj
        .map(item => sanitizeForFirestore(item, depth + 1))
        .filter(item => {
          // Remove null, undefined, and invalid items
          if (item === null || item === undefined) return false;
          // Remove empty objects
          if (typeof item === 'object' && Object.keys(item).length === 0) return false;
          return true;
        });
      return cleaned;
    }
    
    // Handle objects - ensure all properties are valid
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          // Skip undefined values
          if (value !== undefined) {
            const cleanedValue = sanitizeForFirestore(value, depth + 1);
            // Only add if it's a valid value
            if (cleanedValue !== null && cleanedValue !== undefined) {
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
    
    // Handle primitives
    return obj;
  };
  
  const sanitizedCourse = sanitizeForFirestore(finalCleanedCourse);
  
  // Final validation and logging
  console.log('Final course data:', JSON.stringify(sanitizedCourse, null, 2));
  console.log('Modules count:', sanitizedCourse.modules?.length || 0);
  
  // Validate each module one more time before saving
  sanitizedCourse.modules.forEach((module: any, idx: number) => {
    console.log(`Module ${idx}:`, {
      id: module.id,
      title: module.title,
      type: module.type,
      typeIsString: typeof module.type === 'string',
      hasQuiz: Array.isArray(module.quiz),
      quizLength: module.quiz?.length || 0,
      hasContentUrl: !!module.contentUrl,
      contentUrlType: typeof module.contentUrl,
      contentUrlLength: module.contentUrl?.length || 0
    });
    
    // Final check - ensure no undefined values
    Object.keys(module).forEach(key => {
      if (module[key] === undefined) {
        console.error(`Module ${idx} has undefined value for key: ${key}`);
        delete module[key];
      }
    });
  });
  
  try {
    const docRef = await addDoc(coursesCollection, sanitizedCourse);
    return docRef.id;
  } catch (error: any) {
    console.error('Firestore error details:', error);
    console.error('Course data that failed:', JSON.stringify(sanitizedCourse, null, 2));
    throw error;
  }
};

export const updateCourse = async (courseId: string, updates: Partial<Course>) => {
  // Sanitize updates the same way we sanitize course creation
  const sanitizeForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (Array.isArray(obj)) {
      return obj
        .map(item => sanitizeForFirestore(item))
        .filter(item => item !== null && item !== undefined);
    }
    if (typeof obj === 'object' && obj.constructor === Object) {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          const cleanedValue = sanitizeForFirestore(obj[key]);
          if (cleanedValue !== null && cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
      }
      return cleaned;
    }
    return obj;
  };

  // If updating modules, clean them properly
  if (updates.modules && Array.isArray(updates.modules)) {
    const cleanedModules = updates.modules.map((module: any, index: number) => {
      // Convert ModuleType enum to string
      let typeString: string = 'DOCUMENT';
      if (typeof module.type === 'string') {
        typeString = module.type;
      } else if (module.type) {
        const typeValue = String(module.type);
        if (['VIDEO', 'AUDIO', 'DOCUMENT'].includes(typeValue)) {
          typeString = typeValue;
        } else {
          const match = typeValue.match(/(VIDEO|AUDIO|DOCUMENT)/);
          typeString = match ? match[1] : 'DOCUMENT';
        }
      }

      // Clean quiz array
      let quizArray: any[] = [];
      if (Array.isArray(module.quiz)) {
        quizArray = module.quiz
          .filter((q: any) => {
            return q && 
                   typeof q === 'object' && 
                   q.question && 
                   typeof q.question === 'string' &&
                   Array.isArray(q.options);
          })
          .map((q: any) => ({
            question: String(q.question || ''),
            options: Array.isArray(q.options) 
              ? q.options
                  .filter((opt: any) => opt != null && opt !== '')
                  .map((opt: any) => String(opt))
              : [],
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' 
              ? Math.max(0, Math.min(q.correctAnswerIndex, (q.options?.length || 1) - 1))
              : 0
          }));
      }

      const cleanedModule: Record<string, any> = {
        id: String(module.id || `module-${index}`),
        title: String(module.title || ''),
        description: String(module.description || ''),
        type: typeString,
        quiz: quizArray
      };

      // Only add optional fields if they have truthy values
      if (module.contentUrl && typeof module.contentUrl === 'string' && module.contentUrl.trim() !== '') {
        cleanedModule.contentUrl = module.contentUrl.trim();
      }
      if (module.textContent && typeof module.textContent === 'string' && module.textContent.trim() !== '') {
        cleanedModule.textContent = module.textContent.trim();
      }

      return cleanedModule;
    });

    updates.modules = cleanedModules;
    console.log(`updateCourse: Cleaning ${cleanedModules.length} modules`);
    console.log('Cleaned modules:', cleanedModules.map((m: any) => ({ id: m.id, title: m.title, type: m.type, hasContentUrl: !!m.contentUrl })));
  }

  // Sanitize the entire updates object
  const sanitizedUpdates = sanitizeForFirestore(updates);
  console.log('Sanitized updates:', JSON.stringify(sanitizedUpdates, null, 2));
  
  await updateDoc(doc(db, 'courses', courseId), sanitizedUpdates);
  console.log(`Course ${courseId} updated in Firestore`);
};

export const deleteCourse = async (courseId: string) => {
  // Delete associated files from Storage first
  const { deleteCourseFiles } = await import('./storage');
  await deleteCourseFiles(courseId);
  
  // Then delete the course document
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

