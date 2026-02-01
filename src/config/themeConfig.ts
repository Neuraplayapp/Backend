// Comprehensive Theme Configuration for AI Assistant
// This file contains light and dark theme configurations for all components

export const lightThemeConfig = {
  // Features Section Configuration
  features: {
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
    textColors: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      accent: 'text-blue-600'
    },
    cards: {
      inactive: {
        background: 'bg-white',
        text: 'text-gray-800',
        border: 'border-blue-200',
        shadow: 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]',
        hoverShadow: 'hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]',
        hoverBorder: 'hover:border-blue-500'
      },
      active: {
        background: 'bg-gradient-to-r from-blue-600 to-purple-600',
        text: 'text-white',
        border: 'border-blue-500',
        shadow: 'shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]'
      }
    },
    descriptionBox: {
      background: 'bg-white',
      border: 'border-blue-200',
      shadow: 'shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]',
      text: 'text-gray-800'
    }
  },
  
  // Videos Section Configuration
  videos: {
    background: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    textColors: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600'
    }
  },
  
  // Footer Configuration
  footer: {
    background: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    text: 'text-gray-800',
    border: 'border-blue-200'
  },
  
  // Hero Section Configuration
  hero: {
    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
    textColors: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600'
    }
  },
  
  // Modal Configurations
  modals: {
    background: 'bg-white',
    overlay: 'bg-black/50',
    border: 'border-blue-200',
    shadow: 'shadow-2xl',
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      accent: 'text-blue-600'
    },
    button: {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
      outline: 'border border-blue-300 hover:bg-blue-50 text-gray-700'
    }
  },
  
  // Dropdown Configurations
  dropdowns: {
    background: 'bg-white',
    border: 'border-blue-200',
    shadow: 'shadow-lg',
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      hover: 'hover:bg-blue-50'
    }
  },
  
  // Settings Panel Configuration
  settings: {
    background: 'bg-white',
    border: 'border-blue-200',
    shadow: 'shadow-xl',
    text: {
      primary: 'text-gray-900',
      secondary: 'text-gray-600',
      label: 'text-gray-700'
    },
    input: {
      background: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-gray-900',
      focus: 'focus:border-blue-500 focus:ring-blue-500'
    }
  },
  
  // Global Light Theme Colors
  colors: {
    primary: '#2563eb', // Blue-600
    secondary: '#6b7280', // Gray-500
    accent: '#f59e0b', // Amber-500
    background: '#ffffff',
    surface: '#f0f9ff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#bfdbfe',
    shadow: 'rgba(0, 0, 0, 0.1)'
  },
  
  // Gradient Definitions
  gradients: {
    hero: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
    features: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
    videos: 'bg-gradient-to-br from-blue-50 to-indigo-50',
    footer: 'bg-gradient-to-br from-blue-50 to-indigo-50'
  },
  
  // Animation and Effects
  effects: {
    cardHover: 'hover:shadow-lg hover:-translate-y-1',
    backdropBlur: 'backdrop-blur-sm',
    glassEffect: 'bg-white/80 backdrop-blur-sm',
    shadows: {
      card: 'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)]',
      cardHover: 'hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]',
      active: 'shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]',
      modal: 'shadow-2xl'
    }
  }
};

