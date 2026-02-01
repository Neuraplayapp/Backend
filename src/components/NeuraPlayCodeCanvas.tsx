/**
 * 🎯 NeuraPlay Code Canvas
 * 
 * Code editor canvas with CodeMirror 6 integration.
 * 
 * Features:
 * - Full CodeMirror 6 editor
 * - Language detection and syntax highlighting
 * - Line numbers, autocomplete, linting
 * - Export as file (.js, .py, .html, etc.)
 * - Version history with code diffs
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Maximize2, Minimize2, Download, Code2, Play, Save, Settings 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { type CanvasElement, useCanvasStore } from '../stores/canvasStore';
import { codeMirrorCanvasService, type SupportedLanguage } from '../services/CodeMirrorCanvasService';
import { codeFormatterService } from '../services/CodeFormatterService';
import { getUniversalCanvasService } from '../services/UniversalCanvasService';
import { canvasAccessTracker } from '../services/CanvasAccessTracker';

interface NeuraPlayCodeCanvasProps {
  element: CanvasElement;
  conversationId: string;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const NeuraPlayCodeCanvas: React.FC<NeuraPlayCodeCanvasProps> = ({
  element,
  conversationId,
  onClose,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { isDarkMode } = useTheme();
  const canvasService = useMemo(() => getUniversalCanvasService(conversationId), [conversationId]);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorInitialized = useRef(false);
  
  const [language, setLanguage] = useState<SupportedLanguage>('javascript');
  const [showSettings, setShowSettings] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [lineWrapping, setLineWrapping] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Typewriter state
  const [displayedCode, setDisplayedCode] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // DEFENSIVE GUARD: Check if element/content is valid (after all hooks)
  const isValidElement = element && element.content !== undefined && element.content !== null;
  
  // Initialize completedVersions from store (versions that are already 'displayed')
  const [completedVersions, setCompletedVersions] = useState<Set<number>>(() => {
    // DEFENSIVE: Handle undefined element/versions
    if (!element || !element.versions) return new Set<number>();
    const displayedVersionNumbers = element.versions
      ?.filter(v => v.state === 'displayed')
      .map(v => v.version) || [];
    return new Set(displayedVersionNumbers);
  });
  
  // Viewport management
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);
  
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 🎯 TRACK CANVAS ACCESS: Record when this code editor is viewed
  useEffect(() => {
    if (element && conversationId) {
      canvasAccessTracker.trackAccess(element, conversationId);
      console.log('👁️ Code canvas viewed:', element.content?.title || element.content?.filename || 'Untitled');
    }
  }, [element?.id, conversationId]);

  // Listen for skip/cancel typewriting events
  useEffect(() => {
    const handleSkip = () => {
      // Skip typewriter - shows full content immediately
      canvasService.skipTypewriter(element.id);
    };
    
    const handleCancel = () => {
      // Cancel typewriter - completely stops and freezes at current position
      canvasService.skipTypewriter(element.id);
      setIsTyping(false);
      // Dispatch typing complete event to clear loading state
      window.dispatchEvent(new CustomEvent('canvas-typing-complete'));
      console.log('🛑 Code canvas: Typewriting cancelled and frozen');
    };
    
    window.addEventListener('canvas-skip-typing', handleSkip);
    window.addEventListener('canvas-cancel-typing', handleCancel);
    
    return () => {
      window.removeEventListener('canvas-skip-typing', handleSkip);
      window.removeEventListener('canvas-cancel-typing', handleCancel);
    };
  }, [element?.id, canvasService]);

  // Get code versions
  const codeVersions = useMemo(() => {
    // DEFENSIVE: Handle undefined element
    if (!element || !element.versions || element.versions.length === 0) {
      // Fallback for old format or undefined element
      const code = element?.content && typeof element.content === 'object' && 'code' in element.content
        ? element.content.code
        : '';
      return code ? [{ version: 1, content: code, request: 'Initial code', state: 'displayed' as const }] : [];
    }
    
    return element.versions
      .filter(v => v.state === 'typing' || v.state === 'displayed')
      .map(v => ({
        version: v.version,
        content: v.content,
        request: v.request,
        state: v.state // Include state for persistence checks
      }))
      .sort((a, b) => a.version - b.version);
  }, [element?.versions, element?.content]);

  const currentVersion = codeVersions[codeVersions.length - 1];

  // Start typewriter for code
  useEffect(() => {
    // Only type if version state is 'typing' (not 'displayed')
    if (!currentVersion || currentVersion.state !== 'typing') {
      // If already displayed, show the code immediately
      if (currentVersion && currentVersion.state === 'displayed') {
        setDisplayedCode(currentVersion.content);
        setIsTyping(false);
        if (!completedVersions.has(currentVersion.version)) {
          setCompletedVersions(prev => new Set([...prev, currentVersion.version]));
        }
      }
      return;
    }
    
    // Skip if already completed (prevents looping when tabbing back)
    if (completedVersions.has(currentVersion.version)) {
      console.log(`[Code] Version ${currentVersion.version} already in completedVersions, skipping`);
      return;
    }
    
    setIsTyping(true);
    
    canvasService.startTypewriter(
      element.id,
      currentVersion.content,
      {
        speed: 2, // Faster for code (2ms vs 4ms for docs)
        onComplete: () => {
          setIsTyping(false);
          setDisplayedCode(currentVersion.content);
          setCompletedVersions(prev => new Set([...prev, currentVersion.version]));
          
          // CRITICAL: Update version state to 'displayed' in store for persistence
          // DEFENSIVE: Guard against undefined element.versions in callback
          if (element?.versions && Array.isArray(element.versions)) {
            const { updateCanvasElement } = useCanvasStore.getState();
            const updatedVersions = element.versions.map((v: any) => 
              v.version === currentVersion.version 
                ? { ...v, state: 'displayed' as const }
                : v
            );
            updateCanvasElement(element.id, { versions: updatedVersions });
          }
        },
        onProgress: (progress, text) => {
          setDisplayedCode(text);
        }
      }
    );
    
    return () => {
      // Cleanup if component unmounts during typing
    };
  }, [currentVersion, element.id, element.versions, canvasService, completedVersions]);

  // Initialize CodeMirror editor after typing completes
  useEffect(() => {
    if (isTyping || !currentVersion || !editorContainerRef.current || editorInitialized.current) return;
    // Check version state instead of local completedVersions
    if (currentVersion.state === 'typing') return;

    editorInitialized.current = true;

    // Detect language
    const detectedLanguage = codeMirrorCanvasService.detectLanguage(
      element.metadata?.filename,
      currentVersion.content
    );
    setLanguage(detectedLanguage);

    // Create editor with completed code
    codeMirrorCanvasService.createEditor(
      element.id,
      editorContainerRef.current,
      displayedCode,
      {
        language: detectedLanguage,
        theme: isDarkMode ? 'dark' : 'light',
        lineNumbers,
        lineWrapping,
        onChange: handleCodeChange
      }
    );

    return () => {
      codeMirrorCanvasService.destroyEditor(element.id);
      editorInitialized.current = false;
    };
  }, [isTyping, currentVersion, completedVersions, displayedCode, isDarkMode, lineNumbers, lineWrapping]);

  // Update theme when it changes
  useEffect(() => {
    if (editorInitialized.current) {
      codeMirrorCanvasService.setTheme(element.id, isDarkMode ? 'dark' : 'light');
    }
  }, [isDarkMode, element.id]);

  const handleCodeChange = useCallback(async (newCode: string) => {
    // Auto-save to version service
    try {
      await canvasService.addVersion(element.id, newCode, 'Code update');
    } catch (error) {
      console.error('Failed to save code version:', error);
    }
  }, [element?.id, canvasService]);

  const handleLanguageChange = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    codeMirrorCanvasService.setLanguage(element.id, newLanguage);
  };

  const handleFormat = () => {
    const code = codeMirrorCanvasService.getContent(element.id);
    const formatted = codeFormatterService.format(code, language as any, {
      tabSize: 2,
      trimTrailingWhitespace: true
    });
    codeMirrorCanvasService.setContent(element.id, formatted);
  };

  const handleExport = () => {
    const exportData = codeMirrorCanvasService.exportCode(element.id);
    const blob = new Blob([exportData.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportData.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const code = codeMirrorCanvasService.getContent(element.id);
      await canvasService.addVersion(element.id, code, 'Manual save');
      console.log('✅ Code saved');
    } catch (error) {
      console.error('Failed to save code:', error);
    } finally {
      setSaving(false);
    }
  };

  const languages: { value: SupportedLanguage; label: string }[] = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'text', label: 'Plain Text' }
  ];

  // DEFENSIVE GUARD: Show loading state if element is not ready
  if (!isValidElement) {
    return (
      <div className={`flex items-center justify-center h-64 rounded-lg ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm opacity-70">Loading code editor...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`
        ${isFullscreen ? 'fixed inset-0 z-50' : 'relative'}
        ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-2xl overflow-hidden
        flex flex-col
      `}
      style={{
        height: isFullscreen ? '100vh' : `${viewportHeight - 120}px`,
        maxHeight: isFullscreen ? '100vh' : '85vh'
      }}
    >
      {/* Compact Toolbar - Essential controls only */}
      <div className={`
        flex items-center gap-2 px-4 py-2 border-b
        ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50/50'}
      `}>
        {/* Language Selector */}
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className={`px-2 py-1 rounded text-xs ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 focus:border-green-500'
              : 'bg-white border-gray-300 focus:border-green-500'
          } focus:outline-none border`}
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>

        <div className={`h-4 w-px ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Format Button */}
        <button
          onClick={handleFormat}
          className={`px-2 py-1 text-xs rounded hover:bg-green-500/10 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
          title="Format code"
        >
          Format
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-2 py-1 text-xs rounded hover:bg-green-500/10 transition-colors disabled:opacity-50 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
          title="Save"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className={`px-2 py-1 text-xs rounded hover:bg-green-500/10 transition-colors ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
          title="Export code"
        >
          Export
        </button>
        
        <div className="flex-1" />
        
        {/* Settings toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`
            px-2 py-1 text-xs rounded transition-colors
            ${showSettings ? 'bg-green-500 text-white' : `hover:bg-green-500/10 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
          `}
          title="Settings"
        >
          Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className={`
          px-6 py-3 border-b
          ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}
        `}>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lineNumbers}
                onChange={(e) => setLineNumbers(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm">Line Numbers</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lineWrapping}
                onChange={(e) => setLineWrapping(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-500 focus:ring-green-500"
              />
              <span className="text-sm">Line Wrapping</span>
            </label>
          </div>
        </div>
      )}
      
      {/* Editor Container */}
      <div className={`
        flex-1 overflow-hidden
        ${isDarkMode ? 'bg-gray-900' : 'bg-white'}
      `}>
        {isTyping ? (
          /* Typewriter display while typing */
          <div className="h-full overflow-auto p-4">
            <pre className={`
              font-mono text-sm
              ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}
            `}>
              <code>{displayedCode}</code>
              <span className="inline-block w-2 h-4 ml-1 bg-green-500 animate-pulse">|</span>
            </pre>
          </div>
        ) : (
          /* CodeMirror editor after typing completes */
          <div
            ref={editorContainerRef}
            className="h-full"
            style={{ minHeight: '400px' }}
          />
        )}
      </div>
      
      {/* Footer */}
      <div className={`
        flex items-center justify-between px-6 py-3 border-t
        ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
      `}>
        <div className="text-sm opacity-70">
          💻 CodeMirror 6 Editor • {language}
        </div>
        
        <div className="text-sm opacity-50">
          Auto-saves on change
        </div>
      </div>
    </motion.div>
  );
};

export default NeuraPlayCodeCanvas;

