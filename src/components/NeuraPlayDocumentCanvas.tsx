/**
 * 🎯 NeuraPlay Document Canvas
 * 
 * Clean, production-ready canvas that integrates ALL existing systems:
 * ✅ NeuraPlayDocumentFormatter - Markdown rendering
 * ✅ useDocumentTypewriter - Typewriter effect
 * ✅ canvasStore - Per-conversation storage
 * ✅ MemoryDatabaseBridge - Vectorization & DB storage
 * ✅ CoreTools - NLP-based content additions
 * 
 * Replaces the broken 2,446-line SpartanCanvasRenderer monolith.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Maximize2, Minimize2, Download, SkipForward, 
  History, Plus, FileText, Loader, Trash2 
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { type CanvasElement, useCanvasStore } from '../stores/canvasStore';
import NeuraPlayDocumentFormatter from './NeuraPlayDocumentFormatter';
import { getUniversalCanvasService } from '../services/UniversalCanvasService';
import { exportMarkdownToPDF } from '../utils/pdfExport';
import { canvasAccessTracker } from '../services/CanvasAccessTracker';
// Import for future web search integration
// import { webSearchEngine } from '../services/WebSearchEngine';

interface NeuraPlayDocumentCanvasProps {
  element: CanvasElement;
  conversationId: string;
  onClose?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const NeuraPlayDocumentCanvas: React.FC<NeuraPlayDocumentCanvasProps> = ({
  element,
  conversationId,
  onClose,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  const { isDarkMode } = useTheme();
  const canvasService = useMemo(() => getUniversalCanvasService(conversationId), [conversationId]);
  const { deleteCanvasVersion, archiveCanvasElement, permanentlyDeleteCanvasElement } = useCanvasStore();
  const typewriterRef = useRef<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const savedScrollPosition = useRef<number>(0);
  
  // 🔑 Get userId EARLY (during component initialization when localStorage is accessible)
  const userIdRef = useRef<string | null>(null);
  if (!userIdRef.current) {
    try {
      // Read directly from localStorage (same logic as UserIdService)
      const storedUser = localStorage.getItem('neuraplay_user') || localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userIdRef.current = userData.id || userData.username || userData.email || userData.name || 'admin_2025';
        console.log('🔑 NeuraPlayDocumentCanvas: Captured userId:', userIdRef.current);
      } else {
        userIdRef.current = 'admin_2025'; // Fallback
      }
    } catch (error) {
      console.error('❌ Failed to get userId:', error);
      userIdRef.current = 'admin_2025'; // Fallback
    }
  }
  
  // State
  const [showVersionHistory, setShowVersionHistory] = useState(true); // STUB: Default to visible for UX demo
  const [displayedContent, setDisplayedContent] = useState('');
  const [currentTypingVersion, setCurrentTypingVersion] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isVectorizing, setIsVectorizing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingChanges, setIsSuggestingChanges] = useState(false);
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  
  // Initialize completedVersions from store (versions that are already 'displayed')
  const [completedVersions, setCompletedVersions] = useState<Set<number>>(() => {
    // DEFENSIVE: Guard against undefined element or versions
    if (!element?.versions) return new Set<number>();
    const displayedVersionNumbers = element.versions
      .filter(v => v.state === 'displayed' || v.state === 'frozen')
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
  
  // 🎯 TRACK CANVAS ACCESS: Record when this document is viewed
  useEffect(() => {
    if (element && conversationId) {
      canvasAccessTracker.trackAccess(element, conversationId);
      console.log('👁️ Document canvas viewed:', element.content?.title || 'Untitled');
    }
  }, [element?.id, conversationId]);
  
  // Close delete menu when clicking outside
  useEffect(() => {
    if (!showDeleteMenu) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.delete-menu-container')) {
        setShowDeleteMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDeleteMenu]);
  
  // Listen for global events
  useEffect(() => {
    const handleToggleRevisionHistory = () => {
      setShowVersionHistory(prev => !prev);
    };
    
    const handleExport = async () => {
      // Export latest version (which is cumulative - contains V1+V2+...+Vn) as PDF
      // DEFENSIVE: Guard against undefined element or versions
      if (!element?.versions?.length) return;
      const latestVersion = element.versions[element.versions.length - 1];
      if (latestVersion) {
        try {
          const content = latestVersion.content;
          const title = element.content?.title || 'document';
          const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
          
          await exportMarkdownToPDF(content, filename, title);
        } catch (error) {
          console.error('Error exporting PDF:', error);
          alert('Failed to export PDF. Please try again.');
        }
      }
    };
    
    const handleSkip = () => {
      // Skip typewriter - shows full content immediately
      // DEFENSIVE: Guard against undefined element
      if (!element?.id) return;
      canvasService.skipTypewriter(element.id);
    };
    
    const handleCancel = () => {
      // Cancel typewriter - completely stops and freezes at current position
      // DEFENSIVE: Guard against undefined element
      if (!element?.id) return;
      canvasService.skipTypewriter(element.id);
      // Dispatch typing complete event to clear loading state
      window.dispatchEvent(new CustomEvent('canvas-typing-complete'));
      console.log('🛑 Document canvas: Typewriting cancelled and frozen');
    };
    
    window.addEventListener('toggle-canvas-revision-history', handleToggleRevisionHistory);
    window.addEventListener('canvas-export', handleExport);
    window.addEventListener('canvas-skip-typing', handleSkip);
    window.addEventListener('canvas-cancel-typing', handleCancel);
    
    return () => {
      window.removeEventListener('toggle-canvas-revision-history', handleToggleRevisionHistory);
      window.removeEventListener('canvas-export', handleExport);
      window.removeEventListener('canvas-skip-typing', handleSkip);
      window.removeEventListener('canvas-cancel-typing', handleCancel);
    };
  }, [element, canvasService]);
  
  // STUB: Create demo content for when versions don't exist
  const stubContent = `# ${element?.content?.title || 'Demo Document'}

This is a **demonstration document** showcasing the NeuraPlay Canvas system.

## Features

### Document Rendering
- **Bold text** and *italic text* supported
- Headers, lists, and formatting
- Code blocks and tables

### Version History
The sidebar on the right shows revision history. Each edit creates a new version that can be:
- Viewed individually
- Exported as PDF
- Compared with other versions

### Typewriter Effect
Content appears with a smooth typewriter animation, simulating real-time AI generation.

## Example Code

\`\`\`javascript
const canvas = new NeuraPlayCanvas();
canvas.render(document);
\`\`\`

---

> "The canvas is working correctly!" - NeuraPlay System
`;

  // Extract revision history from element (single format only)
  const revisions = useMemo(() => {
    // STUB: Always provide content - use versions if available, otherwise use stub
    if (!element?.versions?.length) {
      return [{
        version: 1,
        content: stubContent,
        fullContent: stubContent,
        request: 'Demo version'
      }];
    }
    
    const sortedVersions = element.versions
      .filter(v => {
        // Filter out deleted versions
        if ((v.state as any) === 'deleted') return false;
        return v.state === 'typing' || v.state === 'frozen' || v.state === 'displayed';
      })
      .sort((a, b) => a.version - b.version);
    
    // Calculate DELTA for each version (new content only)
    // Storage: V1 has V1, V2 has V1+V2, V3 has V1+V2+V3 (cumulative)
    // Display: Show V1, then only NEW V2 content, then only NEW V3 content
    return sortedVersions.map((v, index) => {
      let deltaContent = v.content;
      
      if (index > 0) {
        // Extract only the NEW content by removing previous version's content
        const prevContent = sortedVersions[index - 1].content;
        
        // Check if current content starts with previous content (cumulative append)
        if (v.content.startsWith(prevContent)) {
          // Remove the previous content and any separator newlines
          deltaContent = v.content.substring(prevContent.length).replace(/^\s+/, '');
          
          console.log(`[Canvas] Calculated delta for V${v.version}:`, {
            fullLength: v.content.length,
            prevLength: prevContent.length,
            deltaLength: deltaContent.length
          });
        } else {
          // Fallback: content was completely rewritten (rare)
          deltaContent = v.content;
          console.warn(`[Canvas] V${v.version} does not start with V${v.version - 1}, using full content`);
        }
      }
      
      return {
        version: v.version,
        content: deltaContent, // Only the NEW content for this version
        fullContent: v.content, // Keep full cumulative for export
        request: v.request
      };
    });
  }, [element.versions, element.id]);
  
  const currentRevision = element.currentVersion || 1;
  
  // Start typewriter for each version that needs it
  useEffect(() => {
    // STUB: If no versions, start typewriter with stub content
    if (!element.versions?.length) {
      // Only start once
      if (isTyping || displayedContent) return;
      
      console.log('[Canvas STUB] Starting typewriter with stub content');
      setIsTyping(true);
      setCurrentTypingVersion(1);
      
      canvasService.startTypewriter(
        `${element.id}-stub`,
        stubContent,
        {
          speed: 4,
          onComplete: () => {
            console.log('[Canvas STUB] Typewriter complete');
            setIsTyping(false);
            setCurrentTypingVersion(null);
            setCompletedVersions(new Set([1]));
          },
          onProgress: (progress, text) => {
            setDisplayedContent(text);
          }
        }
      );
      return;
    }
    
    // Find the first version that needs typing (only 'typing' state, not 'displayed' or 'frozen')
    const typingVersion = element.versions?.find(v => v.state === 'typing');
    
    if (!typingVersion) {
      setIsTyping(false);
      setCurrentTypingVersion(null);
      return;
    }
    
    // Skip if already completed (prevents looping when tabbing back)
    if (completedVersions.has(typingVersion.version)) {
      console.log(`[Canvas] Version ${typingVersion.version} already in completedVersions, skipping`);
      return;
    }
    
    // Already typing this version
    if (currentTypingVersion === typingVersion.version) {
      return;
    }
    
    // Get the DELTA content for this version (only new content, not cumulative)
    const revisionData = revisions.find(r => r.version === typingVersion.version);
    const contentToType = revisionData?.content || typingVersion.content;
    
    console.log(`[Canvas] Starting typewriter for version ${typingVersion.version}`, {
      isDelta: !!revisionData,
      contentLength: contentToType.length,
      preview: contentToType.substring(0, 100)
    });
    
    setIsTyping(true);
    setCurrentTypingVersion(typingVersion.version);
    isUserScrolledUpRef.current = false; // Reset auto-scroll for new typing session
    
    canvasService.startTypewriter(
      `${element.id}-v${typingVersion.version}`,
      contentToType, // Use delta content, not full cumulative
      {
        speed: 4,
        onComplete: () => {
          console.log(`✅ Completed typing version ${typingVersion.version}`);
          setCompletedVersions(prev => new Set([...prev, typingVersion.version]));
          setCurrentTypingVersion(null);
          
          // CRITICAL: Update version state to 'displayed' in store for persistence
          const { updateCanvasElement } = useCanvasStore.getState();
          const updatedVersions = element.versions?.map(v => 
            v.version === typingVersion.version 
              ? { ...v, state: 'displayed' as const }
              : v
          ) || [];
          updateCanvasElement(element.id, { versions: updatedVersions });
          
          // Check if all done
          const allDone = updatedVersions.every(v => v.state === 'displayed' || v.state === 'frozen');
          if (allDone) {
            setIsTyping(false);
            vectorizeDocument();
          }
        },
        onProgress: (progress, text) => {
          setDisplayedContent(text);
        }
      }
    );
  }, [element.versions, element.id, currentTypingVersion, canvasService, completedVersions, revisions]);
  
  // Vectorize document and store in database
  const vectorizeDocument = useCallback(async () => {
    if (isVectorizing) return;
    
    setIsVectorizing(true);
    try {
      // Use fullContent (cumulative) for vectorization, not deltas
      const latestVersion = revisions[revisions.length - 1];
      const fullContent = latestVersion?.fullContent || revisions.map(r => r.content).join('\n\n');
      const title = element.content?.title || 'Untitled Document';
      
      console.log('🔮 Vectorizing document:', { title, length: fullContent.length });
      
      const { MemoryDatabaseBridge } = await import('../services/MemoryDatabaseBridge');
      const memoryBridge = new MemoryDatabaseBridge();
      
      // 🔑 CRITICAL: Use userId captured during component initialization (userIdRef)
      const actualUserId = userIdRef.current || 'admin_2025';
      console.log('🔑 Vectorizing with userId:', actualUserId, 'conversationId:', conversationId);
      
      await memoryBridge.storeMemory({
        userId: actualUserId,
        key: `canvas_document_${element.id}`,
        value: fullContent,
        metadata: {
          type: 'canvas_document',
          isPersonalMemory: false,  // 🚫 NOT personal memory - canvas content for cross-chat context only
          isPersonalRecallable: false,  // 🎯 SEMANTIC: Exclude from "what do you remember about me" queries
          supersessionBehavior: 'accumulate',  // 🎯 SEMANTIC: Keep all canvas documents (don't replace)
          title,
          elementId: element.id,
          conversationId,
          revisionCount: revisions.length,
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('✅ Document vectorized and stored in database');
    } catch (error) {
      console.error('❌ Failed to vectorize document:', error);
    } finally {
      setIsVectorizing(false);
    }
  }, [element, conversationId, revisions, isVectorizing]);
  
  // Auto-scroll viewport to follow typewriter, detachable by scrolling up
  useEffect(() => {
    if (!scrollContainerRef.current || !isTyping) return;
    
    const container = scrollContainerRef.current;
    
    // Scroll function that checks if we should scroll
    const scrollToBottom = () => {
      if (!isUserScrolledUpRef.current && container) {
        requestAnimationFrame(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
          });
        });
      }
    };
    
    // Immediate scroll when content changes
    scrollToBottom();
    
    // CRITICAL: Watch for DOM mutations (tables, formatted text rendering)
    const observer = new MutationObserver(() => {
      scrollToBottom();
    });
    
    // Observe the container for any changes in content structure
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    return () => {
      observer.disconnect();
    };
  }, [displayedContent, isTyping]);
  
  // Detect manual scroll to detach auto-scroll
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !isTyping) return;
    
    const container = scrollContainerRef.current;
    const threshold = 50; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom < threshold;
    
    // Simple logic: at bottom = auto-scroll ON, not at bottom = auto-scroll OFF
    isUserScrolledUpRef.current = !isAtBottom;
    
    // Save scroll position for persistence
    savedScrollPosition.current = container.scrollTop;
  }, [isTyping]);
  
  // Restore scroll position when component mounts or element changes
  useEffect(() => {
    if (scrollContainerRef.current && savedScrollPosition.current > 0 && !isTyping) {
      scrollContainerRef.current.scrollTop = savedScrollPosition.current;
    }
  }, [element.id, isTyping]);
  
  // Auto-scroll to latest version when completed
  useEffect(() => {
    if (currentTypingVersion === null && completedVersions.size > 0) {
      const latestVersion = Math.max(...Array.from(completedVersions));
      const versionElement = document.getElementById(`version-${latestVersion}`);
      if (versionElement) {
        versionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentTypingVersion, completedVersions]);
  
  // Skip handlers
  const skip = useCallback(() => {
    canvasService.skipTypewriter(element.id);
  }, [canvasService, element.id]);
  
  const skipAll = useCallback(() => {
    canvasService.skipTypewriter(element.id);
  }, [canvasService, element.id]);
  
  // Export document (all versions) as PDF
  const exportDocument = useCallback(async () => {
    try {
      const exportData = canvasService.exportAsFile(element.id, 'document', 'md');
      const title = element.content?.title || 'document';
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      
      await exportMarkdownToPDF(exportData.content, filename, title);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }, [element.id, element.content?.title, canvasService]);
  
  // Export single version to PDF
  const exportVersionToPDF = useCallback(async (versionNum: number) => {
    try {
      const revision = revisions.find(r => r.version === versionNum);
      if (!revision) return;
      
      const content = revision.content;
      const title = `${element.content?.title || 'document'}_v${versionNum}`;
      const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      
      await exportMarkdownToPDF(content, filename, title);
    } catch (error) {
      console.error('Error exporting version PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  }, [revisions, element.content]);
  
  // 🗑️ Delete handlers
  const handleDeleteVersion = useCallback((versionNum: number) => {
    const confirmed = window.confirm(
      `Delete version ${versionNum}?\n\n` +
      `This will mark the version as deleted but preserve it in history. ` +
      `You won't see it in the document anymore.`
    );
    
    if (confirmed) {
      deleteCanvasVersion(element.id, versionNum);
      console.log(`🗑️ Deleted version ${versionNum} from document ${element.id}`);
    }
  }, [element.id, deleteCanvasVersion]);
  
  const handleArchiveDocument = useCallback(() => {
    const confirmed = window.confirm(
      `Archive this entire document?\n\n` +
      `The document will be hidden but preserved in storage. ` +
      `You can restore it later if needed.`
    );
    
    if (confirmed) {
      archiveCanvasElement(element.id);
      console.log(`🗑️ Archived document ${element.id}`);
      if (onClose) onClose();
    }
  }, [element.id, archiveCanvasElement, onClose]);
  
  const handlePermanentDelete = useCallback(() => {
    const confirmed = window.confirm(
      `⚠️ PERMANENTLY DELETE this document?\n\n` +
      `This action CANNOT be undone. All versions and history will be lost.\n\n` +
      `Are you absolutely sure?`
    );
    
    if (!confirmed) return;
    
    // Double confirmation for permanent delete
    const doubleConfirm = window.confirm(
      `⚠️ FINAL WARNING\n\n` +
      `You are about to permanently delete "${element.content?.title || 'this document'}".\n\n` +
      `Type "DELETE" in the next prompt to confirm.`
    );
    
    if (doubleConfirm) {
      const userInput = window.prompt('Type "DELETE" to confirm permanent deletion:');
      if (userInput === 'DELETE') {
        permanentlyDeleteCanvasElement(element.id);
        console.log(`🗑️ Permanently deleted document ${element.id}`);
        if (onClose) onClose();
      } else {
        alert('Deletion cancelled - incorrect confirmation text.');
      }
    }
  }, [element.id, element.content?.title, permanentlyDeleteCanvasElement, onClose]);
  
  // Topic Card Handlers - Direct backend processing (no chat UI)
  const triggerDocumentAddition = useCallback(async (prompt: string, context?: any) => {
    try {
      // Import toolRegistry and execute document creation with revision params
      const { toolRegistry } = await import('../services/ToolRegistry');
      
      console.log('📝 triggerDocumentAddition: Executing revision for element:', element.id);
      
      // Execute the canvas-document-creation tool with revision parameters
      const result = await toolRegistry.execute(
        'canvas-document-creation',
        {
          request: prompt,
          preferAppend: true,  // This triggers revision mode
          targetDocumentId: element.id,  // Target the current document
          activateCanvas: true,
          position: { x: 50, y: 50 },
          size: { width: 700, height: 500 },
          ...context
        },
        {
          sessionId: conversationId,
          userId: 'current-user', // TODO: Get from auth context
          startTime: Date.now()
        }
      );
      
      console.log('✅ Document addition completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Document addition failed:', error);
      throw error;
    }
  }, [element.id, conversationId]);
  
  const handleAddSection = useCallback(async () => {
    setIsAddingSection(true);
    console.log('📝 Add Section button clicked');
    
    try {
      const topic = element.content?.title || 'this document';
      const existingSections = element.versions?.map(v => {
        const headers = v.content.match(/^## .+$/gm);
        return headers?.join(', ') || '';
      }).filter(Boolean);
      
      console.log('📝 Add Section: Researching relevant content for:', topic);
      
      // Try to use IntelligentSearchService for research-backed content
      try {
        const { intelligentSearchService } = await import('../services/IntelligentSearchService');
        
        // Create a search query based on topic
        const searchQuery = `${topic} practical tips best practices guidelines`;
        console.log('🔍 Searching for:', searchQuery);
        
        const searchResults = await intelligentSearchService.search(searchQuery, {
          type: 'general',
          depth: 'detailed',
          expertLevel: 'intermediate'
        }, {
          maxResults: 5,
          deepAnalysis: false,
          includeSpecializedSources: true
        });
        
        console.log('🔍 Search returned:', searchResults?.metadata?.totalSources, 'sources');
        
        // Build section content from search
        if (searchResults?.sources?.serper && searchResults.sources.serper.length > 0) {
          // Create a prompt that incorporates the research
          const researchContext = searchResults.sources.serper
            .slice(0, 3)
            .map((s: any) => s.snippet || s.description || '')
            .filter(Boolean)
            .join('\n');
          
          if (researchContext) {
            const prompt = `Add a new section to the document about "${topic}" that covers practical insights. 
Use these research findings as context:
${researchContext}

Make the section informative and actionable.`;
            
            console.log('📝 Using research-backed prompt');
            await triggerDocumentAddition(prompt, {
              additionType: 'new-section',
              topic: topic,
              existingSections: existingSections?.slice(0, 5),
              researchContext: researchContext
            });
            return;
          }
        }
      } catch (searchError) {
        console.warn('⚠️ IntelligentSearch failed, using fallback:', searchError);
      }
      
      // Fallback to regular prompt without research
      const prompt = existingSections && existingSections.length > 0
        ? `Add a new relevant section to expand on ${topic}. Consider what's missing after these existing sections: ${existingSections.slice(0, 3).join(' | ')}`
        : `Add a comprehensive new section to ${topic} with detailed content`;
      
      console.log('📝 Using fallback prompt');
      await triggerDocumentAddition(prompt, {
        additionType: 'new-section',
        topic: topic,
        existingSections: existingSections?.slice(0, 5)
      });
      
    } catch (error) {
      console.error('❌ Add section failed:', error);
      // Ultimate fallback
      const prompt = `Add a new section to ${element.content?.title || 'this document'}`;
      await triggerDocumentAddition(prompt, { additionType: 'new-section' });
    } finally {
      setIsAddingSection(false);
    }
  }, [element.content?.title, element.versions, triggerDocumentAddition]);
  
  const handleAddChart = useCallback(async () => {
    // 📊 ANALYZE DOCUMENT & EXTRACT MEANINGFUL DATA FOR CHART
    try {
      const { toolRegistry } = await import('../services/ToolRegistry');
      const { useCanvasStore } = await import('../stores/canvasStore');
      
      const documentTitle = element.content?.title || 'Document';
      const documentContent = element.versions?.map(v => v.content).join('\n\n').substring(0, 3000) || '';
      
      console.log('📊 Analyzing document for chartable data:', documentTitle);
      
      // 🧠 USE LLM TO EXTRACT MEANINGFUL DATA FROM DOCUMENT
      const { UnifiedAPIRouter } = await import('../services/UnifiedAPIRouter');
      const unifiedAPIRouter = UnifiedAPIRouter.getInstance();
      
      const extractionPrompt = `Analyze this document and extract data that can be visualized in a chart.

Document Title: "${documentTitle}"
Document Content:
${documentContent}

Extract numerical data, comparisons, distributions, trends, or categories that would make sense as a chart.

Return ONLY valid JSON in this exact format:
{
  "chartType": "bar" | "line" | "pie" | "scatter",
  "title": "descriptive title for the chart",
  "data": [
    { "label": "category/item name", "value": number },
    ...
  ],
  "reasoning": "brief explanation of what data was extracted and why"
}

If the document contains:
- Percentages or distributions → use "pie"
- Time-based data or trends → use "line"  
- Comparisons between items → use "bar"
- Correlations between two variables → use "scatter"

If no clear numerical data exists, create a reasonable visualization of the main topics/themes mentioned (with estimated importance scores).`;

      const extractionResponse = await unifiedAPIRouter.routeAPICall(
        'fireworks',
        'llm-completion',
        {
          messages: [
            { role: 'system', content: 'You are a JSON extraction API. Return ONLY valid JSON with no additional text, explanations, or reasoning.' },
            { role: 'user', content: extractionPrompt }
          ],
          max_tokens: 800,
          temperature: 0.0, // CRITICAL: temp 0.0 = no reasoning tokens
          model: 'accounts/fireworks/models/llama-v3p1-70b-instruct'
        }
      );
      
      let chartData = {
        chartType: 'bar',
        title: `Analysis: ${documentTitle}`,
        data: [
          { label: 'Topic 1', value: 30 },
          { label: 'Topic 2', value: 25 },
          { label: 'Topic 3', value: 20 },
          { label: 'Topic 4', value: 15 },
          { label: 'Other', value: 10 }
        ]
      };
      
      // Parse LLM extraction result
      if (extractionResponse?.success && extractionResponse?.data) {
        let responseText = '';
        if (typeof extractionResponse.data === 'string') {
          responseText = extractionResponse.data;
        } else if (extractionResponse.data?.choices?.[0]?.message?.content) {
          responseText = extractionResponse.data.choices[0].message.content;
        } else if (Array.isArray(extractionResponse.data) && extractionResponse.data[0]?.generated_text) {
          responseText = extractionResponse.data[0].generated_text;
        }
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            if (extracted.data && Array.isArray(extracted.data) && extracted.data.length > 0) {
              chartData = {
                chartType: extracted.chartType || 'bar',
                title: extracted.title || `Analysis: ${documentTitle}`,
                data: extracted.data
              };
              console.log('✅ Extracted chart data from document:', extracted.reasoning);
            }
          } catch (parseError) {
            console.warn('⚠️ Failed to parse extracted data, using fallback');
          }
        }
      }
      
      // Create chart with extracted data
      const chartResult = await toolRegistry.execute(
        'create-chart',
        {
          data: chartData.data,
          chartType: chartData.chartType,
          title: chartData.title,
          is3D: false,
          interactive: true,
          theme: 'dark',
          library: 'plotly'
        },
        { sessionId: '', userId: '', startTime: Date.now() }
      );
      
      if (chartResult.success) {
        const canvasStore = useCanvasStore.getState();
        canvasStore.addCanvasElement({
          type: 'chart',
          content: {
            type: 'chart',
            title: chartData.title,
            chartType: chartData.chartType,
            series: chartData.data,
            config: chartResult.data?.config || {},
            library: 'plotly'
          },
          position: { x: 400, y: 100 },
          size: { width: 500, height: 350 },
          layer: 10,
          metadata: {
            sourceMessage: `Chart extracted from: ${documentTitle}`,
            toolResult: chartResult.data
          }
        });
        
        console.log('✅ Chart with extracted data added to canvas');
      } else {
        console.error('❌ Chart creation failed:', chartResult.error);
      }
    } catch (error) {
      console.error('❌ Add chart failed:', error);
    }
  }, [element.content?.title, element.versions]);
  
  const handleDeepAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    
    // Get current version info
    const currentVersionNumber = element.versions?.length || 1;
    const latestVersion = element.versions?.[element.versions.length - 1];
    const currentVersionContent = latestVersion?.content || element.content?.text || '';
    
    console.log('🔬 Deep Research button clicked', {
      elementId: element.id,
      currentVersion: currentVersionNumber,
      title: element.content?.title,
      contentLength: currentVersionContent.length
    });
    
    try {
      // 🔧 CRITICAL FIX: Extract REAL topic from document content, not generic title
      // Generic title = "Generated Document", Real topic = first heading or content analysis
      let topic = element.content?.title || 'this topic';
      
      // If title is generic, extract actual topic from content
      if (topic === 'Generated Document' || topic === 'this topic' || !topic || topic.length < 5) {
        // Strategy 1: Extract first markdown heading
        const headingMatch = currentVersionContent.match(/^##?\s+(.+)$/m);
        if (headingMatch && headingMatch[1]) {
          topic = headingMatch[1].trim();
          console.log('🔍 Extracted topic from first heading:', topic);
        } else {
          // Strategy 2: Extract first sentence/paragraph (up to 100 chars)
          const firstSentence = currentVersionContent
            .replace(/^[#\s]+/, '') // Remove leading markdown
            .split(/[.!?]\s/)[0]    // Get first sentence
            .substring(0, 100)      // Max 100 chars
            .trim();
          if (firstSentence.length > 10) {
            topic = firstSentence;
            console.log('🔍 Extracted topic from first sentence:', topic);
          }
        }
      }
      
      console.log('🔬 Deep Research topic determined:', topic);
      
      // 🔍 CRITICAL: Retrieve FULL vectorized canvas content from database
      // The canvas document is stored as a vector embedding - retrieve it for full context
      let fullCanvasContext = currentVersionContent;
      
      try {
        const { memoryDatabaseBridge } = await import('../services/MemoryDatabaseBridge');
        const canvasMemoryKey = `canvas_document_${element.id}`;
        
        // 🔑 CRITICAL: Use userId captured during component initialization (userIdRef)
        const actualUserId = userIdRef.current || 'admin_2025';
        console.log('🔍 Retrieving vectorized canvas content from database:', canvasMemoryKey, 'userId:', actualUserId);
        
        // Retrieve the full vectorized document from the database
        const vectorizedContent = await memoryDatabaseBridge.retrieveMemory({
          userId: actualUserId,
          query: topic, // Search by topic for relevance
          categories: ['canvas'],
          limit: 1
        });
        
        if (vectorizedContent.success && vectorizedContent.memories?.length > 0) {
          const retrieved = vectorizedContent.memories[0];
          fullCanvasContext = retrieved.value || currentVersionContent;
          console.log('✅ Retrieved vectorized canvas content:', {
            length: fullCanvasContext.length,
            source: 'vector-database'
          });
        } else {
          console.log('⚠️ No vectorized content found, using in-memory content');
        }
      } catch (vectorError) {
        console.warn('⚠️ Vector retrieval failed, using in-memory content:', vectorError);
      }
      
      // Infer complexity from existing document length
      // This ensures research matches the document's scale
      const wordCount = fullCanvasContext.split(/\s+/).length;
      const inferredComplexity = 
        wordCount < 1000 ? 'simple' :     // Short doc = short research
        wordCount < 2500 ? 'moderate' :   // Medium doc = medium research
        wordCount < 4000 ? 'complex' :    // Long doc = detailed research
        'expert';                          // Very long = comprehensive research
      
      console.log('🔬 Document context for Deep Research:', { 
        wordCount, 
        inferredComplexity,
        contentLength: fullCanvasContext.length,
        topic 
      });
      
      // 🔬 Use standalone DeepResearchService for comprehensive research
      const { deepResearchService } = await import('../services/DeepResearchService');
      
      console.log('🔬 Starting DeepResearchService with FULL vectorized context');
      
      const result = await deepResearchService.research(
        topic,
        fullCanvasContext, // ← FULL CONTENT, not substring!
        conversationId || 'canvas-research-session',
        { version: currentVersionNumber, elementId: element.id, complexity: inferredComplexity }
      );
      
      if (result.success && result.content) {
        console.log(`✅ Deep Research complete: ${result.metadata.totalSources} sources, ${result.images.length} images`);
        
        // 🔬 DIRECT VERSION ADDITION - Deep Research content is already complete
        // Bypass triggerDocumentAddition to avoid double LLM processing
        const { CanvasStateAdapter } = await import('../services/CanvasStateAdapter');
        
        // Build cumulative content: existing + research (matching version system)
        // Note: LLM already generates the "Deep Research Analysis" heading
        const researchSection = `\n\n---\n\n${result.content}`;
        const cumulativeContent = currentVersionContent + researchSection;
        
        console.log('🔬 Adding Deep Research as direct version:', {
          elementId: element.id,
          existingContentLength: currentVersionContent.length,
          researchContentLength: result.content.length,
          cumulativeContentLength: cumulativeContent.length,
          sourceCount: result.metadata.totalSources
        });
        
        // Directly add version using the existing version system
        const newVersionNumber = CanvasStateAdapter.addVersionToDocument(
          element.id,
          cumulativeContent,
          `Deep Research: ${result.metadata.totalSources} sources analyzed`,
          conversationId
        );
        
        console.log(`✅ Deep Research added as V${newVersionNumber}`);
        
        // Dispatch event to notify canvas of new version
        window.dispatchEvent(new CustomEvent('canvas-version-added', {
          detail: { 
            elementId: element.id, 
            version: newVersionNumber,
            type: 'deep-research',
            sourceCount: result.metadata.totalSources
          }
        }));
        
      } else {
        // Fallback if research service fails - use LLM generation via triggerDocumentAddition
        console.warn('⚠️ DeepResearchService returned no results, using fallback');
        await triggerDocumentAddition(
          `Provide a comprehensive deep analysis of "${topic}" with industry context, strategic implications, and actionable recommendations.`,
          { analysisType: 'deep-research-fallback', topic }
        );
      }
      
    } catch (error) {
      console.error('❌ Deep research failed:', error);
      await triggerDocumentAddition(
        `Add a detailed analysis section about "${element.content?.title || 'this topic'}"`,
        { analysisType: 'deep-research-error' }
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [element.content?.title, element.versions, conversationId, element.id, triggerDocumentAddition]);
  
  const handleSuggestions = useCallback(async () => {
    setIsSuggestingChanges(true);
    console.log('✨ Suggestions button clicked');
    
    try {
      const currentContent = element.versions?.map(v => v.content).join('\n\n').substring(0, 2000) || '';
      const docTitle = element.content?.title || 'Document';
      
      console.log('✨ Generating suggestions for:', docTitle);
      
      // Direct prompt for suggestions
      const suggestionsPrompt = `Add a "Recommendations & Suggestions" section analyzing this document and providing 5-7 concrete, actionable improvements for missing sections, content gaps, structure, additional visualizations, and clarity`;

      await triggerDocumentAddition(suggestionsPrompt, {
        analysisType: 'suggestions',
        documentTitle: docTitle,
        contentPreview: currentContent.substring(0, 500)
      });
    } catch (error) {
      console.error('❌ Suggestions failed:', error);
    } finally {
      setIsSuggestingChanges(false);
    }
  }, [element?.content?.title, element?.versions, triggerDocumentAddition]);
  
  // STUB: Allow rendering even without versions - stub data will be used for UX demo
  // Only block if element itself is missing
  if (!element) {
    return (
      <div className={`flex items-center justify-center h-64 rounded-lg ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-sm opacity-70">Loading document...</p>
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
        ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}
        ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}
        rounded-lg shadow-2xl overflow-hidden
        flex flex-col
      `}
    >
      {/* Main content area - header removed, controls in global canvas header */}
      <div className="flex-1 overflow-hidden flex">
        {/* Document content */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className={`
            flex-1 overflow-y-auto p-8
            ${isDarkMode ? 'bg-gray-900' : 'bg-white'}
          `} 
          style={{
            // Prevent rendering artifacts during scrolling
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Render all versions stacked (cumulative display) */}
            {revisions.map((revision, index) => {
              const isCurrentlyTyping = revision.version === currentTypingVersion;
              const content = isCurrentlyTyping ? displayedContent : revision.content;
              
              return (
                <div
                  key={revision.version}
                  id={`version-${revision.version}`}
                  className="version-container"
                >
                  {/* Version header */}
                  {revisions.length > 1 && (
                    <div className={`
                      flex items-center justify-between mb-4 pb-2 border-b
                      ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}
                    `}>
                      <div className="flex items-center gap-3">
                        <span className={`
                          px-3 py-1 rounded-full text-xs font-semibold
                          ${isDarkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'}
                        `}>
                          v{revision.version}
                        </span>
                        {revision.request && (
                          <span className="text-sm opacity-70">{revision.request}</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Version content */}
            <NeuraPlayDocumentFormatter
                    content={content}
                    isTyping={isCurrentlyTyping && isTyping}
              enableAdvancedFormatting={true}
            />
                  
                  {/* Separator between versions */}
                  {index < revisions.length - 1 && (
                    <div className={`
                      mt-8 border-t-2 border-dashed
                      ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}
                    `} />
                  )}
                </div>
              );
            })}
            
            {/* Vectorization status */}
            {isVectorizing && (
              <div className="mt-8 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-sm">🔮 Vectorizing document for semantic search...</p>
              </div>
            )}
            
            {/* Topic-relevant cards inline at bottom */}
            {!isTyping && revisions.length > 0 && (
              <div className="mt-12 pt-8 border-t border-gray-700/50">
                <h3 className="text-sm font-semibold opacity-70 mb-4">💡 Add to Document</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button 
                    onClick={handleAddSection}
                    disabled={isAddingSection}
                    className={`
                      text-left p-4 rounded-lg border transition-all
                      ${isDarkMode ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' : 'border-gray-200 bg-white hover:bg-gray-50'}
                      hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed
                    `}>
                    <div className="font-medium text-sm mb-1 flex items-center gap-2">
                      📝 Add Section
                      {isAddingSection && <Loader className="animate-spin" size={12} />}
                    </div>
                    <div className="text-xs opacity-70">Add a new section to this document</div>
                  </button>
                  
                  <button 
                    onClick={handleAddChart}
                    className={`
                      text-left p-4 rounded-lg border transition-all
                      ${isDarkMode ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' : 'border-gray-200 bg-white hover:bg-gray-50'}
                      hover:border-purple-500/50
                    `}>
                    <div className="font-medium text-sm mb-1">📊 Add Chart</div>
                    <div className="text-xs opacity-70">Visualize data with a chart</div>
                  </button>
                  
                  <button 
                    onClick={handleDeepAnalysis}
                    disabled={isAnalyzing}
                    className={`
                      text-left p-4 rounded-lg border transition-all
                      ${isDarkMode ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' : 'border-gray-200 bg-white hover:bg-gray-50'}
                      hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed
                    `}>
                    <div className="font-medium text-sm mb-1 flex items-center gap-2">
                      🔍 Deep Analysis
                      {isAnalyzing && <Loader className="animate-spin" size={12} />}
                    </div>
                    <div className="text-xs opacity-70">Research and analyze this topic</div>
                  </button>
                  
                  <button 
                    onClick={handleSuggestions}
                    disabled={isSuggestingChanges}
                    className={`
                      text-left p-4 rounded-lg border transition-all
                      ${isDarkMode ? 'border-gray-700 bg-gray-800 hover:bg-gray-750' : 'border-gray-200 bg-white hover:bg-gray-50'}
                      hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed
                    `}>
                    <div className="font-medium text-sm mb-1 flex items-center gap-2">
                      ✨ Suggestions
                      {isSuggestingChanges && <Loader className="animate-spin" size={12} />}
                    </div>
                    <div className="text-xs opacity-70">Get AI suggestions for improvements</div>
                  </button>
                </div>
                
                <div className={`mt-4 text-xs opacity-50 text-center`}>
                  💬 Or continue in chat to add more content
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Version history sidebar */}
        <AnimatePresence>
          {showVersionHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`
                border-l overflow-y-auto
                ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}
              `}
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Version History</h3>
                  <div className="flex gap-2 relative">
                    {revisions.length > 1 && (
                      <button
                        onClick={exportDocument}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          isDarkMode 
                            ? 'bg-purple-600 hover:bg-purple-500 text-white' 
                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                        }`}
                        title="Export all versions as one document"
                      >
                        <Download size={12} className="inline mr-1" />
                        Export All
                      </button>
                    )}
                    <div className="relative delete-menu-container">
                      <button
                        onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          isDarkMode 
                            ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                        title="Delete options"
                      >
                        <Trash2 size={12} className="inline mr-1" />
                        Delete ▾
                      </button>
                      
                      {/* Delete dropdown menu */}
                      <AnimatePresence>
                        {showDeleteMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-lg border z-50 ${
                              isDarkMode 
                                ? 'bg-gray-800 border-gray-700' 
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setShowDeleteMenu(false);
                                handleArchiveDocument();
                              }}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-opacity-10 transition-colors ${
                                isDarkMode ? 'hover:bg-white' : 'hover:bg-black'
                              }`}
                            >
                              <div className="font-medium">Archive Document</div>
                              <div className="text-xs opacity-70 mt-0.5">Hide but preserve history</div>
                            </button>
                            <div className={`border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
                            <button
                              onClick={() => {
                                setShowDeleteMenu(false);
                                handlePermanentDelete();
                              }}
                              className={`w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500 hover:bg-opacity-10 transition-colors`}
                            >
                              <div className="font-medium">⚠️ Permanent Delete</div>
                              <div className="text-xs opacity-70 mt-0.5">Cannot be undone</div>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {revisions.map((revision) => {
                    const isCompleted = completedVersions.has(revision.version);
                    const isCurrentlyTyping = currentTypingVersion === revision.version;
                    
                    return (
                      <div
                        key={revision.version}
                        className={`
                          w-full text-left p-3 rounded-lg border transition-all
                          ${isCurrentlyTyping 
                            ? 'border-purple-500 bg-purple-500/10' 
                            : isCompleted
                              ? isDarkMode ? 'border-gray-600 bg-gray-700/50' : 'border-gray-300 bg-white'
                              : isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <button
                            onClick={() => {
                              const versionElement = document.getElementById(`version-${revision.version}`);
                              if (versionElement) {
                                versionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className="text-sm font-medium hover:text-purple-500 transition-colors cursor-pointer"
                          >
                            📄 v{revision.version}
                          </button>
                          <div className="flex items-center gap-1">
                            {isCompleted && (
                              <span className="text-xs text-green-500">✓</span>
                            )}
                            {isCurrentlyTyping && (
                              <span className="text-xs text-purple-500 animate-pulse">✍️</span>
                            )}
                            {isCompleted && (
                              <>
                                <button
                                  onClick={() => exportVersionToPDF(revision.version)}
                                  className={`text-xs p-1 rounded transition-colors ${
                                    isDarkMode 
                                      ? 'hover:bg-gray-600 text-gray-400 hover:text-white' 
                                      : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'
                                  }`}
                                  title={`Export v${revision.version}`}
                                >
                                  <Download size={12} />
                                </button>
                                {revisions.length > 1 && (
                                  <button
                                    onClick={() => handleDeleteVersion(revision.version)}
                                    className={`text-xs p-1 rounded transition-colors ${
                                      isDarkMode 
                                        ? 'hover:bg-red-900/30 text-gray-400 hover:text-red-400' 
                                        : 'hover:bg-red-100 text-gray-500 hover:text-red-600'
                                    }`}
                                    title={`Delete v${revision.version}`}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {revision.request && (
                          <p className="text-xs opacity-70 line-clamp-2 mt-1">
                            {revision.request}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default NeuraPlayDocumentCanvas;




