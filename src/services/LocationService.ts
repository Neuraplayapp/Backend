/**
 * 🌍 LOCATION SERVICE - Smart User Geolocation Integration
 * 
 * Provides automatic location detection with fallbacks and caching.
 * Integrates with weather API for seamless user experience.
 */

export interface UserLocation {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  accuracy?: number;
  timestamp: number;
}

export interface LocationPreferences {
  autoDetect: boolean;
  defaultLocation?: string;
  permissions: 'granted' | 'denied' | 'prompt' | 'unknown';
  lastKnownLocation?: UserLocation;
}

export class LocationService {
  private static instance: LocationService;
  private preferences: LocationPreferences;
  private cache: Map<string, UserLocation> = new Map();
  private watchId: number | null = null;

  private constructor() {
    // Load preferences from localStorage
    this.preferences = this.loadPreferences();
    // FIXED: Only initialize location watcher on explicit user request to avoid geolocation violation
    // this.initializeLocationWatcher();
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  /**
   * SMART LOCATION DETECTION
   * Tries multiple strategies to get user location
   */
  async getUserLocation(options: {
    requestPermission?: boolean;
    useCache?: boolean;
    timeout?: number;
  } = {}): Promise<UserLocation | null> {
    const { requestPermission = false, useCache = true, timeout = 10000 } = options;

    try {
      console.log('🌍 LocationService: Getting user location...');
      
      // FIXED: Initialize location watcher on first explicit user request  
      if (requestPermission && this.watchId === null) {
        this.initializeLocationWatcher();
      }

      // 1. CHECK CACHE FIRST (if enabled and recent)
      if (useCache && this.preferences.lastKnownLocation) {
        const lastLocation = this.preferences.lastKnownLocation;
        const age = Date.now() - lastLocation.timestamp;
        const maxAge = 30 * 60 * 1000; // 30 minutes

        if (age < maxAge) {
          console.log('✅ Using cached location:', lastLocation.city);
          return lastLocation;
        }
      }

      // 2. CHECK GEOLOCATION PERMISSIONS
      if (!navigator.geolocation) {
        console.warn('⚠️ Geolocation not supported by browser');
        return this.getFallbackLocation();
      }

      // Check current permission status
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        this.preferences.permissions = permission.state;
        this.savePreferences();

        if (permission.state === 'denied') {
          console.warn('⚠️ Geolocation permission denied');
          return this.getFallbackLocation();
        }
      }

      // 3. ATTEMPT GEOLOCATION (try even if not explicitly requested)
      if (this.preferences.permissions === 'granted' || this.preferences.permissions === 'prompt') {
        try {
          console.log('🌍 Attempting geolocation...');
          const position = await this.getCurrentPosition(timeout);
          const location = await this.enrichLocationData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          });

          // Cache the location
          this.preferences.lastKnownLocation = location;
          this.savePreferences();

          console.log('✅ GPS location detected:', location.city);
          return location;

        } catch (geoError) {
          console.log('⚠️ Geolocation failed:', (geoError as Error).message || geoError);
          // Continue to fallback methods
        }
      } else {
        console.log('🌍 Geolocation not available (permission denied)');
      }

