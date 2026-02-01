// Feature flags for NeuraPlay platform
// Used to enable/disable features for security and maintenance

export interface FeatureFlags {
  // Registration & Sign-up features
  enableRegistration: boolean;
  enableForumRegistration: boolean;
  enableGuestSignup: boolean;
  
  // Maintenance modes
  maintenanceMode: boolean;
  
  // Premium features
  enablePremiumFeatures: boolean;
}

// 🔒 SECURITY: Registration features disabled
export const FEATURE_FLAGS: FeatureFlags = {
  // Registration completely disabled for security
  enableRegistration: false,
  enableForumRegistration: false, 
  enableGuestSignup: false,
  
  // System maintenance
  maintenanceMode: false,
  
  // Premium features
  enablePremiumFeatures: true,
};

// Helper functions
export const isRegistrationEnabled = () => FEATURE_FLAGS.enableRegistration;
export const isForumRegistrationEnabled = () => FEATURE_FLAGS.enableForumRegistration;
export const isGuestSignupEnabled = () => FEATURE_FLAGS.enableGuestSignup;
export const isMaintenanceMode = () => FEATURE_FLAGS.maintenanceMode;
export const arePremiumFeaturesEnabled = () => FEATURE_FLAGS.enablePremiumFeatures;

// Security message for disabled features
export const REGISTRATION_DISABLED_MESSAGE = "Registration is currently disabled for security purposes. Please contact support if you need access.";
