import { useState, useEffect, useCallback } from 'react';

export interface CollaborativeDocument {
  documentMarkdown: string;
  hasUnsyncedChanges: boolean;
  collaborators: Array<{ id: string; name: string; cursor?: { line: number; column: number } }>;
  lastModified: number;
  appendContent: (content: string) => Promise<void>;
  setFromMarkdown: (markdown: string) => Promise<void>;
  updateContent: (content: string) => Promise<void>;
}

export const useCollaborativeDocument = (
  documentId: string | 'disabled',
  initialContent?: string,
  userId?: string
): CollaborativeDocument => {
  const [documentMarkdown, setDocumentMarkdown] = useState<string>(initialContent || '');
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState<boolean>(false);
  const [collaborators] = useState<Array<{ id: string; name: string; cursor?: { line: number; column: number } }>>([]);
  const [lastModified, setLastModified] = useState<number>(Date.now());

  // Update content when initialContent changes
  useEffect(() => {
    if (initialContent !== undefined && documentId !== 'disabled') {
      setDocumentMarkdown(initialContent);
      setLastModified(Date.now());
    }
  }, [initialContent, documentId]);

  const appendContent = useCallback(async (content: string): Promise<void> => {
    if (documentId === 'disabled') return;
    
    setDocumentMarkdown(prev => {
      const newContent = prev + content;
      setLastModified(Date.now());
      setHasUnsyncedChanges(true);
      
      // Simulate sync delay
      setTimeout(() => setHasUnsyncedChanges(false), 1000);
      
      return newContent;
    });
  }, [documentId]);

  const setFromMarkdown = useCallback(async (markdown: string): Promise<void> => {
    if (documentId === 'disabled') return;
    
    setDocumentMarkdown(markdown);
    setLastModified(Date.now());
    setHasUnsyncedChanges(true);
    
    // Simulate sync delay
    setTimeout(() => setHasUnsyncedChanges(false), 1000);
  }, [documentId]);

  const updateContent = useCallback(async (content: string): Promise<void> => {
    if (documentId === 'disabled') return;
    
    setDocumentMarkdown(content);
    setLastModified(Date.now());
    setHasUnsyncedChanges(true);
    
    // Simulate sync delay
    setTimeout(() => setHasUnsyncedChanges(false), 1000);
  }, [documentId]);

  return {
    documentMarkdown,
    hasUnsyncedChanges,
    collaborators,
    lastModified,
    appendContent,
    setFromMarkdown,
    updateContent
  };
};
