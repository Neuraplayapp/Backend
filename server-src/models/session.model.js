// Session Model - Database schema and validation
const { v4: uuidv4 } = require('uuid');

class SessionModel {
  constructor(data = {}) {
    this.id = data.id || uuidv4();
    this.user_id = data.user_id;
    this.state = data.state || {
      phase: 'IDLE',
      sessionId: this.id,
      userId: this.user_id,
      context: {},
      toolQueue: [],
      results: {},
      errors: []
    };
    this.context = data.context || {};
    this.state_history = data.state_history || [];
    this.phase = data.phase || 'IDLE';
    this.created_at = data.created_at || new Date();
    this.updated_at = data.updated_at || new Date();
    this.expires_at = data.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.user_id) {
      errors.push('user_id is required');
    }

    if (!this.isValidPhase(this.phase)) {
      errors.push(`Invalid phase: ${this.phase}`);
    }

    if (this.expires_at <= new Date()) {
      errors.push('Session cannot expire in the past');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  isValidPhase(phase) {
    const validPhases = ['IDLE', 'PLANNING', 'EXECUTING', 'SYNTHESIZING', 'COMPLETED', 'ERROR', 'CLOSED', 'ARCHIVED', 'EXPIRED'];
    return validPhases.includes(phase);
  }

  // State management
  updatePhase(newPhase, additionalData = {}) {
    if (!this.isValidPhase(newPhase)) {
      throw new Error(`Invalid phase transition: ${this.phase} -> ${newPhase}`);
    }

    const previousState = { ...this.state };
    
    this.phase = newPhase;
    this.state = {
      ...this.state,
      phase: newPhase,
      ...additionalData
    };
    this.updated_at = new Date();

    // Add to history
    this.state_history.push({
      timestamp: this.updated_at,
      from: previousState.phase,
      to: newPhase,
      data: additionalData
    });

    // Keep only last 100 state changes
    if (this.state_history.length > 100) {
      this.state_history = this.state_history.slice(-100);
    }
  }

  addError(error) {
    if (!this.state.errors) this.state.errors = [];
    
    this.state.errors.push({
      message: error.message || error,
      timestamp: new Date(),
      stack: error.stack
    });

    // Keep only last 10 errors
    if (this.state.errors.length > 10) {
      this.state.errors = this.state.errors.slice(-10);
    }
  }

  // Lifecycle methods
  isActive() {
    return ['PLANNING', 'EXECUTING', 'SYNTHESIZING'].includes(this.phase);
  }

  isExpired() {
    return new Date() > this.expires_at;
  }

  canTransitionTo(targetPhase) {
    const transitions = {
      'IDLE': ['PLANNING', 'CLOSED'],
      'PLANNING': ['EXECUTING', 'ERROR', 'CLOSED'],
      'EXECUTING': ['SYNTHESIZING', 'ERROR', 'CLOSED'],
      'SYNTHESIZING': ['COMPLETED', 'ERROR', 'CLOSED'],
      'COMPLETED': ['ARCHIVED', 'CLOSED'],
      'ERROR': ['PLANNING', 'CLOSED', 'ARCHIVED'],
      'CLOSED': ['ARCHIVED'],
      'ARCHIVED': [],
      'EXPIRED': ['ARCHIVED']
    };

    return transitions[this.phase]?.includes(targetPhase) || false;
  }

  // Serialization
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      state: this.state,
      context: this.context,
      state_history: this.state_history,
      phase: this.phase,
      created_at: this.created_at,
      updated_at: this.updated_at,
      expires_at: this.expires_at
    };
  }

  toPublicJSON() {
    return {
      id: this.id,
      phase: this.phase,
      created_at: this.created_at,
      updated_at: this.updated_at,
      expires_at: this.expires_at,
      isActive: this.isActive(),
      isExpired: this.isExpired(),
      stateChanges: this.state_history.length,
      hasErrors: this.state.errors?.length > 0
    };
  }

  static fromDatabase(dbRow) {
    return new SessionModel({
      id: dbRow.id,
      user_id: dbRow.user_id,
      state: typeof dbRow.state === 'string' ? JSON.parse(dbRow.state) : dbRow.state,
      context: typeof dbRow.context === 'string' ? JSON.parse(dbRow.context) : dbRow.context,
      state_history: typeof dbRow.state_history === 'string' ? JSON.parse(dbRow.state_history) : dbRow.state_history,
      phase: dbRow.phase,
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at,
      expires_at: dbRow.expires_at
    });
  }

  // Factory methods
  static createNew(userId, initialContext = {}) {
    return new SessionModel({
      user_id: userId,
      context: initialContext
    });
  }

  static createTestSession() {
    return new SessionModel({
      user_id: 'test-user',
      context: { test: true },
      expires_at: new Date(Date.now() + 60 * 1000) // 1 minute for testing
    });
  }
}

module.exports = SessionModel;