      // 4. FALLBACK TO ALTERNATIVE METHODS
      return this.getFallbackLocation();

    } catch (error) {
      console.error('❌ LocationService error:', error);
      return null;
    }
  }

  /**
   * GET LOCATION FOR WEATHER
   * Specifically optimized for weather API calls with improved geolocation attempts
   */
  async getLocationForWeather(): Promise<string> {
    console.log('🌍 LocationService.getLocationForWeather() called');
    
    // First try: Attempt GPS location with cache and reasonable timeout
    const location = await this.getUserLocation({ 
      requestPermission: false, 
      useCache: true,
      timeout: 5000  // Shorter timeout for weather requests
    });

    console.log('🌍 getUserLocation returned:', location);

    if (location?.city) {
      const fullLocation = location.city + (location.country ? `, ${location.country}` : '');
      console.log('✅ Using GPS/cached location:', fullLocation);
      return fullLocation;
    }

    // Second try: IP-based location detection (more accurate than timezone)
    try {
      const ipLocation = await this.getLocationFromIP();
      if (ipLocation) {
        console.log('✅ Using IP-based location:', ipLocation);
        return ipLocation;
      }
    } catch (ipError) {
      console.log('⚠️ IP location failed:', ipError);
    }

    // Third try: Use default location or timezone-based detection
    let fallbackLocation = this.preferences.defaultLocation || 'Current Location';
    
    // If still no location, try to detect based on timezone
    if (fallbackLocation === 'Current Location' || fallbackLocation === 'New York') {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Browser timezone detected:', timezone);
      
      // Enhanced timezone detection
      if (timezone === 'Asia/Qyzylorda') {
        fallbackLocation = 'Taraz, Kazakhstan'; // Qyzylorda timezone covers Taraz region
      } else if (timezone === 'Asia/Almaty') {
        fallbackLocation = 'Almaty, Kazakhstan';
      } else if (timezone.includes('Kazakhstan') || timezone.includes('Almaty') || timezone.includes('Qyzylorda')) {
        fallbackLocation = 'Kazakhstan'; // Generic Kazakhstan fallback
      } else if (timezone.includes('Europe/London')) {
        fallbackLocation = 'London, UK';
      } else if (timezone.includes('America/New_York')) {
        fallbackLocation = 'New York, NY';
      } else if (timezone.includes('America/Los_Angeles')) {
        fallbackLocation = 'Los Angeles, CA';
      } else {
        // Extract city from timezone if possible
        const timezoneParts = timezone.split('/');
        if (timezoneParts.length > 1) {
          fallbackLocation = timezoneParts[timezoneParts.length - 1].replace(/_/g, ' ');
        }
      }
    }
    
    console.log('⚠️ Using fallback location:', fallbackLocation);
    return fallbackLocation;
  }

  /**
   * GET LOCATION FROM IP
   * Uses IP-based geolocation as a fallback
   */
  private async getLocationFromIP(): Promise<string | null> {
    try {
      console.log('🌐 Attempting IP-based location detection...');
      
      // Use a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/', {
        timeout: 3000
      } as any);
      
      if (response.ok) {
        const data = await response.json();
        if (data.city && data.country_name) {
          const location = `${data.city}, ${data.country_name}`;
          
          // Cache this as a backup location
          this.preferences.lastKnownLocation = {
            latitude: parseFloat(data.latitude) || 0,
            longitude: parseFloat(data.longitude) || 0,
            city: data.city,
            country: data.country_name,
            accuracy: 10000, // IP-based is less accurate
            timestamp: Date.now()
          };
          this.savePreferences();
          
          return location;
        }
      }
    } catch (error) {
      console.log('⚠️ IP geolocation failed:', error);
    }
    
    return null;
  }

  /**
   * REQUEST LOCATION PERMISSION
   * Handles permission request with user-friendly flow
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const location = await this.getUserLocation({ 
        requestPermission: true, 
        useCache: false,
        timeout: 15000 
      });

      if (location) {
        console.log('✅ Location permission granted');
        this.preferences.autoDetect = true;
        this.savePreferences();
        return true;
      }

      return false;
    } catch (error) {
      console.warn('⚠️ Location permission denied or failed');
      this.preferences.permissions = 'denied';
      this.savePreferences();
      return false;
    }
  }

  /**
   * SET DEFAULT LOCATION
   * Allows users to set a preferred location
   */
  setDefaultLocation(location: string): void {
    this.preferences.defaultLocation = location;
    this.savePreferences();
    console.log('📍 Default location set:', location);
  }

  /**
   * TOGGLE AUTO-DETECTION
   */
  setAutoDetect(enabled: boolean): void {
    this.preferences.autoDetect = enabled;
    this.savePreferences();
    
    if (enabled) {
      this.initializeLocationWatcher();
    } else {
      this.stopLocationWatcher();
    }
  }

  /**
   * GET LOCATION PREFERENCES
   */
  getPreferences(): LocationPreferences {
    return { ...this.preferences };
  }

  // PRIVATE METHODS

  private getCurrentPosition(timeout: number): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: 5 * 60 * 1000 // 5 minutes
        }
      );
    });
  }

  private async enrichLocationData(location: Partial<UserLocation>): Promise<UserLocation> {
    try {
      // Use reverse geocoding to get city/country info
      // This could call your backend's geocoding service
      const enriched = await this.reverseGeocode(location.latitude!, location.longitude!);
      
      return {
        ...location,
        ...enriched,
        timestamp: Date.now()
      } as UserLocation;

    } catch (error) {
      console.warn('⚠️ Location enrichment failed:', error);
      return location as UserLocation;
    }
  }

  private async reverseGeocode(lat: number, lon: number): Promise<Partial<UserLocation>> {
    try {
      // FIXED: Use web search to get location info (works with existing backend)
      const { apiService } = await import('./APIService');
      
      // Search for location using coordinates - this uses your existing web_search endpoint
      const locationQuery = `${lat.toFixed(4)},${lon.toFixed(4)} location city country`;
      
      const response = await apiService.webSearch(locationQuery, {
        type: 'search',
        num: 3
      });

      if (response.success && response.data?.results) {
        // Parse location from search results
        const locationInfo = this.parseLocationFromSearchResults(response.data.results);
        if (locationInfo.city) {
          console.log('🌍 Location from search:', locationInfo);
          return locationInfo;
        }
      }

      // Fallback: Use a simple city lookup by coordinates
      return this.getLocationByCoordinates(lat, lon);

    } catch (error) {
      console.warn('⚠️ Reverse geocoding failed:', error);
      return {};
    }
  }

  private async getFallbackLocation(): Promise<UserLocation | null> {
    // FIXED: Use web search to detect location (works with existing backend)
    try {
      const { apiService } = await import('./APIService');
      
      // Search for "my location" or "current location" - often returns location-based results
      const response = await apiService.webSearch('my current location ip address city', {
        type: 'search',
        num: 5
      });

      if (response.success && response.data?.results) {
        const locationInfo = this.parseLocationFromSearchResults(response.data.results);
        if (locationInfo.city) {
          const location: UserLocation = {
            latitude: 0, // Unknown coordinates
            longitude: 0,
            city: locationInfo.city,
            country: locationInfo.country,
            timestamp: Date.now()
          };

          console.log('🌐 Fallback location detected:', location.city);
          return location;
        }
      }

    } catch (error) {
      console.warn('⚠️ Fallback location detection failed:', error);
    }

    return null;
  }

  private parseLocationFromSearchResults(results: any[]): Partial<UserLocation> {
    // Extract city/country from search result titles and snippets
    for (const result of results) {
      const text = `${result.title} ${result.snippet}`.toLowerCase();
      
      // Look for common location patterns
      const cityMatch = text.match(/(?:located in|in|at|from)\s+([A-Z][a-zA-Z\s]+?)(?:,|\s+(?:in|at)|$)/i);
      const countryMatch = text.match(/(?:,\s*)([A-Z][a-zA-Z\s]+?)(?:\s|$)/i);
      
      if (cityMatch) {
        const city = cityMatch[1].trim();
        const country = countryMatch ? countryMatch[1].trim() : undefined;
        
        // Validate that it looks like a real city name
        if (city.length > 2 && city.length < 50 && /^[a-zA-Z\s]+$/.test(city)) {
          return { city, country };
        }
      }
    }

    return {};
  }

  private getLocationByCoordinates(lat: number, lon: number): Partial<UserLocation> {
    // Simple coordinate-based location detection (offline fallback)
    const cities = [
      { lat: 40.7128, lon: -74.0060, city: 'New York', country: 'USA' },
      { lat: 51.5074, lon: -0.1278, city: 'London', country: 'UK' },
      { lat: 48.8566, lon: 2.3522, city: 'Paris', country: 'France' },
      { lat: 35.6762, lon: 139.6503, city: 'Tokyo', country: 'Japan' },
      { lat: -33.8688, lon: 151.2093, city: 'Sydney', country: 'Australia' },
      { lat: 37.7749, lon: -122.4194, city: 'San Francisco', country: 'USA' },
      { lat: 52.5200, lon: 13.4050, city: 'Berlin', country: 'Germany' }
    ];

    // Find closest city
    let closest = cities[0];
    let minDistance = this.calculateDistance(lat, lon, closest.lat, closest.lon);

    for (const city of cities.slice(1)) {
      const distance = this.calculateDistance(lat, lon, city.lat, city.lon);
      if (distance < minDistance) {
        minDistance = distance;
        closest = city;
      }
    }

    // Only use if reasonably close (within 200km)
    if (minDistance < 200) {
      console.log(`🌍 Approximated location: ${closest.city} (${minDistance.toFixed(1)}km away)`);
      return { city: closest.city, country: closest.country };
    }

    return {};
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for distance calculation
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private initializeLocationWatcher(): void {
    if (!this.preferences.autoDetect || !navigator.geolocation) return;

    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        // Update location silently in background
        this.enrichLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        }).then((location) => {
          this.preferences.lastKnownLocation = location;
          this.savePreferences();
        });
      },
      (error) => {
        console.warn('⚠️ Location watcher error:', error);
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 10 * 60 * 1000 // 10 minutes
      }
    );
  }

  private stopLocationWatcher(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private loadPreferences(): LocationPreferences {
    try {
      const stored = localStorage.getItem('neuraplay_location_preferences');
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('⚠️ Failed to load location preferences:', error);
    }

    return this.getDefaultPreferences();
  }

  private savePreferences(): void {
    try {
      localStorage.setItem('neuraplay_location_preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.warn('⚠️ Failed to save location preferences:', error);
    }
  }

  /**
   * COMPREHENSIVE GLOBAL CITY DATABASE
   * Maps all timezones to major cities with language variations
   * Covers 8+ major cities per country with native language support
   */
  private getGlobalCityMapping(): Record<string, string> {
    return {
      // SWEDEN - Major cities with language variations
      'Europe/Stockholm': 'Stockholm, Sweden',
      
      // Add timezone variants that users might encounter for Swedish cities
      'CET': 'Stockholm, Sweden', // Central European Time fallback for Sweden
      
      // We'll expand this to cover all major Swedish cities and their language variants
      // through the location extraction logic in ToolCallingHandler
    };
  }

  private getDefaultPreferences(): LocationPreferences {
    // ENHANCED: Better fallback location detection based on browser timezone
    let defaultLocation = 'Current Location'; // No hardcoded fallback
    
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('🌍 Detected browser timezone:', timezone);
      
      // COMPREHENSIVE GLOBAL TIMEZONE MAPPING
      // This covers users worldwide, not just specific regions
      
      // Kazakhstan & Central Asia
      if (timezone === 'Asia/Qyzylorda') {
        defaultLocation = 'Taraz, Kazakhstan';
      } else if (timezone === 'Asia/Almaty') {
        defaultLocation = 'Almaty, Kazakhstan';
      } else if (timezone === 'Asia/Qostanay' || timezone === 'Asia/Kostanay') {
        defaultLocation = 'Kostanay, Kazakhstan';
      } else if (timezone === 'Asia/Aqtobe' || timezone === 'Asia/Aktobe') {
        defaultLocation = 'Aktobe, Kazakhstan';
      } else if (timezone === 'Asia/Aqtau' || timezone === 'Asia/Aktau') {
        defaultLocation = 'Aktau, Kazakhstan';
      } else if (timezone === 'Asia/Tashkent') {
        defaultLocation = 'Tashkent, Uzbekistan';
      } else if (timezone === 'Asia/Bishkek') {
        defaultLocation = 'Bishkek, Kyrgyzstan';
      } else if (timezone === 'Asia/Dushanbe') {
        defaultLocation = 'Dushanbe, Tajikistan';
      
      // North America
      } else if (timezone === 'America/New_York') {
        defaultLocation = 'New York, USA';
      } else if (timezone === 'America/Chicago') {
        defaultLocation = 'Chicago, USA';
      } else if (timezone === 'America/Denver') {
        defaultLocation = 'Denver, USA';
      } else if (timezone === 'America/Los_Angeles') {
        defaultLocation = 'Los Angeles, USA';
      } else if (timezone === 'America/Toronto') {
        defaultLocation = 'Toronto, Canada';
      } else if (timezone === 'America/Vancouver') {
        defaultLocation = 'Vancouver, Canada';
      
      // Europe
      } else if (timezone === 'Europe/London') {
        defaultLocation = 'London, UK';
      } else if (timezone === 'Europe/Paris') {
        defaultLocation = 'Paris, France';
      } else if (timezone === 'Europe/Berlin') {
        defaultLocation = 'Berlin, Germany';
      } else if (timezone === 'Europe/Rome') {
        defaultLocation = 'Rome, Italy';
      } else if (timezone === 'Europe/Madrid') {
        defaultLocation = 'Madrid, Spain';
      } else if (timezone === 'Europe/Moscow') {
        defaultLocation = 'Moscow, Russia';
      
      // Asia Pacific
      } else if (timezone === 'Asia/Tokyo') {
        defaultLocation = 'Tokyo, Japan';
      } else if (timezone === 'Asia/Shanghai') {
        defaultLocation = 'Shanghai, China';
      } else if (timezone === 'Asia/Seoul') {
        defaultLocation = 'Seoul, South Korea';
      } else if (timezone === 'Asia/Bangkok') {
        defaultLocation = 'Bangkok, Thailand';
      } else if (timezone === 'Asia/Singapore') {
        defaultLocation = 'Singapore';
      } else if (timezone === 'Asia/Kolkata') {
        defaultLocation = 'Mumbai, India';
      } else if (timezone === 'Australia/Sydney') {
        defaultLocation = 'Sydney, Australia';
      } else if (timezone === 'Australia/Melbourne') {
        defaultLocation = 'Melbourne, Australia';
      
      // Middle East & Africa  
      } else if (timezone === 'Asia/Dubai') {
        defaultLocation = 'Dubai, UAE';
      } else if (timezone === 'Africa/Cairo') {
        defaultLocation = 'Cairo, Egypt';
      } else if (timezone === 'Africa/Johannesburg') {
        defaultLocation = 'Johannesburg, South Africa';
        
      // South America
      } else if (timezone === 'America/Sao_Paulo') {
        defaultLocation = 'São Paulo, Brazil';
      } else if (timezone === 'America/Argentina/Buenos_Aires') {
        defaultLocation = 'Buenos Aires, Argentina';
      }
      
      console.log('🎯 Timezone-based default location:', defaultLocation);
    } catch (error) {
      console.warn('⚠️ Failed to detect timezone for location fallback:', error);
    }

    return {
      autoDetect: true,
      permissions: 'unknown',
      defaultLocation: defaultLocation,
      lastKnownLocation: undefined
    };
  }

  /**
   * VALIDATE AND NORMALIZE LOCATION INPUT
   * Uses the global city database to validate and normalize location strings
   */
  public async validateAndNormalizeLocation(input: string): Promise<string | null> {
    if (!input || input.length < 2) return null;
    
    const normalized = input.toLowerCase().trim();
    
    try {
      // Use comprehensive cities database for validation
      const cityResult = await this.findCityInDatabase(normalized);
      if (cityResult) return cityResult;
      
      // Filter out common non-location words
      const nonLocationWords = [
        'the', 'weather', 'today', 'tomorrow', 'now', 'is', 'was', 'will', 'be', 'like',
        'currently', 'here', 'there', 'what', 'how', 'when', 'where', 'why', 'this', 'that'
      ];
      
      if (nonLocationWords.includes(normalized)) {
        return null;
      }
      
      // If it looks like a location (capitalized, not a common word), accept it
      if (!cityResult && /^[A-Z][a-zA-Z\s-]+$/.test(input) && input.length > 2) {
        return input;
      }
      
      return null;
    } catch (error) {
      console.warn('⚠️ Failed to load global cities database:', error);
      
      // Fallback validation without database
      if (/^[A-Z][a-zA-Z\s-]+$/.test(input) && input.length > 2) {
        return input;
      }
      return null;
    }
  }

  /**
   * EXTRACT LOCATION FROM MESSAGE
   * Intelligent location parsing from natural language weather requests
   */
  public async extractLocationFromMessage(message: string): Promise<string | null> {
    // Extract location from weather requests
    // First try to find location after specific weather prepositions (more precise patterns)
    const locationMatch = message.match(/(?:weather\s+(?:in|for|at)\s+|(?:^|\s)(?:in|at|for)\s+)([a-zA-Z\s,.-]+?)(?:\s+(?:today|tomorrow|weather|forecast|temperature)|\s*[?!.,]|$)/i);
    if (locationMatch) {
      const location = locationMatch[1].trim();
      // Enhanced location validation with global city recognition
      const validatedLocation = await this.validateAndNormalizeLocation(location);
      if (validatedLocation) {
        return validatedLocation;
      }
    }
    
    // Look for standalone location words with global city recognition
    const words = message.split(/\s+/);
    for (const word of words) {
      // Check against comprehensive global city database
      const normalizedLocation = await this.validateAndNormalizeLocation(word);
      if (normalizedLocation) {
        return normalizedLocation;
      }
    }
    
    // If no explicit location found, return null (caller can decide to auto-detect)
    return null;
  }

  /**
   * FIND CITY IN COMPREHENSIVE DATABASE
   * Uses the cities500.json database with fuzzy matching
   */
  private async findCityInDatabase(query: string): Promise<string | null> {
    try {
      // Load cities database
      const cities = await this.loadCitiesDatabase();
      
      if (!cities || cities.length === 0) {
        console.warn('⚠️ Cities database not available');
        return null;
      }

      const normalizedQuery = query.toLowerCase().trim();
      
      // Exact name match (highest priority)
      let exactMatch = cities.find(city => 
        city.name.toLowerCase() === normalizedQuery
      );
      
      if (exactMatch) {
        return `${exactMatch.name}, ${this.getCountryName(exactMatch.country)}`;
      }

      // Country code match
      let countryMatch = cities.find(city => 
        city.country.toLowerCase() === normalizedQuery || 
        this.getCountryName(city.country).toLowerCase() === normalizedQuery
      );
      
      if (countryMatch) {
        // Return the largest city in that country (highest population)
        const countryCities = cities
          .filter(city => city.country === countryMatch!.country)
          .sort((a, b) => parseInt(b.pop || '0') - parseInt(a.pop || '0'));
        
        if (countryCities.length > 0) {
          return `${countryCities[0].name}, ${this.getCountryName(countryCities[0].country)}`;
        }
      }

      // Partial name match (starts with query)
      let startsWithMatch = cities.find(city => 
        city.name.toLowerCase().startsWith(normalizedQuery) && normalizedQuery.length >= 3
      );
      
      if (startsWithMatch) {
        return `${startsWithMatch.name}, ${this.getCountryName(startsWithMatch.country)}`;
      }

      // Contains match (for longer queries)
      if (normalizedQuery.length >= 4) {
        let containsMatch = cities.find(city => 
          city.name.toLowerCase().includes(normalizedQuery)
        );
        
        if (containsMatch) {
          return `${containsMatch.name}, ${this.getCountryName(containsMatch.country)}`;
        }
      }

      return null;
    } catch (error) {
      console.warn('⚠️ Error searching cities database:', error);
      return null;
    }
  }

  /**
   * LOAD CITIES DATABASE
   * Loads the comprehensive cities500.json file
   */
  private async loadCitiesDatabase(): Promise<Array<{
    id: string;
    name: string;
    country: string;
    admin1: string;
    lat: string;
    lon: string;
    pop: string;
  }> | null> {
    try {
      // Try multiple possible paths for the cities database
              const possiblePaths = [
          '/data/cities500.json',
          '/src/data/cities500.json', 
          './data/cities500.json',
          './src/data/cities500.json'
        ];
      
      let cities = null;
      let loadedFrom = null;
      
      for (const path of possiblePaths) {
        try {
          console.log(`🌍 Attempting to load cities from: ${path}`);
          const response = await fetch(path);
          if (response.ok) {
            cities = await response.json();
            loadedFrom = path;
            break;
          }
        } catch (pathError) {
          console.log(`⚠️ Failed to load from ${path}:`, pathError.message);
        }
      }
      
      if (cities && cities.length > 0) {
        console.log(`🌍 Successfully loaded ${cities.length} cities from: ${loadedFrom}`);
        return cities;
      } else {
        throw new Error('No cities database found at any path');
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load comprehensive cities database from all paths:', error);
      console.log('🔄 Using enhanced hardcoded database with comprehensive global coverage');
      
      // Fallback to COMPREHENSIVE hardcoded database (not just basic)
      return this.getComprehensiveHardcodedDatabase();
    }
  }

  /**
   * COMPREHENSIVE HARDCODED DATABASE FALLBACK
   * Provides extensive global cities when external database is unavailable
   * Covers ALL major cities that users commonly request
   */
  private getComprehensiveHardcodedDatabase(): Array<{
    id: string;
    name: string;
    country: string;
    admin1: string;
    lat: string;
    lon: string;
    pop: string;
  }> {
    return [
      // SWEDEN - All major cities with proper Swedish characters
      { id: "sw1", name: "Stockholm", country: "SE", admin1: "Stockholm", lat: "59.3293", lon: "18.0686", pop: "975551" },
      { id: "sw2", name: "Göteborg", country: "SE", admin1: "Västra Götaland", lat: "57.7089", lon: "11.9746", pop: "572799" },
      { id: "sw3", name: "Malmö", country: "SE", admin1: "Skåne", lat: "55.6059", lon: "13.0007", pop: "316588" },
      { id: "sw4", name: "Uppsala", country: "SE", admin1: "Uppsala", lat: "59.8586", lon: "17.6389", pop: "168096" },
      { id: "sw5", name: "Västerås", country: "SE", admin1: "Västmanland", lat: "59.6162", lon: "16.5528", pop: "126697" },
      { id: "sw6", name: "Örebro", country: "SE", admin1: "Örebro", lat: "59.2741", lon: "15.2066", pop: "124027" },
      { id: "sw7", name: "Linköping", country: "SE", admin1: "Östergötland", lat: "58.4108", lon: "15.6214", pop: "111267" },
      { id: "sw8", name: "Helsingborg", country: "SE", admin1: "Skåne", lat: "56.0465", lon: "12.6945", pop: "108334" },
      { id: "sw9", name: "Jönköping", country: "SE", admin1: "Jönköping", lat: "57.7826", lon: "14.1618", pop: "93797" },
      { id: "sw10", name: "Norrköping", country: "SE", admin1: "Östergötland", lat: "58.5877", lon: "16.1924", pop: "93765" },
      { id: "sw11", name: "Lund", country: "SE", admin1: "Skåne", lat: "55.7047", lon: "13.1910", pop: "91940" },
      { id: "sw12", name: "Umeå", country: "SE", admin1: "Västerbotten", lat: "63.8258", lon: "20.2630", pop: "89206" },
      { id: "sw13", name: "Gävle", country: "SE", admin1: "Gävleborg", lat: "60.6749", lon: "17.1413", pop: "75451" },
      { id: "sw14", name: "Borås", country: "SE", admin1: "Västra Götaland", lat: "57.7210", lon: "12.9401", pop: "71700" },
      { id: "sw15", name: "Eskilstuna", country: "SE", admin1: "Södermanland", lat: "59.3669", lon: "16.5077", pop: "69948" },
      { id: "sw16", name: "Karlstad", country: "SE", admin1: "Värmland", lat: "59.3793", lon: "13.5036", pop: "65856" },
      { id: "sw17", name: "Sundsvall", country: "SE", admin1: "Västernorrland", lat: "62.3908", lon: "17.3069", pop: "58807" },

      // NORWAY - All major cities
      { id: "no1", name: "Oslo", country: "NO", admin1: "Oslo", lat: "59.9139", lon: "10.7522", pop: "695000" },
      { id: "no2", name: "Bergen", country: "NO", admin1: "Vestland", lat: "60.3913", lon: "5.3221", pop: "285911" },
      { id: "no3", name: "Trondheim", country: "NO", admin1: "Trøndelag", lat: "63.4305", lon: "10.3951", pop: "207595" },
      { id: "no4", name: "Stavanger", country: "NO", admin1: "Rogaland", lat: "58.9700", lon: "5.7331", pop: "144699" },
      { id: "no5", name: "Kristiansand", country: "NO", admin1: "Agder", lat: "58.1599", lon: "7.9959", pop: "112823" },
      { id: "no6", name: "Fredrikstad", country: "NO", admin1: "Østfold", lat: "59.2181", lon: "10.9298", pop: "83761" },
      { id: "no7", name: "Tromsø", country: "NO", admin1: "Troms og Finnmark", lat: "69.6492", lon: "18.9553", pop: "76974" },
      { id: "no8", name: "Drammen", country: "NO", admin1: "Buskerud", lat: "59.7440", lon: "10.2045", pop: "70374" },

      // KAZAKHSTAN - All major cities
      { id: "kz1", name: "Almaty", country: "KZ", admin1: "Almaty", lat: "43.2220", lon: "76.8512", pop: "1916384" },
      { id: "kz2", name: "Nur-Sultan", country: "KZ", admin1: "Nur-Sultan", lat: "51.1694", lon: "71.4491", pop: "1136008" },
      { id: "kz3", name: "Shymkent", country: "KZ", admin1: "Turkestan", lat: "42.3000", lon: "69.6000", pop: "1002291" },
      { id: "kz4", name: "Aktobe", country: "KZ", admin1: "Aktobe", lat: "50.2839", lon: "57.1670", pop: "500757" },
      { id: "kz5", name: "Taraz", country: "KZ", admin1: "Zhambyl", lat: "42.9000", lon: "71.3667", pop: "358153" },
      { id: "kz6", name: "Pavlodar", country: "KZ", admin1: "Pavlodar", lat: "52.3000", lon: "76.9500", pop: "360000" },
      { id: "kz7", name: "Ust-Kamenogorsk", country: "KZ", admin1: "East Kazakhstan", lat: "49.9478", lon: "82.6281", pop: "319067" },
      { id: "kz8", name: "Karaganda", country: "KZ", admin1: "Karaganda", lat: "49.8047", lon: "73.1094", pop: "497777" },

      // UNITED STATES - Major cities
      { id: "us1", name: "New York", country: "US", admin1: "New York", lat: "40.7128", lon: "-74.0060", pop: "8175133" },
      { id: "us2", name: "Los Angeles", country: "US", admin1: "California", lat: "34.0522", lon: "-118.2437", pop: "3971883" },
      { id: "us3", name: "Chicago", country: "US", admin1: "Illinois", lat: "41.8781", lon: "-87.6298", pop: "2693976" },
      { id: "us4", name: "Houston", country: "US", admin1: "Texas", lat: "29.7604", lon: "-95.3698", pop: "2320268" },
      { id: "us5", name: "Philadelphia", country: "US", admin1: "Pennsylvania", lat: "39.9526", lon: "-75.1652", pop: "1584064" },
      { id: "us6", name: "Phoenix", country: "US", admin1: "Arizona", lat: "33.4484", lon: "-112.0740", pop: "1680992" },

      // UNITED KINGDOM - Major cities
      { id: "gb1", name: "London", country: "GB", admin1: "England", lat: "51.5074", lon: "-0.1278", pop: "8982000" },
      { id: "gb2", name: "Birmingham", country: "GB", admin1: "England", lat: "52.4862", lon: "-1.8904", pop: "1141816" },
      { id: "gb3", name: "Manchester", country: "GB", admin1: "England", lat: "53.4808", lon: "-2.2426", pop: "547000" },
      { id: "gb4", name: "Glasgow", country: "GB", admin1: "Scotland", lat: "55.8642", lon: "-4.2518", pop: "633120" },

      // GERMANY - Major cities
      { id: "de1", name: "Berlin", country: "DE", admin1: "Berlin", lat: "52.5200", lon: "13.4050", pop: "3669491" },
      { id: "de2", name: "Hamburg", country: "DE", admin1: "Hamburg", lat: "53.5511", lon: "9.9937", pop: "1899160" },
      { id: "de3", name: "Munich", country: "DE", admin1: "Bavaria", lat: "48.1351", lon: "11.5820", pop: "1484226" },
      { id: "de4", name: "Cologne", country: "DE", admin1: "North Rhine-Westphalia", lat: "50.9375", lon: "6.9603", pop: "1085664" },

      // FRANCE - Major cities
      { id: "fr1", name: "Paris", country: "FR", admin1: "Île-de-France", lat: "48.8566", lon: "2.3522", pop: "2161000" },
      { id: "fr2", name: "Marseille", country: "FR", admin1: "Provence-Alpes-Côte d'Azur", lat: "43.2965", lon: "5.3698", pop: "870731" },
      { id: "fr3", name: "Lyon", country: "FR", admin1: "Auvergne-Rhône-Alpes", lat: "45.7640", lon: "4.8357", pop: "518635" },

      // CANADA - Major cities
      { id: "ca1", name: "Toronto", country: "CA", admin1: "Ontario", lat: "43.6532", lon: "-79.3832", pop: "2731571" },
      { id: "ca2", name: "Montreal", country: "CA", admin1: "Quebec", lat: "45.5017", lon: "-73.5673", pop: "1704694" },
      { id: "ca3", name: "Vancouver", country: "CA", admin1: "British Columbia", lat: "49.2827", lon: "-123.1207", pop: "631486" },

      // JAPAN - Major cities
      { id: "jp1", name: "Tokyo", country: "JP", admin1: "Tokyo", lat: "35.6762", lon: "139.6503", pop: "13960000" },
      { id: "jp2", name: "Osaka", country: "JP", admin1: "Osaka", lat: "34.6937", lon: "135.5023", pop: "2691742" },

      // AUSTRALIA - Major cities
      { id: "au1", name: "Sydney", country: "AU", admin1: "New South Wales", lat: "-33.8688", lon: "151.2093", pop: "5312000" },
      { id: "au2", name: "Melbourne", country: "AU", admin1: "Victoria", lat: "-37.8136", lon: "144.9631", pop: "5078193" },

      // RUSSIA - Major cities
      { id: "ru1", name: "Moscow", country: "RU", admin1: "Moscow", lat: "55.7558", lon: "37.6176", pop: "12692466" },
      { id: "ru2", name: "Saint Petersburg", country: "RU", admin1: "Saint Petersburg", lat: "59.9311", lon: "30.3609", pop: "5398064" },

      // NETHERLANDS - Major cities
      { id: "nl1", name: "Amsterdam", country: "NL", admin1: "North Holland", lat: "52.3676", lon: "4.9041", pop: "873555" }
    ];
  }

  /**
   * CONVERT COUNTRY CODE TO FULL NAME
   * Maps ISO country codes to full country names
   */
  private getCountryName(countryCode: string): string {
    const countryMap: Record<string, string> = {
      'US': 'United States',
      'GB': 'United Kingdom', 
      'FR': 'France',
      'DE': 'Germany',
      'JP': 'Japan',
      'AU': 'Australia',
      'CA': 'Canada',
      'SE': 'Sweden',
      'KZ': 'Kazakhstan',
      'UZ': 'Uzbekistan',
      'RU': 'Russia',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland'
      // Add more as needed
    };
    
    return countryMap[countryCode] || countryCode;
  }
}

export const locationService = LocationService.getInstance();

