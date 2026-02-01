import React, { createContext, useContext, useState, useEffect } from 'react';
import { applyTheme, getGradient, getColor, getModalConfig, getDropdownConfig, getSettingsConfig } from '../config/themeConfig';

type Theme = 'light' | 'dark' | 'bright' | 'auto' | 'dark-gradient' | 'white-purple-gradient';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  animationsEnabled: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  isDarkMode: boolean;
  isBrightMode: boolean;
  isDarkGradient: boolean;
  isWhitePurpleGradient: boolean;
  // Theme configuration helpers
  getThemeConfig: (componentType: 'features' | 'videos' | 'footer' | 'hero' | 'modals' | 'dropdowns' | 'settings') => any;
  getThemeGradient: (gradientName: string) => string;
  getThemeColor: (colorName: string) => string;
  getModalTheme: () => any;
  getDropdownTheme: () => any;
  getSettingsTheme: () => any;
  // Accessibility features
  fontSize: string;
  setFontSize: (size: string) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  screenReader: boolean;
  setScreenReader: (enabled: boolean) => void;
  keyboardNavigation: boolean;
  setKeyboardNavigation: (enabled: boolean) => void;
  focusIndicators: boolean;
  setFocusIndicators: (enabled: boolean) => void;
  colorBlindMode: string;
  setColorBlindMode: (mode: string) => void;
  textSpacing: string;
  setTextSpacing: (spacing: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Initialize theme from localStorage or default to light
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme;
    return stored || 'light';
  });
  const [animationsEnabled, setAnimationsEnabled] = useState(() => {
    const stored = localStorage.getItem('animationsEnabled');
    return stored !== null ? stored === 'true' : true;
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Accessibility state with localStorage persistence
  const [fontSize, setFontSizeState] = useState(() => {
    return localStorage.getItem('fontSize') || 'medium';
  });
  const [highContrast, setHighContrastState] = useState(() => {
    return localStorage.getItem('highContrast') === 'true';
  });
  const [reducedMotion, setReducedMotionState] = useState(() => {
    return localStorage.getItem('reducedMotion') === 'true';
  });
  const [screenReader, setScreenReaderState] = useState(() => {
    return localStorage.getItem('screenReader') === 'true';
  });
  const [keyboardNavigation, setKeyboardNavigationState] = useState(() => {
    return localStorage.getItem('keyboardNavigation') === 'true';
  });
  const [focusIndicators, setFocusIndicatorsState] = useState(() => {
    return localStorage.getItem('focusIndicators') === 'true';
  });
  const [colorBlindMode, setColorBlindModeState] = useState(() => {
    return localStorage.getItem('colorBlindMode') || 'none';
  });
  const [textSpacing, setTextSpacingState] = useState(() => {
    return localStorage.getItem('textSpacing') || 'normal';
  });

  // Wrapped setters that persist to localStorage
  const setFontSize = (size: string) => {
    setFontSizeState(size);
    localStorage.setItem('fontSize', size);
  };
  const setHighContrast = (enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem('highContrast', String(enabled));
  };
  const setReducedMotion = (enabled: boolean) => {
    setReducedMotionState(enabled);
    localStorage.setItem('reducedMotion', String(enabled));
  };
  const setScreenReader = (enabled: boolean) => {
    setScreenReaderState(enabled);
    localStorage.setItem('screenReader', String(enabled));
  };
  const setKeyboardNavigation = (enabled: boolean) => {
    setKeyboardNavigationState(enabled);
    localStorage.setItem('keyboardNavigation', String(enabled));
  };
  const setFocusIndicators = (enabled: boolean) => {
    setFocusIndicatorsState(enabled);
    localStorage.setItem('focusIndicators', String(enabled));
  };
  const setColorBlindMode = (mode: string) => {
    setColorBlindModeState(mode);
    localStorage.setItem('colorBlindMode', mode);
  };
  const setTextSpacing = (spacing: string) => {
    setTextSpacingState(spacing);
    localStorage.setItem('textSpacing', spacing);
  };
  const setAnimationsEnabledWithPersistence = (enabled: boolean) => {
    setAnimationsEnabled(enabled);
    localStorage.setItem('animationsEnabled', String(enabled));
  };

  // Function to determine if it's dark based on user's timezone
  const isDarkBasedOnTimezone = () => {
    if (typeof window === 'undefined') return false;
    
    const now = new Date();
    const hour = now.getHours();
    // Consider dark mode from 6 PM (18:00) to 6 AM (06:00)
    return hour >= 18 || hour < 6;
  };

  // Determine if we're in dark mode based on theme and timezone/system preference
  const isDarkMode = theme === 'dark' || (theme === 'auto' && isDarkBasedOnTimezone());
  const isBrightMode = theme === 'bright';
  const isDarkGradient = theme === 'dark-gradient';
  const isWhitePurpleGradient = theme === 'white-purple-gradient';

  // Get current theme mode for configuration (light or dark)
  const currentThemeMode = isDarkMode ? 'dark' : 'light';

  // Theme configuration helper functions
  const getThemeConfig = (componentType: 'features' | 'videos' | 'footer' | 'hero' | 'modals' | 'dropdowns' | 'settings') => {
    return applyTheme(currentThemeMode, componentType);
  };

  const getThemeGradient = (gradientName: string) => {
    return getGradient(gradientName as any, currentThemeMode);
  };

  const getThemeColor = (colorName: string) => {
    return getColor(colorName as any, currentThemeMode);
  };

  const getModalTheme = () => {
    return getModalConfig(currentThemeMode);
  };

  const getDropdownTheme = () => {
    return getDropdownConfig(currentThemeMode);
  };

  const getSettingsTheme = () => {
    return getSettingsConfig(currentThemeMode);
  };

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-bright', 'theme-dark-gradient', 'theme-white-purple-gradient');
    
    // Add current theme class
    if (isWhitePurpleGradient) {
      root.classList.add('theme-white-purple-gradient');
      root.setAttribute('data-theme', 'white-purple-gradient');
      root.classList.remove('dark');
    } else if (isDarkGradient) {
      root.classList.add('theme-dark-gradient');
      root.setAttribute('data-theme', 'dark-gradient');
      root.classList.add('dark');
    } else if (isBrightMode) {
      root.classList.add('theme-bright');
      root.setAttribute('data-theme', 'bright');
      root.classList.remove('dark');
    } else if (isDarkMode) {
      root.classList.add('theme-dark');
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.classList.add('theme-light');
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }

    // Mark as initialized after first render
    if (!isInitialized) {
      setIsInitialized(true);
    }

    // Mark as hydrated after theme is applied
    if (!isHydrated) {
      setIsHydrated(true);
    }

    // Apply animation preferences
    if (!animationsEnabled) {
      root.classList.add('no-animations');
    } else {
      root.classList.remove('no-animations');
    }

    // Apply accessibility features
    // Font size
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-extra-large');
    root.classList.add(`font-size-${fontSize}`);

    // High contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Focus indicators
    if (focusIndicators) {
      root.classList.add('focus-indicators');
    } else {
      root.classList.remove('focus-indicators');
    }

    // Keyboard navigation
    if (keyboardNavigation) {
      root.classList.add('keyboard-nav');
    } else {
      root.classList.remove('keyboard-nav');
    }

    // Color blind mode
    root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
    if (colorBlindMode !== 'none') {
      root.classList.add(`colorblind-${colorBlindMode}`);
    }

    // Text spacing
    root.classList.remove('text-spacing-increased', 'text-spacing-extra');
    if (textSpacing !== 'normal') {
      root.classList.add(`text-spacing-${textSpacing}`);
    }
  }, [theme, animationsEnabled, isDarkMode, isBrightMode, isDarkGradient, isWhitePurpleGradient, fontSize, highContrast, reducedMotion, focusIndicators, keyboardNavigation, colorBlindMode, textSpacing]);

  // Listen for time changes when in auto mode to update theme based on timezone
  useEffect(() => {
    if (theme === 'auto') {
      // Check for time changes every minute
      const interval = setInterval(() => {
        // Force re-render to check if time has changed
        setTheme('auto');
      }, 60000); // Check every minute
      
      return () => clearInterval(interval);
    }
  }, [theme]);

  // Listen for AI-driven settings changes (from update_settings tool)
  useEffect(() => {
    const handleSettingsChanged = (event: CustomEvent) => {
      const { setting, value } = event.detail;
      
      console.log('🎨 ThemeContext: Received settingsChanged event:', { setting, value });
      
      // Handle theme changes
      if (setting === 'theme') {
        const themeValue = String(value).toLowerCase();
        
        // Map common theme names to supported themes
        const themeMap: Record<string, Theme> = {
          'dark': 'dark',
          'light': 'light',
          'bright': 'bright',
          'auto': 'auto',
          'dark-gradient': 'dark-gradient',
          'dark gradient': 'dark-gradient',
          'white-purple-gradient': 'white-purple-gradient',
          'white purple gradient': 'white-purple-gradient',
          'purple gradient': 'white-purple-gradient'
        };
        
        const mappedTheme = themeMap[themeValue];
        if (mappedTheme) {
          console.log('🎨 ThemeContext: Applying theme change:', mappedTheme);
          setTheme(mappedTheme);
          localStorage.setItem('theme', mappedTheme);
        } else {
          console.warn('🎨 ThemeContext: Unknown theme value:', value);
        }
      }
      
      // Handle accessibility settings
      if (setting === 'fontSize' || setting === 'font-size' || setting === 'text-size') {
        const sizeMap: Record<string, 'normal' | 'large' | 'larger'> = {
          'normal': 'normal',
          'medium': 'normal',
          'large': 'large',
          'big': 'large',
          'larger': 'larger',
          'extra': 'larger',
          'small': 'normal'  // Fallback to normal for small
        };
        const mappedSize = sizeMap[String(value).toLowerCase()] || 'normal';
        setFontSize(mappedSize);
      }
      
      if (setting === 'highContrast' || setting === 'high-contrast' || setting === 'contrast') {
        setHighContrast(value === true || value === 'true' || value === 'on' || value === 'high');
      }
      
      if (setting === 'reducedMotion' || setting === 'reduced-motion' || setting === 'motion') {
        setReducedMotion(value === true || value === 'true' || value === 'off' || value === 'reduced');
      }
      
      if (setting === 'animations') {
        const enableAnimations = value === true || value === 'true' || value === 'on' || value === 'enabled';
        setAnimationsEnabled(enableAnimations);
      }
    };

    window.addEventListener('settingsChanged', handleSettingsChanged as EventListener);
    
    return () => {
      window.removeEventListener('settingsChanged', handleSettingsChanged as EventListener);
    };
  }, []);

  // Create a wrapped setTheme that also persists to localStorage
  const setThemeWithPersistence = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const value = {
    theme,
    setTheme: setThemeWithPersistence,
    animationsEnabled,
    setAnimationsEnabled: setAnimationsEnabledWithPersistence,
    isDarkMode,
    isBrightMode,
    isDarkGradient,
    isWhitePurpleGradient,
    // Theme configuration helpers
    getThemeConfig,
    getThemeGradient,
    getThemeColor,
    getModalTheme,
    getDropdownTheme,
    getSettingsTheme,
    // Accessibility features
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    screenReader,
    setScreenReader,
    keyboardNavigation,
    setKeyboardNavigation,
    focusIndicators,
    setFocusIndicators,
    colorBlindMode,
    setColorBlindMode,
    textSpacing,
    setTextSpacing,
  };

  // Don't render children until theme is hydrated to prevent flash
  if (!isHydrated) {
    return (
      <ThemeContext.Provider value={value}>
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 