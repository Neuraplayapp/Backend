import React from 'react';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  compact?: boolean;
  children: React.ReactNode;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, isDarkMode, compact = false, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center md:justify-center pointer-events-none">
      <div className={`${compact ? 'w-full max-w-md mt-2 px-2' : 'w-full max-w-xl sm:max-w-2xl lg:max-w-3xl mt-4 sm:mt-6 px-2 sm:px-4'} pointer-events-auto`}>
        <div className={`rounded-xl sm:rounded-2xl border shadow-2xl ${isDarkMode ? 'bg-[#1a1a2e] border-white/10' : 'bg-white border-gray-200'}`}>
          <div className={`flex items-center justify-between ${compact ? 'px-2 py-1.5' : 'px-3 py-2 sm:p-3'} border-b border-white/10`}>
            <div className={`${isDarkMode ? 'text-white' : 'text-gray-900'} ${compact ? 'text-xs' : 'text-sm'} font-medium`}>Search Results</div>
            <button onClick={onClose} className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'} ${compact ? 'p-1' : 'p-1.5'} rounded-md`} aria-label="Close overlay">✕</button>
          </div>
          <div className={`${compact ? 'p-2' : 'p-3 sm:p-4'} max-h-[60vh] overflow-auto`}>
            <div className={`prose max-w-none ${compact ? 'prose-sm' : ''}`}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;


