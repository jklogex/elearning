import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param path - Storage path (e.g., 'courses/courseId/document.pdf')
 * @returns Download URL of the uploaded file
 */
export const uploadFile = async (file: File, path: string, maxSizeMB: number = 10): Promise<string> => {
  try {
    // Check file size (default 10MB, but can be overridden for audio files)
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
    }

    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Upload a course document
 * @param file - The file to upload
 * @param courseId - The course ID
 * @param maxSizeMB - Maximum file size in MB (default 10MB, 50MB for audio files)
 * @returns Download URL of the uploaded file
 */
export const uploadCourseFile = async (file: File, courseId: string, maxSizeMB?: number): Promise<string> => {
  const fileName = `${Date.now()}-${file.name}`;
  const path = `courses/${courseId}/${fileName}`;
  
  // Audio files (podcasts) can be larger - allow up to 50MB
  const isAudioFile = file.type.startsWith('audio/') || file.name.match(/\.(wav|mp3|m4a|ogg)$/i);
  const sizeLimit = maxSizeMB || (isAudioFile ? 50 : 10);
  
  return uploadFile(file, path, sizeLimit);
};

/**
 * Delete a file from Firebase Storage
 * @param path - Storage path of the file to delete
 */
export const deleteFile = async (path: string): Promise<void> => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.error('Error deleting file:', error);
    // Don't throw - file might not exist
  }
};

/**
 * Delete all files for a course from Firebase Storage
 * @param courseId - The course ID
 */
export const deleteCourseFiles = async (courseId: string): Promise<void> => {
  try {
    const courseRef = ref(storage, `courses/${courseId}`);
    
    // List all files in the course folder
    const result = await listAll(courseRef);
    
    // Delete all files
    const deletePromises = result.items.map(item => deleteObject(item));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${result.items.length} files for course ${courseId}`);
  } catch (error: any) {
    // If folder doesn't exist, that's okay
    if (error.code !== 'storage/object-not-found' && error.code !== 'storage/unauthorized') {
      console.error('Error deleting course files:', error);
    }
  }
};

