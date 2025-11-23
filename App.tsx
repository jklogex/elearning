import React, { useState, useEffect } from 'react';
import { Icons } from './components/Icon';
import { Course, User, Assignment, AssignmentStatus, Certificate } from './types';
import { processCourseInBackground } from './services/courseProcessingService';
import { useAuthContext } from './components/auth/AuthProvider';
import { logout } from './lib/firebase/auth';
import { 
  getAllCourses, 
  createCourse, 
  updateCourse,
  deleteCourse,
  getAllAssignments, 
  createAssignment, 
  updateAssignment,
  getUserAssignments,
  getAllUsers,
  createCertificate,
  getUserCertificates
} from './lib/firebase/firestore';
import { uploadCourseFile } from './lib/firebase/storage';
import { INITIAL_COURSES } from './lib/mockData';

// Components
import { Sidebar } from './components/shared/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { Library } from './components/library/Library';
import { CoursePlayer } from './components/course/CoursePlayer';
import { CertificateView } from './components/course/CertificateView';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminAssignments } from './components/admin/AdminAssignments';
import { AdminReports } from './components/admin/AdminReports';
import { AdminCourseCreator } from './components/admin/AdminCourseCreator';
import { AdminAIContentGenerator } from './components/admin/AdminAIContentGenerator';

