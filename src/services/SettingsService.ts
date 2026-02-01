// Settings Service - Manages user settings and preferences
export class SettingsService {
  private settings: Record<string, any> = {};

  constructor() {
    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('neuraplay_settings');
      if (saved) {
        this.settings = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('neuraplay_settings', JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  getSetting(key: string, defaultValue?: any): any {
    return this.settings[key] ?? defaultValue;
  }

  setSetting(key: string, value: any): void {
    this.settings[key] = value;
    this.saveSettings();
  }

  getAllSettings(): Record<string, any> {
    return { ...this.settings };
  }

  resetSettings(): void {
    this.settings = {};
    this.saveSettings();
  }
}

export const settingsService = new SettingsService();
