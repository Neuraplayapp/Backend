# Stubbed API Services

This directory contains stubbed versions of API services for frontend-only development.

## Overview

The `api.ts` file provides mock implementations of all backend API endpoints used by the Frontend application. These stubs allow developers to work on UI/UX without requiring backend connectivity.

## Available Services

### Authentication API (`api.auth`)

- **`login(email, password)`** - Simulates user login
  - Returns a mock user object
  - Demo account: `demo@neuraplay.com` / `demo123`
  - Randomly simulates verified/unverified users

- **`register(data)`** - Simulates user registration
  - Creates a new mock user
  - Validates required fields and password length
  - Stores mock users in localStorage

- **`forgotPassword(email)`** - Simulates password reset
  - Always returns success in stub mode

### Contact API (`api.contact`)

- **`submit(data)`** - Simulates contact form submission
  - Logs submission to console
  - Returns success response

### Image Generation API (`api.image`)

- **`generate(prompt)`** - Simulates AI image generation
  - Creates a placeholder SVG avatar based on prompt
  - Returns a data URL image

## Usage

```typescript
import { api } from '../services/api';

// Login
const result = await api.auth.login(email, password);

// Register
const result = await api.auth.register({
  username: 'testuser',
  email: 'test@example.com',
  password: 'password123',
  role: 'learner',
  age: 7
});

// Contact form
const result = await api.contact.submit({
  name: 'John Doe',
  email: 'john@example.com',
  message: 'Hello!'
});

// Generate avatar
const result = await api.image.generate('brave robot');
```

## Demo Account

For testing login functionality:
- **Email:** `demo@neuraplay.com`
- **Password:** `demo123`

## Notes

- All API calls include simulated network delays (500-2000ms)
- Mock users are stored in localStorage under `neuraplay_mock_users`
- Image generation creates simple SVG placeholders
- All stubs maintain the same interface as the real API for easy replacement

## Replacing with Real API

When connecting to the real backend, simply update the implementations in `api.ts` to make actual HTTP requests instead of returning mock data.
