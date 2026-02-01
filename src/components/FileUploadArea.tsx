/**
 * FILE UPLOAD AREA - Multimodal Input Component
 * 
 * Provides drag-and-drop functionality for images and documents.
 * Integrates seamlessly with existing NeuraPlay UI design.
 * 
 * FEATURES:
 * - Subtle, semi-transparent overlay that appears on hover
 * - Support for images (PNG, JPG, WEBP, GIF)
 * - Support for documents (PDF, TXT, DOC, DOCX)
 * - Visual feedback during drag operations
 * - File validation and size limits
 * - Preview capabilities for uploaded files
 */

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Image, 
  FileText, 
  X, 
  AlertCircle,
  Check,
  Eye
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  type: 'image' | 'document';
}

interface FileUploadAreaProps {
  onFilesSelected: (files: FileWithPreview[]) => void;
  onFilesRemoved: (fileIds: string[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  className?: string;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesSelected,
  onFilesRemoved,
  maxFiles = 5,
  maxFileSize = 10,
  acceptedTypes = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  className = ''
}) => {
  const { theme } = useTheme();
  const [isDragActive, setIsDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for files
  const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Validate file type and size
  const validateFile = (file: File): string | null => {
    if (!acceptedTypes.includes(file.type)) {
      return `File type ${file.type} not supported`;
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }
    
    return null;
  };

  // Determine file type category
  const getFileType = (file: File): 'image' | 'document' => {
    return file.type.startsWith('image/') ? 'image' : 'document';
  };

  // Create preview for images
  const createPreview = async (file: File): Promise<string | undefined> => {
    if (!file.type.startsWith('image/')) return undefined;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Process selected files
  const processFiles = async (files: File[]) => {
    const newErrors: string[] = [];
    const validFiles: FileWithPreview[] = [];

    // Check total file limit
    if (uploadedFiles.length + files.length > maxFiles) {
      newErrors.push(`Maximum ${maxFiles} files allowed`);
      setErrors(newErrors);
      return;
    }

    for (const file of files) {
      const error = validateFile(file);
      
      if (error) {
        newErrors.push(`${file.name}: ${error}`);
        continue;
      }

      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: generateFileId(),
        type: getFileType(file),
        preview: await createPreview(file)
      });

      validFiles.push(fileWithPreview);
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      // Clear errors after 5 seconds
      setTimeout(() => setErrors([]), 5000);
    }

    if (validFiles.length > 0) {
      const updatedFiles = [...uploadedFiles, ...validFiles];
      setUploadedFiles(updatedFiles);
      onFilesSelected(validFiles);
    }
  };

  // Handle file selection via input
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await processFiles(droppedFiles);
    }
  }, [uploadedFiles, maxFiles]);

  // Remove file
  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    onFilesRemoved([fileId]);
  };

  // Click to select files
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const isDark = theme === 'dark';
  const hasFiles = uploadedFiles.length > 0;

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main upload area */}
      <motion.div
        className={`
          relative group cursor-pointer transition-all duration-300 min-h-[64px]
          ${hasFiles ? 'mb-4' : 'mb-2'}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        {/* Subtle overlay that appears on hover or drag */}
        <AnimatePresence>
          {(isHovered || isDragActive) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`
                absolute inset-0 z-10 rounded-lg border-2 border-dashed
                ${isDragActive 
                  ? (isDark ? 'border-purple-400 bg-purple-500/20' : 'border-purple-500 bg-purple-50/80')
                  : (isDark ? 'border-gray-600 bg-gray-800/50' : 'border-gray-300 bg-gray-50/80')
                }
                backdrop-blur-sm
              `}
            >
              <div className="flex flex-col items-center justify-center h-full p-6">
                <motion.div
                  animate={{ scale: isDragActive ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                  className={`
                    p-3 rounded-full mb-3
                    ${isDragActive
                      ? (isDark ? 'bg-purple-500/30' : 'bg-purple-100')
                      : (isDark ? 'bg-gray-700/50' : 'bg-white/80')
                    }
                  `}
                >
                  <Upload 
                    size={24} 
                    className={`
                      ${isDragActive
                        ? 'text-purple-500'
                        : (isDark ? 'text-gray-300' : 'text-gray-600')
                      }
                    `}
                  />
                </motion.div>
                
                <p className={`
                  text-sm font-medium text-center mb-1
                  ${isDragActive
                    ? 'text-purple-500'
                    : (isDark ? 'text-gray-300' : 'text-gray-700')
                  }
                `}>
                  {isDragActive ? 'Drop files here' : 'Add images or documents'}
                </p>
                
                <p className={`
                  text-xs text-center
                  ${isDark ? 'text-gray-400' : 'text-gray-500'}
                `}>
                  Click or drag files • Max {maxFiles} files, {maxFileSize}MB each
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Always visible file upload area */}
        {!hasFiles && !isHovered && !isDragActive && (
          <div className={`
            absolute inset-0 z-5 rounded-lg border border-dashed opacity-50 hover:opacity-80 transition-opacity
            ${isDark ? 'border-gray-600 bg-gray-800/20' : 'border-gray-300 bg-gray-50/40'}
          `}>
            <div className="flex items-center justify-center h-16 px-4">
              <div className="flex items-center gap-2 text-sm">
                <Upload size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  📎 Add images or documents
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Small file icon in input area when hovering */}
        {!hasFiles && (isHovered || isDragActive) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 z-5">
            <div className={`
              p-2 rounded-md opacity-70 transition-opacity
              ${isDark ? 'text-gray-400' : 'text-gray-500'}
            `}>
              <Upload size={16} />
            </div>
          </div>
        )}
      </motion.div>

      {/* Error messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            {errors.map((error, index) => (
              <div
                key={index}
                className={`
                  flex items-center gap-2 text-sm p-2 rounded-md mb-1
                  ${isDark 
                    ? 'bg-red-900/20 text-red-400 border border-red-500/20' 
                    : 'bg-red-50 text-red-600 border border-red-200'
                  }
                `}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded files list */}
      <AnimatePresence>
        {hasFiles && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {uploadedFiles.map((file) => (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border
                  ${isDark 
                    ? 'bg-gray-800/50 border-gray-700' 
                    : 'bg-gray-50 border-gray-200'
                  }
                `}
              >
                {/* File icon or preview */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-200">
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`
                      w-10 h-10 rounded-md flex items-center justify-center
                      ${isDark ? 'bg-gray-700' : 'bg-gray-200'}
                    `}>
                      <FileText size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className={`
                    text-sm font-medium truncate
                    ${isDark ? 'text-gray-200' : 'text-gray-800'}
                  `}>
                    {file.name}
                  </p>
                  <p className={`
                    text-xs
                    ${isDark ? 'text-gray-400' : 'text-gray-500'}
                  `}>
                    {(file.size / 1024 / 1024).toFixed(2)}MB • {file.type === 'image' ? 'Image' : 'Document'}
                  </p>
                </div>

                {/* Status indicator */}
                <div className="flex-shrink-0">
                  <div className={`
                    p-1 rounded-full
                    ${isDark ? 'bg-green-900/20' : 'bg-green-100'}
                  `}>
                    <Check 
                      size={14} 
                      className={isDark ? 'text-green-400' : 'text-green-600'} 
                    />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile(file.id);
                  }}
                  className={`
                    flex-shrink-0 p-1 rounded-full transition-colors
                    ${isDark 
                      ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-300' 
                      : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUploadArea;
