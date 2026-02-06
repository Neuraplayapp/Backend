// Real API client - uses backend at /api (proxied to backend server)
import { User } from '../contexts/UserContext';

const apiBase = ''; // relative; Vite proxy forwards /api to backend

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed: ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }
  return data as T;
}

// Authentication API - real backend
export const authAPI = {
  login: async (email: string, password: string): Promise<{ user?: User; message?: string }> => {
    const data = await request<{ success: boolean; user?: User; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.toLowerCase(), password }),
    });
    if (!data.success || !data.user) {
      return { message: data.message || 'Invalid email or password' };
    }
    return { user: data.user as User };
  },

  register: async (payload: {
    username: string;
    email: string;
    password: string;
    role: 'learner' | 'parent' | 'admin';
    age?: number;
    profile?: any;
  }): Promise<{ user?: User; message?: string }> => {
    const res = await request<{ success: boolean; user?: User; message?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.success || !res.user) {
      return { message: res.message || 'Registration failed' };
    }
    return { user: res.user as User };
  },

  forgotPassword: async (email: string): Promise<{ success: boolean; message?: string }> => {
    const data = await request<{ success: boolean; message?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.toLowerCase() }),
    });
    return {
      success: data.success !== false,
      message: data.message || 'If an account exists with this email, you will receive a password reset link shortly.',
    };
  },
};

// Contact API - real backend
export const contactAPI = {
  submit: async (data: { name: string; email: string; message: string }): Promise<{ success: boolean; message?: string }> => {
    const res = await request<{ success?: boolean; message?: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return {
      success: res.success !== false,
      message: res.message || 'Thank you for your message! We will get back to you soon.',
    };
  },
};

// Image generation - real backend if available, else graceful fallback
export const imageAPI = {
  generate: async (prompt: string): Promise<{ data?: string; contentType?: string; error?: string }> => {
    try {
      const res = await request<{ data?: string; contentType?: string; error?: string }>('/api/image/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      });
      if (res.error) return { error: res.error };
      return { data: res.data, contentType: res.contentType };
    } catch {
      return { error: 'Image generation service unavailable' };
    }
  },
};

export const api = {
  auth: authAPI,
  contact: contactAPI,
  image: imageAPI,
};

export default api;