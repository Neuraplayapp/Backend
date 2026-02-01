/**
 * SEARCH SUGGESTION CARDS - Small contextual search suggestions
 * 
 * Features:
 * - Tiny cards with LLM-generated follow-up searches
 * - Click to execute new search
 * - Contextual reasoning tooltips
 * - Scandinavian minimalist design
 */

import React from 'react';
import { Search, ArrowRight, Lightbulb, TrendingUp, Zap } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { SearchSuggestion } from '../services/WebSearchEngine';

interface SearchSuggestionCardsProps {
  suggestions: SearchSuggestion[];
  onSuggestionClick: (query: string) => void;
  className?: string;
}

const SearchSuggestionCards: React.FC<SearchSuggestionCardsProps> = ({
  suggestions,
  onSuggestionClick,
  className = ''
}) => {
  const { isDarkMode } = useTheme();

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'follow_up': return <ArrowRight className="w-3 h-3" />;
      case 'deeper': return <Zap className="w-3 h-3" />;
      case 'related': return <TrendingUp className="w-3 h-3" />;
      case 'broader': return <Lightbulb className="w-3 h-3" />;
      default: return <Search className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'follow_up': return isDarkMode ? 'text-blue-300' : 'text-blue-600';
      case 'deeper': return isDarkMode ? 'text-purple-300' : 'text-purple-600';
      case 'related': return isDarkMode ? 'text-green-300' : 'text-green-600';
      case 'broader': return isDarkMode ? 'text-orange-300' : 'text-orange-600';
      default: return isDarkMode ? 'text-gray-300' : 'text-gray-600';
    }
  };

  return (
    <div className={`mt-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Search className={`w-3.5 h-3.5 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`} />
        <h4 className={`text-xs font-medium ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
          Suggested searches
        </h4>
      </div>
      
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 4).map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion.query)}
            title={suggestion.reasoning}
            className={`${
              isDarkMode 
                ? 'bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 hover:text-white/90' 
                : 'bg-white/40 border border-gray-200/40 hover:bg-white/60 text-gray-700 hover:text-gray-900'
            } backdrop-blur-sm rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 group flex items-center gap-1.5`}
          >
            <div className={`${getTypeColor(suggestion.type)} flex-shrink-0`}>
              {getTypeIcon(suggestion.type)}
            </div>
            <span className="truncate">{suggestion.query}</span>
            <div className={`opacity-0 group-hover:opacity-100 transition-opacity ${
              isDarkMode ? 'text-blue-300' : 'text-blue-600'
            }`}>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchSuggestionCards;