export const darkThemeConfig = {
  // Features Section Configuration
  features: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #312e81 100%)',
    textColors: {
      primary: 'text-white',
      secondary: 'text-gray-200',
      accent: 'text-purple-400'
    },
    cards: {
      inactive: {
        background: 'bg-white/10 backdrop-blur-sm',
        text: 'text-white',
        border: 'border-white/20',
        shadow: 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]',
        hoverShadow: 'hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]',
        hoverBorder: 'hover:border-purple-500'
      },
      active: {
        background: 'bg-gradient-to-r from-purple-600 to-blue-600',
        text: 'text-white',
        border: 'border-purple-500',
        shadow: 'shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]'
      }
    },
    descriptionBox: {
      background: 'bg-gradient-to-br from-gray-800 to-gray-900',
      border: 'border-gray-600',
      shadow: 'shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]',
      text: 'text-white'
    }
  },
  
  // Videos Section Configuration
  videos: {
    background: 'bg-gradient-to-br from-purple-900 to-indigo-900',
    textColors: {
      primary: 'text-white',
      secondary: 'text-gray-200'
    }
  },
  
  // Footer Configuration
  footer: {
    background: 'bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900',
    text: 'text-white',
    border: 'border-white/10'
  },
  
  // Hero Section Configuration
  hero: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    textColors: {
      primary: 'text-white',
      secondary: 'text-gray-200'
    }
  },
  
  // Modal Configurations
  modals: {
    background: 'bg-gray-900',
    overlay: 'bg-black/70',
    border: 'border-gray-700',
    shadow: 'shadow-2xl',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      accent: 'text-purple-400'
    },
    button: {
      primary: 'bg-purple-600 hover:bg-purple-700 text-white',
      secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
      outline: 'border border-gray-600 hover:bg-gray-700 text-gray-300'
    }
  },
  
  // Dropdown Configurations
  dropdowns: {
    background: 'bg-gray-900',
    border: 'border-gray-700',
    shadow: 'shadow-xl',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      hover: 'hover:bg-gray-800'
    }
  },
  
  // Settings Panel Configuration
  settings: {
    background: 'bg-gray-900',
    border: 'border-gray-700',
    shadow: 'shadow-xl',
    text: {
      primary: 'text-white',
      secondary: 'text-gray-300',
      label: 'text-gray-200'
    },
    input: {
      background: 'bg-gray-800',
      border: 'border-gray-600',
      text: 'text-white',
      focus: 'focus:border-purple-500 focus:ring-purple-500'
    }
  },
  
  // Global Dark Theme Colors
  colors: {
    primary: '#667eea', // Blue-purple
    secondary: '#764ba2', // Purple
    accent: '#f093fb', // Pink
    darkPurple: '#581c87', // Purple-900
    darkIndigo: '#312e81', // Indigo-900
    darkSlate: '#0f172a', // Slate-900
    white: '#ffffff',
    gray200: '#e5e7eb',
    gray800: '#1f2937',
    gray900: '#111827'
  },
  
  // Gradient Definitions
  gradients: {
    hero: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
    features: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #312e81 100%)',
    videos: 'bg-gradient-to-br from-purple-900 to-indigo-900',
    footer: 'bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900'
  },
  
  // Animation and Effects
  effects: {
    cardHover: 'enhanced-hover',
    backdropBlur: 'backdrop-blur-sm',
    glassEffect: 'bg-white/10 backdrop-blur-sm',
    shadows: {
      card: 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)]',
      cardHover: 'hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]',
      active: 'shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]',
      description: 'shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]'
    }
  },
  
  // Text Styling
  typography: {
    headings: {
      large: 'text-5xl md:text-6xl font-bold',
      medium: 'text-4xl font-bold',
      small: 'text-2xl font-bold'
    },
    body: {
      large: 'text-xl',
      medium: 'text-lg',
      small: 'text-base'
    }
  }
};

// Helper function to apply theme to components
export const applyTheme = (theme: 'light' | 'dark', componentType: 'features' | 'videos' | 'footer' | 'hero' | 'modals' | 'dropdowns' | 'settings') => {
  const config = theme === 'light' ? lightThemeConfig : darkThemeConfig;
  return config[componentType];
};

// Helper function to get gradient by name and theme
export const getGradient = (gradientName: keyof typeof darkThemeConfig.gradients, theme: 'light' | 'dark' = 'dark') => {
  const config = theme === 'light' ? lightThemeConfig : darkThemeConfig;
  return config.gradients[gradientName];
};

// Helper function to get color by name and theme
export const getColor = (colorName: keyof typeof darkThemeConfig.colors, theme: 'light' | 'dark' = 'dark') => {
  const config = theme === 'light' ? lightThemeConfig : darkThemeConfig;
  return config.colors[colorName];
};

// Helper function to get modal configuration by theme
export const getModalConfig = (theme: 'light' | 'dark') => {
  return theme === 'light' ? lightThemeConfig.modals : darkThemeConfig.modals;
};

// Helper function to get dropdown configuration by theme
export const getDropdownConfig = (theme: 'light' | 'dark') => {
  return theme === 'light' ? lightThemeConfig.dropdowns : darkThemeConfig.dropdowns;
};

// Helper function to get settings configuration by theme
export const getSettingsConfig = (theme: 'light' | 'dark') => {
  return theme === 'light' ? lightThemeConfig.settings : darkThemeConfig.settings;
}; 