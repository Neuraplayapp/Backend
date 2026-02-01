import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NeuraPlayDocumentFormatter from './NeuraPlayDocumentFormatter';
import './ResponseMessage.css';

interface ContentBlock {
  type: 'text' | 'chart' | 'image' | 'suggestion';
  value?: string;
  data?: any;
  text?: string;
  target?: string;
}

interface ResponseMessageProps {
  content: ContentBlock[];
  isDarkMode: boolean;
  compact?: boolean;
  onSuggestionClick?: (target: string, data: any) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const TextComponent: React.FC<{ text: string; isDarkMode: boolean }> = ({ text, isDarkMode }) => (
  <div className="text-content">
    <NeuraPlayDocumentFormatter 
      content={text}
      isTyping={false}
      enableAdvancedFormatting={true}
      className="text-sm"
    />
  </div>
);

const ChartComponent: React.FC<{ data: any; isDarkMode: boolean }> = ({ data, isDarkMode }) => (
  <div className="chart-component-wrapper">
    <div className={`chart-container ${isDarkMode ? 'dark' : 'light'}`}>
      <h4 className="chart-title">{data.title || 'Chart'}</h4>
      <div className="chart-placeholder">
        📊 Chart: {data.chartType || 'Unknown'}
        <pre className="chart-data">{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  </div>
);

const SuggestionComponent: React.FC<{ 
  text: string; 
  target: string; 
  data: any; 
  isDarkMode: boolean;
  onClick?: (target: string, data: any) => void;
}> = ({ text, target, data, isDarkMode, onClick }) => (
  <motion.button
    className={`suggestion-button ${isDarkMode ? 'dark' : 'light'}`}
    onClick={() => onClick?.(target, data)}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
  >
    <span className="suggestion-icon">🎨</span>
    <span className="suggestion-text">{text}</span>
    <span className="suggestion-arrow">→</span>
  </motion.button>
);

export const ResponseMessage: React.FC<ResponseMessageProps> = ({ 
  content, 
  isDarkMode, 
  compact = false,
  onSuggestionClick 
}) => (
  <motion.div 
    className="response-container"
    initial="hidden"
    animate="visible"
    transition={{ staggerChildren: 0.2 }}
  >
    <AnimatePresence>
      {content.map((block, index) => (
        <motion.div 
          key={index} 
          variants={itemVariants}
          className="content-block"
          layout
        >
          {block.type === 'text' && (
            <TextComponent 
              text={block.value || block.text || ''} 
              isDarkMode={isDarkMode} 
            />
          )}
          
          {block.type === 'chart' && (
            <ChartComponent 
              data={block.data} 
              isDarkMode={isDarkMode} 
            />
          )}
          
          {block.type === 'suggestion' && (
            <SuggestionComponent 
              text={block.text || 'Open in NeuraBoard'}
              target={block.target || 'canvas'}
              data={block.data}
              isDarkMode={isDarkMode}
              onClick={onSuggestionClick}
            />
          )}
        </motion.div>
      ))}
    </AnimatePresence>
  </motion.div>
);

export default ResponseMessage;
