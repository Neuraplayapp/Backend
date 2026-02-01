/**
 * 🌍 LOCATION SETTINGS COMPONENT
 * 
 * Provides UI for users to manage location preferences and permissions
 */

import React, { useState, useEffect } from 'react';
import { locationService, LocationPreferences } from '../services/LocationService';

interface LocationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

const LocationSettings: React.FC<LocationSettingsProps> = ({ 
  isOpen, 
  onClose, 
  isDarkMode = false 
}) => {
  const [preferences, setPreferences] = useState<LocationPreferences | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [defaultLocation, setDefaultLocation] = useState<string>('');

  // Load preferences on mount
  useEffect(() => {
    if (isOpen) {
      const prefs = locationService.getPreferences();
      setPreferences(prefs);
      setDefaultLocation(prefs.defaultLocation || '');
      
      // Show current location if available
      if (prefs.lastKnownLocation?.city) {
        setCurrentLocation(`${prefs.lastKnownLocation.city}${prefs.lastKnownLocation.country ? `, ${prefs.lastKnownLocation.country}` : ''}`);
      }
    }
  }, [isOpen]);

  const handleDetectLocation = async () => {
    setIsDetecting(true);
    try {
      const success = await locationService.requestLocationPermission();
      if (success) {
        const location = await locationService.getLocationForWeather();
        setCurrentLocation(location);
        
        // Refresh preferences
        const updatedPrefs = locationService.getPreferences();
        setPreferences(updatedPrefs);
      } else {
        alert('Location permission was denied. You can still set a default location manually.');
      }
    } catch (error) {
      console.error('Location detection failed:', error);
      alert('Failed to detect location. Please try again or set a default location.');
    } finally {
      setIsDetecting(false);
    }
  };

  const handleToggleAutoDetect = (enabled: boolean) => {
    locationService.setAutoDetect(enabled);
    const updatedPrefs = locationService.getPreferences();
    setPreferences(updatedPrefs);
  };

  const handleSaveDefaultLocation = () => {
    if (defaultLocation.trim()) {
      locationService.setDefaultLocation(defaultLocation.trim());
      const updatedPrefs = locationService.getPreferences();
      setPreferences(updatedPrefs);
      alert(`Default location set to: ${defaultLocation.trim()}`);
    }
  };

  if (!isOpen || !preferences) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`max-w-md w-full mx-4 rounded-xl p-6 ${
        isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'
      }`}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center">
            🌍 Location Settings
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-opacity-80 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            ✕
          </button>
        </div>

        {/* Current Location */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Current Location</h3>
          <div className={`p-3 rounded-lg border ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            {currentLocation ? (
              <div className="flex items-center">
                <span className="text-green-500 mr-2">📍</span>
                <span>{currentLocation}</span>
              </div>
            ) : (
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">📍</span>
                <span className="text-gray-500">Location not detected</span>
              </div>
            )}
          </div>
        </div>

        {/* Auto-Detection Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Auto-detect location</h3>
              <p className="text-xs text-gray-500 mt-1">
                Automatically use your current location for weather
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.autoDetect}
                onChange={(e) => handleToggleAutoDetect(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Permission Status */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Permission Status</h3>
          <div className={`p-3 rounded-lg border ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {preferences.permissions === 'granted' && '✅ Granted'}
                {preferences.permissions === 'denied' && '❌ Denied'}
                {preferences.permissions === 'prompt' && '❓ Not requested'}
                {preferences.permissions === 'unknown' && '❓ Unknown'}
              </span>
              {preferences.permissions !== 'granted' && (
                <button
                  onClick={handleDetectLocation}
                  disabled={isDetecting}
                  className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  {isDetecting ? '🔄 Detecting...' : '📍 Detect'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Default Location */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Default Location</h3>
          <p className="text-xs text-gray-500 mb-3">
            Used when auto-detection is disabled or fails
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={defaultLocation}
              onChange={(e) => setDefaultLocation(e.target.value)}
              placeholder="e.g., New York, London, Tokyo"
              className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
            <button
              onClick={handleSaveDefaultLocation}
              disabled={!defaultLocation.trim()}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
          {preferences.defaultLocation && (
            <p className="text-xs text-green-600 mt-2">
              ✅ Current default: {preferences.defaultLocation}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSettings;
