import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface MobileContextValue {
  // Assistant state
  assistantOpen: boolean;
  setAssistantOpen: (open: boolean) => void;
  toggleAssistant: () => void;
  
  // Page navigation state
  currentPage: number; // 0=News, 1=Canvas, 2=Dashboard
  setCurrentPage: (page: number) => void;
  
  // Page names for reference
  pageNames: readonly ['news', 'canvas', 'dashboard'];
  getCurrentPageName: () => 'news' | 'canvas' | 'dashboard';
}

const MobileContext = createContext<MobileContextValue | null>(null);

interface MobileProviderProps {
  children: ReactNode;
  initialPage?: number;
}

export const MobileProvider: React.FC<MobileProviderProps> = ({ 
  children, 
  initialPage = 1 // Default to canvas (center page)
}) => {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const pageNames = ['news', 'canvas', 'dashboard'] as const;

  const toggleAssistant = useCallback(() => {
    setAssistantOpen(prev => !prev);
  }, []);

  const getCurrentPageName = useCallback(() => {
    return pageNames[currentPage] || 'canvas';
  }, [currentPage]);

  const value: MobileContextValue = {
    assistantOpen,
    setAssistantOpen,
    toggleAssistant,
    currentPage,
    setCurrentPage,
    pageNames,
    getCurrentPageName,
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobileContext = (): MobileContextValue => {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobileContext must be used within a MobileProvider');
  }
  return context;
};

export default MobileContext;




