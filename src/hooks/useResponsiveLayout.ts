import { useState, useEffect, useMemo } from 'react';

// ============================================================================
// COMPREHENSIVE DEVICE SPECIFICATIONS
// All major phones, tablets, and foldables with their screen dimensions
// ============================================================================

export interface DeviceSpec {
  name: string;
  category: 'phone' | 'tablet' | 'foldable' | 'desktop';
  brand: 'samsung' | 'apple' | 'google' | 'other';
  // Physical dimensions in CSS pixels (logical pixels)
  portrait: { width: number; height: number };
  landscape: { width: number; height: number };
  // For foldables: unfolded dimensions
  unfolded?: { width: number; height: number };
  devicePixelRatio: number;
  diagonal: number; // Screen size in inches
}

// Comprehensive device database
export const DEVICE_SPECS: Record<string, DeviceSpec> = {
  // ===== SAMSUNG GALAXY S SERIES =====
  'galaxy-s24-ultra': {
    name: 'Samsung Galaxy S24 Ultra',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.8
  },
  'galaxy-s24-plus': {
    name: 'Samsung Galaxy S24+',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'galaxy-s24': {
    name: 'Samsung Galaxy S24',
    category: 'phone', brand: 'samsung',
    portrait: { width: 360, height: 780 },
    landscape: { width: 780, height: 360 },
    devicePixelRatio: 3.0, diagonal: 6.2
  },
  'galaxy-s23-ultra': {
    name: 'Samsung Galaxy S23 Ultra',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.8
  },
  'galaxy-s20-ultra': {
    name: 'Samsung Galaxy S20 Ultra',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.9
  },
  'galaxy-s21-ultra': {
    name: 'Samsung Galaxy S21 Ultra',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.8
  },
  'galaxy-s22-ultra': {
    name: 'Samsung Galaxy S22 Ultra',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.8
  },

  // ===== SAMSUNG GALAXY S25 SERIES (2025) =====
  'galaxy-s25-ultra': {
    name: 'Samsung Galaxy S25 Ultra',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.9
  },
  'galaxy-s25-plus': {
    name: 'Samsung Galaxy S25+',
    category: 'phone', brand: 'samsung',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'galaxy-s25': {
    name: 'Samsung Galaxy S25',
    category: 'phone', brand: 'samsung',
    portrait: { width: 360, height: 780 },
    landscape: { width: 780, height: 360 },
    devicePixelRatio: 3.0, diagonal: 6.2
  },

  // ===== SAMSUNG GALAXY Z FOLD SERIES (FOLDABLES) =====
  'galaxy-z-fold-7': {
    name: 'Samsung Galaxy Z Fold 7',
    category: 'foldable', brand: 'samsung',
    // Cover screen (folded) - 6.2" display, expected specs for 2025
    portrait: { width: 375, height: 832 },
    landscape: { width: 832, height: 375 },
    // Main screen (unfolded) - 7.6" CRITICAL
    unfolded: { width: 900, height: 1120 },
    devicePixelRatio: 3.0, diagonal: 7.6,
    // Cover screen diagonal for reference
  },
  'galaxy-z-fold-6': {
    name: 'Samsung Galaxy Z Fold 6',
    category: 'foldable', brand: 'samsung',
    // Cover screen (folded) - 6.3" Super AMOLED
    portrait: { width: 375, height: 832 },
    landscape: { width: 832, height: 375 },
    // Main screen (unfolded) - 7.6" Dynamic AMOLED 2X
    unfolded: { width: 884, height: 1104 },
    devicePixelRatio: 3.0, diagonal: 7.6
  },
  'galaxy-z-fold-5': {
    name: 'Samsung Galaxy Z Fold 5',
    category: 'foldable', brand: 'samsung',
    // Cover screen (folded) - 6.2" HD+ Dynamic AMOLED 2X
    portrait: { width: 375, height: 832 },
    landscape: { width: 832, height: 375 },
    // Main screen (unfolded) - 7.6" QXGA+ Dynamic AMOLED 2X
    unfolded: { width: 882, height: 1104 },
    devicePixelRatio: 3.0, diagonal: 7.6
  },
  'galaxy-z-fold-4': {
    name: 'Samsung Galaxy Z Fold 4',
    category: 'foldable', brand: 'samsung',
    portrait: { width: 360, height: 816 },
    landscape: { width: 816, height: 360 },
    unfolded: { width: 882, height: 1104 },
    devicePixelRatio: 3.0, diagonal: 7.6
  },
  'galaxy-z-fold-3': {
    name: 'Samsung Galaxy Z Fold 3',
    category: 'foldable', brand: 'samsung',
    portrait: { width: 360, height: 816 },
    landscape: { width: 816, height: 360 },
    unfolded: { width: 882, height: 1104 },
    devicePixelRatio: 3.0, diagonal: 7.6
  },
  'galaxy-z-flip-6': {
    name: 'Samsung Galaxy Z Flip 6',
    category: 'foldable', brand: 'samsung',
    portrait: { width: 412, height: 919 },
    landscape: { width: 919, height: 412 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'galaxy-z-flip-5': {
    name: 'Samsung Galaxy Z Flip 5',
    category: 'foldable', brand: 'samsung',
    portrait: { width: 412, height: 919 },
    landscape: { width: 919, height: 412 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },

  // ===== APPLE IPHONE SERIES =====
  // iPhone 17 Series (2025 - Future-proofing)
  'iphone-17-pro-max': {
    name: 'iPhone 17 Pro Max',
    category: 'phone', brand: 'apple',
    portrait: { width: 440, height: 956 },
    landscape: { width: 956, height: 440 },
    devicePixelRatio: 3.0, diagonal: 6.9
  },
  'iphone-17-pro': {
    name: 'iPhone 17 Pro',
    category: 'phone', brand: 'apple',
    portrait: { width: 402, height: 874 },
    landscape: { width: 874, height: 402 },
    devicePixelRatio: 3.0, diagonal: 6.3
  },
  'iphone-17': {
    name: 'iPhone 17',
    category: 'phone', brand: 'apple',
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    devicePixelRatio: 3.0, diagonal: 6.1
  },
  // iPhone 16 Series (2024)
  'iphone-16-pro-max': {
    name: 'iPhone 16 Pro Max',
    category: 'phone', brand: 'apple',
    portrait: { width: 440, height: 956 },
    landscape: { width: 956, height: 440 },
    devicePixelRatio: 3.0, diagonal: 6.9
  },
  'iphone-16-pro': {
    name: 'iPhone 16 Pro',
    category: 'phone', brand: 'apple',
    portrait: { width: 402, height: 874 },
    landscape: { width: 874, height: 402 },
    devicePixelRatio: 3.0, diagonal: 6.3
  },
  'iphone-16-plus': {
    name: 'iPhone 16 Plus',
    category: 'phone', brand: 'apple',
    portrait: { width: 430, height: 932 },
    landscape: { width: 932, height: 430 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'iphone-16': {
    name: 'iPhone 16',
    category: 'phone', brand: 'apple',
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    devicePixelRatio: 3.0, diagonal: 6.1
  },
  // iPhone 15 Series (2023)
  'iphone-15-pro-max': {
    name: 'iPhone 15 Pro Max',
    category: 'phone', brand: 'apple',
    portrait: { width: 430, height: 932 },
    landscape: { width: 932, height: 430 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'iphone-15-pro': {
    name: 'iPhone 15 Pro',
    category: 'phone', brand: 'apple',
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    devicePixelRatio: 3.0, diagonal: 6.1
  },
  'iphone-15-plus': {
    name: 'iPhone 15 Plus',
    category: 'phone', brand: 'apple',
    portrait: { width: 430, height: 932 },
    landscape: { width: 932, height: 430 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'iphone-15': {
    name: 'iPhone 15',
    category: 'phone', brand: 'apple',
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    devicePixelRatio: 3.0, diagonal: 6.1
  },
  'iphone-14-pro-max': {
    name: 'iPhone 14 Pro Max',
    category: 'phone', brand: 'apple',
    portrait: { width: 430, height: 932 },
    landscape: { width: 932, height: 430 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'iphone-14-pro': {
    name: 'iPhone 14 Pro',
    category: 'phone', brand: 'apple',
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    devicePixelRatio: 3.0, diagonal: 6.1
  },
  'iphone-13-pro-max': {
    name: 'iPhone 13 Pro Max',
    category: 'phone', brand: 'apple',
    portrait: { width: 428, height: 926 },
    landscape: { width: 926, height: 428 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'iphone-12-pro-max': {
    name: 'iPhone 12 Pro Max',
    category: 'phone', brand: 'apple',
    portrait: { width: 428, height: 926 },
    landscape: { width: 926, height: 428 },
    devicePixelRatio: 3.0, diagonal: 6.7
  },
  'iphone-se-3': {
    name: 'iPhone SE (3rd gen)',
    category: 'phone', brand: 'apple',
    portrait: { width: 375, height: 667 },
    landscape: { width: 667, height: 375 },
    devicePixelRatio: 2.0, diagonal: 4.7
  },

  // ===== GOOGLE PIXEL SERIES =====
  'pixel-8-pro': {
    name: 'Google Pixel 8 Pro',
    category: 'phone', brand: 'google',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 3.5, diagonal: 6.7
  },
  'pixel-8': {
    name: 'Google Pixel 8',
    category: 'phone', brand: 'google',
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    devicePixelRatio: 2.625, diagonal: 6.2
  },
  'pixel-fold': {
    name: 'Google Pixel Fold',
    category: 'foldable', brand: 'google',
    portrait: { width: 380, height: 856 },
    landscape: { width: 856, height: 380 },
    unfolded: { width: 884, height: 1076 },
    devicePixelRatio: 2.75, diagonal: 7.6
  },

  // ===== COMPACT PHONES (5.5" - 5.8") =====
  'pixel-4a': {
    name: 'Google Pixel 4a',
    category: 'phone', brand: 'google',
    portrait: { width: 393, height: 851 },
    landscape: { width: 851, height: 393 },
    devicePixelRatio: 2.75, diagonal: 5.8
  },
  'iphone-se-2': {
    name: 'iPhone SE (2nd gen)',
    category: 'phone', brand: 'apple',
    portrait: { width: 375, height: 667 },
    landscape: { width: 667, height: 375 },
    devicePixelRatio: 2.0, diagonal: 4.7
  },
  'galaxy-s10e': {
    name: 'Samsung Galaxy S10e',
    category: 'phone', brand: 'samsung',
    portrait: { width: 360, height: 760 },
    landscape: { width: 760, height: 360 },
    devicePixelRatio: 3.0, diagonal: 5.8
  },

  // ===== SAMSUNG GALAXY TAB SERIES =====
  'galaxy-tab-s9-ultra': {
    name: 'Samsung Galaxy Tab S9 Ultra',
    category: 'tablet', brand: 'samsung',
    portrait: { width: 1848, height: 2960 },
    landscape: { width: 2960, height: 1848 },
    devicePixelRatio: 2.0, diagonal: 14.6
  },
  'galaxy-tab-s9-plus': {
    name: 'Samsung Galaxy Tab S9+',
    category: 'tablet', brand: 'samsung',
    portrait: { width: 1752, height: 2800 },
    landscape: { width: 2800, height: 1752 },
    devicePixelRatio: 2.0, diagonal: 12.4
  },
  'galaxy-tab-s9': {
    name: 'Samsung Galaxy Tab S9',
    category: 'tablet', brand: 'samsung',
    portrait: { width: 1600, height: 2560 },
    landscape: { width: 2560, height: 1600 },
    devicePixelRatio: 2.0, diagonal: 11.0
  },
  'galaxy-tab-s8-ultra': {
    name: 'Samsung Galaxy Tab S8 Ultra',
    category: 'tablet', brand: 'samsung',
    portrait: { width: 1848, height: 2960 },
    landscape: { width: 2960, height: 1848 },
    devicePixelRatio: 2.0, diagonal: 14.6
  },
  'galaxy-tab-a8': {
    name: 'Samsung Galaxy Tab A8',
    category: 'tablet', brand: 'samsung',
    portrait: { width: 800, height: 1340 },
    landscape: { width: 1340, height: 800 },
    devicePixelRatio: 1.5, diagonal: 10.5
  },
  'galaxy-tab-s7': {
    name: 'Samsung Galaxy Tab S7',
    category: 'tablet', brand: 'samsung',
    portrait: { width: 1600, height: 2560 },
    landscape: { width: 2560, height: 1600 },
    devicePixelRatio: 2.0, diagonal: 11.0
  },

  // ===== MINI TABLETS (7.0" - 7.9") =====
  'amazon-fire-7': {
    name: 'Amazon Fire 7',
    category: 'tablet', brand: 'other',
    portrait: { width: 600, height: 1024 },
    landscape: { width: 1024, height: 600 },
    devicePixelRatio: 1.0, diagonal: 7.0
  },
  'amazon-fire-hd-8': {
    name: 'Amazon Fire HD 8',
    category: 'tablet', brand: 'other',
    portrait: { width: 800, height: 1280 },
    landscape: { width: 1280, height: 800 },
    devicePixelRatio: 1.5, diagonal: 8.0
  },

  // ===== MICROSOFT SURFACE SERIES =====
  'surface-pro-9': {
    name: 'Microsoft Surface Pro 9',
    category: 'tablet', brand: 'other',
    portrait: { width: 1920, height: 2880 },
    landscape: { width: 2880, height: 1920 },
    devicePixelRatio: 2.0, diagonal: 13.0
  },
  'surface-go-3': {
    name: 'Microsoft Surface Go 3',
    category: 'tablet', brand: 'other',
    portrait: { width: 1800, height: 1200 },
    landscape: { width: 1200, height: 1800 },
    devicePixelRatio: 1.5, diagonal: 10.5
  },

  // ===== APPLE IPAD SERIES =====
  'ipad-pro-13': {
    name: 'iPad Pro 12.9" (M4)',
    category: 'tablet', brand: 'apple',
    portrait: { width: 1024, height: 1366 },
    landscape: { width: 1366, height: 1024 },
    devicePixelRatio: 2.0, diagonal: 12.9
  },
  'ipad-pro-11': {
    name: 'iPad Pro 11" (M4)',
    category: 'tablet', brand: 'apple',
    portrait: { width: 834, height: 1194 },
    landscape: { width: 1194, height: 834 },
    devicePixelRatio: 2.0, diagonal: 11.0
  },
  'ipad-air-13': {
    name: 'iPad Air 13" (M2)',
    category: 'tablet', brand: 'apple',
    portrait: { width: 1024, height: 1366 },
    landscape: { width: 1366, height: 1024 },
    devicePixelRatio: 2.0, diagonal: 13.0
  },
  'ipad-air-11': {
    name: 'iPad Air 11" (M2)',
    category: 'tablet', brand: 'apple',
    portrait: { width: 820, height: 1180 },
    landscape: { width: 1180, height: 820 },
    devicePixelRatio: 2.0, diagonal: 10.9
  },
  'ipad-10': {
    name: 'iPad (10th gen)',
    category: 'tablet', brand: 'apple',
    portrait: { width: 820, height: 1180 },
    landscape: { width: 1180, height: 820 },
    devicePixelRatio: 2.0, diagonal: 10.9
  },
  'ipad-mini-6': {
    name: 'iPad mini (6th gen)',
    category: 'tablet', brand: 'apple',
    portrait: { width: 744, height: 1133 },
    landscape: { width: 1133, height: 744 },
    devicePixelRatio: 2.0, diagonal: 8.3
  },
};

// ============================================================================
// ENHANCED BREAKPOINT SYSTEM
// ============================================================================

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isFoldable: boolean;
  isFolded: boolean;
  orientation: 'portrait' | 'landscape';
  devicePixelRatio: number;
  detectedDevice: DeviceSpec | null;
  // Granular device categories covering all screen sizes
  deviceCategory: 
    | 'compact-phone'      // 5.5"-5.8" (iPhone SE, Pixel 4a)
    | 'phone'              // 6.0"-6.3" (Z Fold cover 6.2", iPhone 13)
    | 'large-phone'        // 6.4"-6.7" (iPhone Pro Max, Galaxy Ultra)
    | 'phablet'            // 6.8"-7.0" (extra large phones)
    | 'foldable-folded'    // Z Fold in folded state
    | 'foldable-unfolded'  // 7.0"-7.9" (Z Fold unfolded 7.6")
    | 'mini-tablet'        // 8.0"-8.4" (Fire HD 8, compact tablets)
    | 'small-tablet'       // 9.7"-10.5" (iPad 10.2", Galaxy Tab S7)
    | 'tablet'             // 11"-12.4" (iPad Pro 11", Galaxy Tab S9+)
    | 'large-tablet'       // 13"-14" (Surface Pro 9, iPad Pro 12.9")
    | 'desktop';           // Desktop+
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
  // Additional helpers
  screenSizeRange: '5.5-5.8' | '6.0-6.3' | '6.4-6.7' | '6.8-7.0' | '7.0-7.9' | '8.0-8.4' | '9.7-10.5' | '11-12.4' | '13-14' | 'desktop';
}

export interface ResponsiveConfig {
  breakpoints: {
    // ===== PHONE BREAKPOINTS =====
    compactPhone: number;     // < 360px (5.5"-5.8": iPhone SE 2, Pixel 4a, Galaxy S10e)
    phone: number;            // 360-393px (6.0"-6.3": Z Fold cover screen, iPhone 13, Galaxy S22)
    largePhone: number;       // 393-430px (6.4"-6.7": iPhone 14 Pro Max, Galaxy S23 Ultra)
    phablet: number;          // 430-600px (6.8"-7.0": Extra large phones)
    // ===== TABLET/FOLDABLE BREAKPOINTS =====
    foldableUnfolded: number; // 600-800px (7.0"-7.9": Z Fold unfolded 7.6", Fire 7, iPad mini)
    miniTablet: number;       // 800-1024px (8.0"-8.4": Fire HD 8, compact tablets)
    smallTablet: number;      // 1024-1200px (9.7"-10.5": iPad 10.2", Galaxy Tab S7)
    tablet: number;           // 1200-1440px (11"-12.4": iPad Pro 11", Galaxy Tab S9+)
    largeTablet: number;      // 1440-1920px (13"-14": Surface Pro 9, iPad Pro 12.9")
    desktop: number;          // 1920px+ (desktop)
  };
  touchTarget: {
    minSize: number;
    recommendedSize: number;
  };
  spacing: {
    compact: { xs: string; sm: string; md: string; lg: string; xl: string };
    normal: { xs: string; sm: string; md: string; lg: string; xl: string };
    expanded: { xs: string; sm: string; md: string; lg: string; xl: string };
  };
}

const defaultConfig: ResponsiveConfig = {
  breakpoints: {
    // ===== PHONE BREAKPOINTS =====
    compactPhone: 360,      // 5.5"-5.8" compact phones
    phone: 393,             // 6.0"-6.3" standard phones + Z Fold cover (6.2")
    largePhone: 430,        // 6.4"-6.7" large flagship phones
    phablet: 600,           // 6.8"-7.0" extra large phones
    // ===== TABLET/FOLDABLE BREAKPOINTS =====
    foldableUnfolded: 800,  // 7.0"-7.9" foldables unfolded (Z Fold 7.6"), mini tablets
    miniTablet: 1024,       // 8.0"-8.4" compact productivity tablets
    smallTablet: 1200,      // 9.7"-10.5" standard tablets
    tablet: 1440,           // 11"-12.4" large creative tablets
    largeTablet: 1920,      // 13"-14" laptop-replacement tablets
    desktop: 2560           // Desktop+
  },
  touchTarget: {
    minSize: 44,
    recommendedSize: 48
  },
  spacing: {
    compact: {
      xs: '0.125rem',  // 2px
      sm: '0.25rem',   // 4px
      md: '0.5rem',    // 8px
      lg: '0.75rem',   // 12px
      xl: '1rem'       // 16px
    },
    normal: {
      xs: '0.25rem',   // 4px
      sm: '0.5rem',    // 8px
      md: '0.75rem',   // 12px
      lg: '1rem',      // 16px
      xl: '1.5rem'     // 24px
    },
    expanded: {
      xs: '0.5rem',    // 8px
      sm: '0.75rem',   // 12px
      md: '1rem',      // 16px
      lg: '1.5rem',    // 24px
      xl: '2rem'       // 32px
    }
  }
};

// Detect device from user agent and screen dimensions
// Covers all device sizes from 5.5" to 14" and foldables
function detectDevice(width: number, height: number, dpr: number): DeviceSpec | null {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
  
  // ===== SAMSUNG Z FOLD SERIES =====
  // Z Fold 7: sm-f958, Z Fold 6: sm-f956, Z Fold 5: sm-f946, Z Fold 4: sm-f936
  if (ua.includes('sm-f958') || ua.includes('sm-f956') || ua.includes('sm-f946') || ua.includes('sm-f936') || ua.includes('fold')) {
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    // Unfolded: ~882-900px width, aspect ratio close to 1.25
    // Folded (cover screen 6.2"): ~375px width, aspect ratio ~2.2
    if (aspectRatio < 1.4 || width > 700) {
      // Detect specific fold generation
      if (ua.includes('sm-f958')) return { ...DEVICE_SPECS['galaxy-z-fold-7'], name: 'Z Fold 7 (Unfolded)' };
      if (ua.includes('sm-f956')) return { ...DEVICE_SPECS['galaxy-z-fold-6'], name: 'Z Fold 6 (Unfolded)' };
      return { ...DEVICE_SPECS['galaxy-z-fold-5'], name: 'Z Fold (Unfolded)' };
    }
    // Cover screen 6.2"
    if (ua.includes('sm-f958')) return DEVICE_SPECS['galaxy-z-fold-7'];
    if (ua.includes('sm-f956')) return DEVICE_SPECS['galaxy-z-fold-6'];
    return DEVICE_SPECS['galaxy-z-fold-5'];
  }
  
  // ===== SAMSUNG Z FLIP SERIES =====
  if (ua.includes('sm-f741') || ua.includes('sm-f731') || ua.includes('flip')) {
    if (ua.includes('sm-f741')) return DEVICE_SPECS['galaxy-z-flip-6'];
    return DEVICE_SPECS['galaxy-z-flip-5'];
  }
  
  // ===== SAMSUNG GALAXY S SERIES =====
  if (ua.includes('sm-s928') || ua.includes('s25 ultra')) return DEVICE_SPECS['galaxy-s25-ultra'];
  if (ua.includes('sm-s918') || ua.includes('s24 ultra')) return DEVICE_SPECS['galaxy-s24-ultra'];
  if (ua.includes('sm-s908') || ua.includes('s23 ultra')) return DEVICE_SPECS['galaxy-s23-ultra'];
  if (ua.includes('sm-g998') || ua.includes('s21 ultra')) return DEVICE_SPECS['galaxy-s21-ultra'];
  if (ua.includes('sm-g988') || ua.includes('s20 ultra')) return DEVICE_SPECS['galaxy-s20-ultra'];
  
  // ===== APPLE IPHONE SERIES =====
  if (ua.includes('iphone')) {
    // iPhone 16/17 Pro Max (6.9"): ~440px width
    if (width >= 435 || height >= 950) return DEVICE_SPECS['iphone-16-pro-max'];
    // iPhone 15/16 Pro Max (6.7"): ~430px width  
    if (width >= 428 || height >= 926) return DEVICE_SPECS['iphone-15-pro-max'];
    // iPhone 16 Pro (6.3"): ~402px width
    if (width >= 400) return DEVICE_SPECS['iphone-16-pro'];
    // iPhone 15 Pro / 16 (6.1"): ~393px width
    if (width >= 390) return DEVICE_SPECS['iphone-15-pro'];
    // iPhone SE: ~375px width
    return DEVICE_SPECS['iphone-se-3'];
  }
  
  // ===== APPLE IPAD SERIES =====
  if (ua.includes('ipad')) {
    if (width >= 1024 || height >= 1366) return DEVICE_SPECS['ipad-pro-13'];
    if (width >= 834) return DEVICE_SPECS['ipad-pro-11'];
    if (width >= 744) return DEVICE_SPECS['ipad-mini-6'];
    return DEVICE_SPECS['ipad-10'];
  }
  
  // ===== GOOGLE PIXEL SERIES =====
  if (ua.includes('pixel fold')) return DEVICE_SPECS['pixel-fold'];
  if (ua.includes('pixel 8 pro') || ua.includes('pixel 9 pro')) return DEVICE_SPECS['pixel-8-pro'];
  if (ua.includes('pixel 4a')) return DEVICE_SPECS['pixel-4a'];
  if (ua.includes('pixel')) return DEVICE_SPECS['pixel-8'];
  
  // ===== SAMSUNG TABLETS =====
  if (ua.includes('sm-x910') || ua.includes('tab s9 ultra')) return DEVICE_SPECS['galaxy-tab-s9-ultra'];
  if (ua.includes('sm-x810') || ua.includes('tab s9+') || ua.includes('tab s9 plus')) return DEVICE_SPECS['galaxy-tab-s9-plus'];
  if (ua.includes('sm-x710') || ua.includes('tab s9')) return DEVICE_SPECS['galaxy-tab-s9'];
  if (ua.includes('tab a8')) return DEVICE_SPECS['galaxy-tab-a8'];
  
  // ===== AMAZON FIRE TABLETS =====
  if (ua.includes('kfmuwi') || ua.includes('fire 7')) return DEVICE_SPECS['amazon-fire-7'];
  if (ua.includes('kfonwi') || ua.includes('fire hd 8')) return DEVICE_SPECS['amazon-fire-hd-8'];
  
  // ===== MICROSOFT SURFACE =====
  if (ua.includes('surface pro')) return DEVICE_SPECS['surface-pro-9'];
  if (ua.includes('surface go')) return DEVICE_SPECS['surface-go-3'];
  
  // ===== DIMENSION-BASED MATCHING (fallback) =====
  for (const spec of Object.values(DEVICE_SPECS)) {
    const matchPortrait = Math.abs(spec.portrait.width - width) < 20 && Math.abs(spec.portrait.height - height) < 50;
    const matchLandscape = Math.abs(spec.landscape.width - width) < 20 && Math.abs(spec.landscape.height - height) < 50;
    const matchUnfolded = spec.unfolded && Math.abs(spec.unfolded.width - width) < 50;
    
    if (matchPortrait || matchLandscape || matchUnfolded) {
      return spec;
    }
  }
  
  return null;
}

// Determine device category based on dimensions
// Covers all screen sizes from 5.5" compact phones to desktop
function getDeviceCategory(
  width: number, 
  height: number, 
  breakpoints: ResponsiveConfig['breakpoints'],
  detectedDevice: DeviceSpec | null
): ViewportInfo['deviceCategory'] {
  // Check for foldables first - use aspect ratio + width to detect unfolded state
  if (detectedDevice?.category === 'foldable') {
    // If aspect ratio is close to square (< 1.4) or width > 700px, it's likely unfolded
    // Z Fold 5/6/7 unfolded: ~882-900px width with ~1.25 aspect ratio
    const aspectRatio = Math.max(width, height) / Math.min(width, height);
    if (aspectRatio < 1.4 || width > 700) {
      return 'foldable-unfolded';
    }
    // Z Fold cover screen: ~375px width, 6.2" display
    return 'foldable-folded';
  }
  
  // ===== PHONE CATEGORIES (5.5" - 7.0") =====
  if (width < breakpoints.compactPhone) return 'compact-phone';   // 5.5"-5.8"
  if (width < breakpoints.phone) return 'phone';                   // 6.0"-6.3" (includes Z Fold cover 6.2")
  if (width < breakpoints.largePhone) return 'large-phone';        // 6.4"-6.7"
  if (width < breakpoints.phablet) return 'phablet';               // 6.8"-7.0"
  
  // ===== TABLET/FOLDABLE CATEGORIES (7.0" - 14") =====
  if (width < breakpoints.foldableUnfolded) return 'foldable-unfolded';  // 7.0"-7.9" (Z Fold unfolded 7.6")
  if (width < breakpoints.miniTablet) return 'mini-tablet';              // 8.0"-8.4"
  if (width < breakpoints.smallTablet) return 'small-tablet';            // 9.7"-10.5"
  if (width < breakpoints.tablet) return 'tablet';                       // 11"-12.4"
  if (width < breakpoints.largeTablet) return 'large-tablet';            // 13"-14"
  
  return 'desktop';
}

// Get screen size range description for the given category
function getScreenSizeRange(category: ViewportInfo['deviceCategory']): ViewportInfo['screenSizeRange'] {
  switch (category) {
    case 'compact-phone': return '5.5-5.8';
    case 'phone':
    case 'foldable-folded': return '6.0-6.3';
    case 'large-phone': return '6.4-6.7';
    case 'phablet': return '6.8-7.0';
    case 'foldable-unfolded': return '7.0-7.9';
    case 'mini-tablet': return '8.0-8.4';
    case 'small-tablet': return '9.7-10.5';
    case 'tablet': return '11-12.4';
    case 'large-tablet': return '13-14';
    case 'desktop': return 'desktop';
    default: return 'desktop';
  }
}

// Get safe area insets for notched devices
function getSafeAreaInsets(): ViewportInfo['safeAreaInsets'] {
  if (typeof window === 'undefined' || !window.getComputedStyle) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || style.getPropertyValue('env(safe-area-inset-top)') || '0', 10) || 0,
    bottom: parseInt(style.getPropertyValue('--sab') || style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10) || 0,
    left: parseInt(style.getPropertyValue('--sal') || style.getPropertyValue('env(safe-area-inset-left)') || '0', 10) || 0,
    right: parseInt(style.getPropertyValue('--sar') || style.getPropertyValue('env(safe-area-inset-right)') || '0', 10) || 0,
  };
}

export function useResponsiveLayout(config: Partial<ResponsiveConfig> = {}): ViewportInfo & {
  getSpacing: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') => string;
  getTouchTargetSize: (type: 'min' | 'recommended') => number;
  isCompactMode: boolean;
  shouldUseSidebar: boolean;
  canUseSplitScreen: boolean;
  // New helpers for specific device handling
  isFoldableDevice: boolean;
  isUnfoldedMode: boolean;
  getOptimalColumns: () => number;
  getChatWidth: () => string;
  getCanvasWidth: () => string;
} {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);

  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1200,
        height: 800,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        isFoldable: false,
        isFolded: false,
        orientation: 'landscape' as const,
        devicePixelRatio: 1,
        detectedDevice: null,
        deviceCategory: 'desktop' as const,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        screenSizeRange: 'desktop' as const
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const detectedDevice = detectDevice(width, height, dpr);
    const deviceCategory = getDeviceCategory(width, height, mergedConfig.breakpoints, detectedDevice);
    const isFoldable = detectedDevice?.category === 'foldable' || deviceCategory.includes('foldable');
    
    // More accurate mobile/tablet detection:
    // - Mobile: All phones AND foldables (even unfolded - still a mobile device!)
    // - Tablet: Traditional tablets only (NOT foldables - they're phones that unfold)
    // - Desktop: Large tablets and actual desktop
    // CRITICAL: Z Fold unfolded (7.6") is still a MOBILE device, just with more screen space
    const isMobileDevice = ['compact-phone', 'phone', 'large-phone', 'phablet', 'foldable-folded', 'foldable-unfolded'].includes(deviceCategory);
    const isTabletDevice = ['mini-tablet', 'small-tablet', 'tablet'].includes(deviceCategory);
    const isDesktopDevice = ['large-tablet', 'desktop'].includes(deviceCategory);
    
    return {
      width,
      height,
      isMobile: isMobileDevice,
      isTablet: isTabletDevice,
      isDesktop: isDesktopDevice,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isFoldable,
      isFolded: isFoldable && deviceCategory === 'foldable-folded',
      orientation: width > height ? 'landscape' : 'portrait',
      devicePixelRatio: dpr,
      detectedDevice,
      deviceCategory,
      safeAreaInsets: getSafeAreaInsets(),
      screenSizeRange: getScreenSizeRange(deviceCategory)
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const detectedDevice = detectDevice(width, height, dpr);
      const deviceCategory = getDeviceCategory(width, height, mergedConfig.breakpoints, detectedDevice);
      const isFoldable = detectedDevice?.category === 'foldable' || deviceCategory.includes('foldable');
      
      // More accurate mobile/tablet detection based on device category
      // CRITICAL: Foldables (even unfolded) are MOBILE devices - they're phones that unfold
      const isMobileDevice = ['compact-phone', 'phone', 'large-phone', 'phablet', 'foldable-folded', 'foldable-unfolded'].includes(deviceCategory);
      const isTabletDevice = ['mini-tablet', 'small-tablet', 'tablet'].includes(deviceCategory);
      const isDesktopDevice = ['large-tablet', 'desktop'].includes(deviceCategory);
      
      setViewport({
        width,
        height,
        isMobile: isMobileDevice,
        isTablet: isTabletDevice,
        isDesktop: isDesktopDevice,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isFoldable,
        isFolded: isFoldable && deviceCategory === 'foldable-folded',
        orientation: width > height ? 'landscape' : 'portrait',
        devicePixelRatio: dpr,
        detectedDevice,
        deviceCategory,
        safeAreaInsets: getSafeAreaInsets(),
        screenSizeRange: getScreenSizeRange(deviceCategory)
      });
    };

    // Use a faster debounce for foldables (they need quick response to fold/unfold)
    let timeoutId: NodeJS.Timeout;
    const isFoldable = viewport.isFoldable;
    const debounceTime = isFoldable ? 50 : 150;
    
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateViewport, debounceTime);
    };

    // Immediate update for orientation change
    const handleOrientationChange = () => {
      // Small delay to let the browser finish rotation
      setTimeout(updateViewport, 100);
    };

    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Listen for fold state changes (Samsung/Chrome feature)
    if ('screen' in window && 'addEventListener' in (window.screen as any)) {
      try {
        (window.screen as any).addEventListener?.('change', updateViewport);
      } catch (e) {
        // Not supported
      }
    }

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      clearTimeout(timeoutId);
    };
  }, [mergedConfig.breakpoints, viewport.isFoldable]);

  // Spacing based on device category
  const getSpacing = (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl'): string => {
    if (viewport.deviceCategory === 'compact-phone' || viewport.deviceCategory === 'foldable-folded') {
      return mergedConfig.spacing.compact[size];
    }
    if (viewport.isDesktop || viewport.deviceCategory === 'large-tablet') {
      return mergedConfig.spacing.expanded[size];
    }
    return mergedConfig.spacing.normal[size];
  };

  const getTouchTargetSize = (type: 'min' | 'recommended'): number => {
    return type === 'min' ? mergedConfig.touchTarget.minSize : mergedConfig.touchTarget.recommendedSize;
  };

  // Derived responsive states
  const isCompactMode = viewport.isMobile || 
    viewport.deviceCategory === 'compact-phone' || 
    viewport.deviceCategory === 'foldable-folded' ||
    viewport.width < 600;
    
  const shouldUseSidebar = viewport.width >= 500 && !viewport.isFolded;
  
  const canUseSplitScreen = (
    viewport.width >= 700 && 
    (viewport.orientation === 'landscape' || viewport.deviceCategory === 'foldable-unfolded')
  ) || viewport.width >= 1024;

  // New helpers
  const isFoldableDevice = viewport.isFoldable;
  const isUnfoldedMode = viewport.deviceCategory === 'foldable-unfolded';
  
  // Get optimal number of columns for grid layouts
  const getOptimalColumns = (): number => {
    switch (viewport.deviceCategory) {
      case 'compact-phone':
      case 'foldable-folded':
        return 1;
      case 'phone':
      case 'phablet':
        return 2;
      case 'foldable-unfolded':
      case 'small-tablet':
        return 3;
      case 'tablet':
        return 4;
      case 'large-tablet':
      case 'desktop':
        return 6;
      default:
        return 2;
    }
  };
  
  // Get optimal chat panel width
  const getChatWidth = (): string => {
    switch (viewport.deviceCategory) {
      case 'compact-phone':
      case 'phone':
      case 'foldable-folded':
        return '100%';
      case 'phablet':
        return '100%';
      case 'foldable-unfolded':
        return '45%'; // Optimized for side-by-side on unfolded
      case 'small-tablet':
        return '50%';
      case 'tablet':
        return '45%';
      case 'large-tablet':
        return '40%';
      case 'desktop':
        return '35%';
      default:
        return '50%';
    }
  };
  
  // Get optimal canvas width
  const getCanvasWidth = (): string => {
    switch (viewport.deviceCategory) {
      case 'compact-phone':
      case 'phone':
      case 'foldable-folded':
        return '100%';
      case 'phablet':
        return '100%';
      case 'foldable-unfolded':
        return '55%'; // More space for canvas on unfolded
      case 'small-tablet':
        return '50%';
      case 'tablet':
        return '55%';
      case 'large-tablet':
        return '60%';
      case 'desktop':
        return '65%';
      default:
        return '50%';
    }
  };

  return {
    ...viewport,
    getSpacing,
    getTouchTargetSize,
    isCompactMode,
    shouldUseSidebar,
    canUseSplitScreen,
    isFoldableDevice,
    isUnfoldedMode,
    getOptimalColumns,
    getChatWidth,
    getCanvasWidth
  };
}

export default useResponsiveLayout;