function App() {
  // Firebase Auth
  const { user: currentUser } = useAuthContext();
  
  // State
  const [view, setView] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load courses
        const coursesData = await getAllCourses();
        if (coursesData.length === 0) {
          // Initialize with default courses if none exist
          setCourses(INITIAL_COURSES);
        } else {
          setCourses(coursesData);
        }

        // Load users (only if admin)
        if (currentUser.role === 'admin') {
          const usersData = await getAllUsers();
          setUsers(usersData);
        }

        // Load assignments
        if (currentUser.role === 'admin') {
          const assignmentsData = await getAllAssignments();
          setAssignments(assignmentsData);
        } else {
          const assignmentsData = await getUserAssignments(currentUser.id);
          setAssignments(assignmentsData);
        }

        // Load certificates
        const certificatesData = await getUserCertificates(currentUser.id);
        setCertificates(certificatesData);
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to local data on error
        setCourses(INITIAL_COURSES);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser]);

  // Actions
  const handleLogout = async () => {
    try {
      await logout();
      setView('dashboard');
      setActiveCourse(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const assignCourse = async (courseId: string, userIds: string[], dueDate?: string) => {
    try {
      const newAssignments: Omit<Assignment, 'id'>[] = userIds.map(uid => ({
        userId: uid,
        courseId,
        assignedBy: currentUser.id,
        assignedDate: new Date().toISOString(),
        dueDate: dueDate || undefined,
        status: 'pending' as AssignmentStatus,
        progress: 0
      }));

      // Create assignments in Firestore
      for (const assignment of newAssignments) {
        await createAssignment(assignment);
      }

      // Reload assignments
      if (currentUser.role === 'admin') {
        const assignmentsData = await getAllAssignments();
        setAssignments(assignmentsData);
      }
    } catch (error) {
      console.error('Error assigning course:', error);
      alert('Error al asignar el curso. Por favor, intenta de nuevo.');
    }
  };

  const handleModuleComplete = async (score: number) => {
    if (!activeCourse || !currentUser) return;
    
    try {
      // Find assignment
      const assignment = assignments.find(a => a.courseId === activeCourse.id && a.userId === currentUser.id);
      if (!assignment) return;

      // Calculate new progress
      const completedModules = Math.floor((activeModuleIndex + 1) / activeCourse.modules.length * 100);
      const updates: Partial<Assignment> = {
        progress: completedModules,
        status: 'in-progress' as AssignmentStatus,
      };
      
      // If last module
      if (activeModuleIndex === activeCourse.modules.length - 1) {
        updates.status = 'completed' as AssignmentStatus;
        updates.completedDate = new Date().toISOString();
        updates.score = score;
        
        // Generate Certificate
        if (score >= activeCourse.passThreshold) {
          const cert: Omit<Certificate, 'id'> = {
            userId: currentUser.id,
            courseId: activeCourse.id,
            issueDate: new Date().toISOString(),
            code: Math.random().toString(36).substring(7).toUpperCase()
          };
          await createCertificate(cert);
          
          // Reload certificates
          const certificatesData = await getUserCertificates(currentUser.id);
          setCertificates(certificatesData);
        }
      }
      
      // Update assignment in Firestore
      await updateAssignment(assignment.id, updates);
      
      // Reload assignments
      const assignmentsData = await getUserAssignments(currentUser.id);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error completing module:', error);
    }
  };

  const handleNext = () => {
    if (!activeCourse) return;
    if (activeModuleIndex < activeCourse.modules.length - 1) {
      setActiveModuleIndex(prev => prev + 1);
    } else {
      // Course Complete View
      setView('certificate_view');
    }
  };

  const startCourse = async (courseId: string) => {
    if (!currentUser) return;
    
    try {
      // Check if assignment exists, if not create one (Self-enrollment)
      let assignment = assignments.find(a => a.userId === currentUser.id && a.courseId === courseId);
      if (!assignment) {
        const newAsg: Omit<Assignment, 'id'> = {
          userId: currentUser.id,
          courseId,
          assignedBy: 'self',
          assignedDate: new Date().toISOString(),
          status: 'in-progress' as AssignmentStatus,
          progress: 0
        };
        await createAssignment(newAsg);
        
        // Reload assignments
        const assignmentsData = await getUserAssignments(currentUser.id);
        setAssignments(assignmentsData);
      }
      
      // Always fetch the latest course data to ensure we have the most recent modules
      const { getCourse } = await import('./lib/firebase/firestore');
      const latestCourse = await getCourse(courseId);
      const course = latestCourse || courses.find(c => c.id === courseId);
      
      if (course) {
        console.log('Starting course with modules:', course.modules.length);
        console.log('Course modules (full details):', JSON.stringify(course.modules, null, 2));
        course.modules.forEach((m, idx) => {
          console.log(`Module ${idx}:`, {
            id: m.id,
            title: m.title,
            type: m.type,
            description: m.description,
            hasContentUrl: !!m.contentUrl,
            contentUrl: m.contentUrl,
            hasTextContent: !!m.textContent,
            quizLength: m.quiz?.length || 0
          });
        });
        setActiveCourse(course);
        setActiveModuleIndex(0);
        setView('course_player');
      } else {
        console.error('Course not found:', courseId);
      }
    } catch (error) {
      console.error('Error starting course:', error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden text-slate-900">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Cargando datos...</p>
          </div>
        </div>
      ) : (
        <Sidebar 
          view={view} 
          setView={setView} 
          currentUser={currentUser} 
          onLogout={handleLogout}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
        />
      )}
      
      {!loading && (
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden lg:ml-64 transition-all duration-200">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
           <div className="flex items-center space-x-3">
             <button onClick={() => setIsMobileOpen(true)} className="text-slate-600">
               <Icons.Menu />
             </button>
             <span className="font-bold text-slate-800">SimpleLMS</span>
           </div>
           <img src={currentUser.avatar} className="w-8 h-8 rounded-full" alt="av"/>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          
          {view === 'dashboard' && (
            <Dashboard
              currentUser={currentUser}
              courses={courses}
              assignments={assignments}
              certificates={certificates}
              onStartCourse={startCourse}
              onViewCertificate={(course) => {
                setActiveCourse(course);
                setView('certificate_view');
              }}
            />
          )}

          {view === 'library' && (
            <Library
              courses={courses}
              onStartCourse={startCourse}
              onDeleteCourse={async (courseId: string) => {
                if (confirm('¿Estás seguro de que deseas eliminar este curso? Esta acción no se puede deshacer.')) {
                  try {
                    await deleteCourse(courseId);
                    // Refresh courses list
                    const coursesData = await getAllCourses();
                    setCourses(coursesData);
                    alert('Curso eliminado exitosamente');
                  } catch (error: any) {
                    console.error('Error deleting course:', error);
                    alert(`Error al eliminar el curso: ${error.message || 'Error desconocido'}`);
                  }
                }
              }}
              isAdmin={currentUser?.role === 'admin'}
            />
          )}

          {view === 'course_player' && activeCourse && (
            <CoursePlayer
              course={activeCourse}
              currentUser={currentUser}
              assignments={assignments}
              activeModuleIndex={activeModuleIndex}
              onSetActiveModuleIndex={setActiveModuleIndex}
              onModuleComplete={handleModuleComplete}
                           onNext={handleNext}
              onBack={() => setView('dashboard')}
            />
          )}

          {view === 'certificate_view' && activeCourse && (
             <CertificateView 
               course={activeCourse} 
               user={currentUser} 
               date={new Date().toISOString()} 
               onPrint={() => window.print()} 
             />
          )}

          {/* Admin Views */}
          {view === 'admin_users' && (
            <AdminUsers users={users} />
          )}

          {view === 'admin_assignments' && (
            <AdminAssignments 
              users={users} 
              courses={courses} 
              assignments={assignments} 
              onAssign={assignCourse} 
            />
          )}

          {view === 'admin_reports' && (
            <AdminReports 
              users={users} 
              courses={courses} 
              assignments={assignments} 
            />
          )}

          {view === 'admin_create' && (
             <AdminCourseCreator 
              onSave={async (courseData, file) => { 
                 try {
                  // Remove id before saving (Firestore will generate it)
                  const { id, ...courseWithoutId } = courseData;
                   
                  // Create course first
                   const courseId = await createCourse(courseWithoutId);
                   
                  // If there's a file, upload it to Storage, extract text, and update the course
                  if (file) {
                    try {
                      console.log('Uploading file to Storage...');
                      const downloadURL = await uploadCourseFile(file, courseId);
                      console.log('File uploaded, URL:', downloadURL);
                      
                      // Extract text from the file for future use (avoids CORS issues)
                      let extractedText = '';
                      try {
                        console.log('Extracting text from uploaded file...');
                        const { extractTextFromFile } = await import('./services/geminiService');
                        const fileData = await new Promise<{ mimeType: string; data: string }>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const dataUrl = reader.result as string;
                            const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
                            if (matches) {
                              resolve({ mimeType: matches[1], data: matches[2] });
                            } else {
                              reject(new Error('Failed to convert file to data URL'));
                            }
                          };
                          reader.onerror = reject;
                          reader.readAsDataURL(file);
                        });
                        extractedText = await extractTextFromFile(fileData);
                        console.log('Text extracted, length:', extractedText.length);
                      } catch (extractError: any) {
                        console.warn('Could not extract text from file:', extractError);
                        // Continue without text - it's not critical
                      }
                      
                      // Get the current course to update
                      const currentCourses = await getAllCourses();
                      const createdCourse = currentCourses.find(c => c.id === courseId);
                      
                      if (createdCourse && createdCourse.modules.length > 0) {
                        const updatedModules = [...createdCourse.modules];
                        updatedModules[0] = {
                          ...updatedModules[0],
                          contentUrl: downloadURL,
                          textContent: extractedText || updatedModules[0].textContent
                        };
                        console.log('Updating course with Storage URL and extracted text...');
                        await updateCourse(courseId, { modules: updatedModules });
                        console.log('Course updated successfully');
                      } else {
                        console.warn('Course or modules not found after creation');
                      }
                    } catch (uploadError: any) {
                      console.error('Error uploading file:', uploadError);
                      alert(`Curso creado pero error al subir el archivo: ${uploadError.message}. Puedes editarlo más tarde.`);
                    }
                  }
                  
                  // Reload courses to get the latest data
                  const coursesData = await getAllCourses();
                  setCourses(coursesData);
                  setView('library');
                 } catch (error: any) {
                   console.error('Error creating course:', error);
                   alert(`Error al crear el curso: ${error.message || 'Error desconocido'}`);
                 }
               }} 
               onCancel={() => setView('library')} 
             />
          )}

          {view === 'admin_ai_generator' && (
            <AdminAIContentGenerator
              courses={courses}
              onBack={() => setView('library')}
              onCourseUpdated={async () => {
                // Refresh courses after content generation
                console.log('Refreshing courses after content generation...');
                const coursesData = await getAllCourses();
                setCourses(coursesData);
                console.log('Courses refreshed, total:', coursesData.length);
                
                // Log module counts for debugging
                coursesData.forEach(c => {
                  console.log(`Course "${c.title}" (${c.id}): ${c.modules.length} modules`, 
                    c.modules.map(m => ({ title: m.title, type: m.type, hasContentUrl: !!m.contentUrl }))
                  );
                });
                
                // If viewing the course that was updated, refresh it
                if (activeCourse) {
                  const { getCourse } = await import('./lib/firebase/firestore');
                  const updatedCourse = await getCourse(activeCourse.id);
                  if (updatedCourse) {
                    console.log('Refreshing active course, modules:', updatedCourse.modules.length);
                    console.log('Active course modules:', updatedCourse.modules.map(m => ({ title: m.title, type: m.type, hasContentUrl: !!m.contentUrl })));
                    setActiveCourse(updatedCourse);
                  }
                }
              }}
             />
          )}

        </div>
      </main>
      )}
    </div>
  );
}

export default App;
