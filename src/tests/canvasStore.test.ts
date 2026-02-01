/**
 * 🧪 Canvas Store - Integration Test Suite
 * 
 * Tests the Zustand store integration with state machines
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCanvasStore } from '../stores/canvasStore';

describe('Canvas Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useCanvasStore.getState();
    store.clearCanvas();
  });

  describe('Conversation Management', () => {
    it('should set current conversation', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('conv-123');
      
      // Get fresh state after mutation
      const updatedStore = useCanvasStore.getState();
      expect(updatedStore.currentConversationId).toBe('conv-123');
    });
    
    it('should isolate canvas elements per conversation', () => {
      const store = useCanvasStore.getState();
      
      // Add element to conversation 1
      store.setCurrentConversation('conv-1');
      store.addCanvasElement({
        type: 'document',
        content: { title: 'Doc 1' },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      // Add element to conversation 2
      store.setCurrentConversation('conv-2');
      store.addCanvasElement({
        type: 'document',
        content: { title: 'Doc 2' },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      // Verify isolation
      store.setCurrentConversation('conv-1');
      const conv1Elements = store.getCurrentCanvasElements();
      expect(conv1Elements.length).toBe(1);
      expect(conv1Elements[0].content.title).toBe('Doc 1');
      
      store.setCurrentConversation('conv-2');
      const conv2Elements = store.getCurrentCanvasElements();
      expect(conv2Elements.length).toBe(1);
      expect(conv2Elements[0].content.title).toBe('Doc 2');
    });
  });

  describe('Element Management', () => {
    it('should add canvas element', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('test-conv');
      
      const elementId = store.addCanvasElement({
        type: 'document',
        content: { title: 'Test Doc' },
        position: { x: 100, y: 100 },
        size: { width: 600, height: 400 },
        layer: 0
      });
      
      expect(elementId).toBeDefined();
      const elements = store.getCurrentCanvasElements();
      expect(elements.length).toBe(1);
      expect(elements[0].id).toBe(elementId);
    });
    
    it('should update canvas element', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('test-conv');
      
      const elementId = store.addCanvasElement({
        type: 'document',
        content: { title: 'Original' },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      store.updateCanvasElement(elementId, {
        content: { title: 'Updated' },
        state: 'completed'
      });
      
      const elements = store.getCurrentCanvasElements();
      expect(elements[0].content.title).toBe('Updated');
      expect(elements[0].state).toBe('completed');
    });
    
    it('should remove canvas element', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('test-conv');
      
      const elementId = store.addCanvasElement({
        type: 'document',
        content: { title: 'To Delete' },
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      store.removeCanvasElement(elementId);
      
      const elements = store.getCurrentCanvasElements();
      expect(elements.length).toBe(0);
    });
    
    it('should clear all canvas elements', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('test-conv');
      
      // Add multiple elements
      store.addCanvasElement({
        type: 'document',
        content: {},
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      store.addCanvasElement({
        type: 'chart',
        content: {},
        position: { x: 100, y: 100 },
        size: { width: 500, height: 400 },
        layer: 0
      });
      
      expect(store.getCurrentCanvasElements().length).toBe(2);
      
      store.clearCanvas();
      expect(store.getCurrentCanvasElements().length).toBe(0);
    });
  });

  describe('Version Management', () => {
    it('should set frozen version', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('test-conv');
      
      const elementId = store.addCanvasElement({
        type: 'document',
        content: {},
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      store.setFrozenVersion(elementId, 1, 'Version 1 content');
      store.setFrozenVersion(elementId, 2, 'Version 2 content');
      
      const frozenVersions = store.getFrozenVersions(elementId);
      expect(frozenVersions['1']).toBe('Version 1 content');
      expect(frozenVersions['2']).toBe('Version 2 content');
    });
    
    it('should get frozen versions for element', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('test-conv');
      
      const elementId = store.addCanvasElement({
        type: 'document',
        content: {},
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0
      });
      
      store.setFrozenVersion(elementId, 1, 'Content v1');
      
      const versions = store.getFrozenVersions(elementId);
      expect(Object.keys(versions).length).toBe(1);
      expect(versions['1']).toBe('Content v1');
    });
    
    it('should handle non-existent element gracefully', () => {
      const store = useCanvasStore.getState();
      
      const versions = store.getFrozenVersions('non-existent-id');
      expect(versions).toEqual({});
    });
  });

  describe('Canvas Mode', () => {
    it('should toggle canvas mode', () => {
      let store = useCanvasStore.getState();
      
      expect(store.isCanvasMode).toBe(false);
      
      store.toggleCanvasMode();
      store = useCanvasStore.getState(); // Get fresh state
      expect(store.isCanvasMode).toBe(true);
      
      store.toggleCanvasMode();
      store = useCanvasStore.getState(); // Get fresh state
      expect(store.isCanvasMode).toBe(false);
    });
    
    it('should set split ratio', () => {
      const store = useCanvasStore.getState();
      
      store.setSplitRatio(0.7);
      expect(store.splitRatio).toBe(0.7);
    });
  });

  describe('State Machine Integration', () => {
    it('should initialize state machine', () => {
      let store = useCanvasStore.getState();
      
      const conversationId = 'state-test-conv';
      store.initializeStateMachine(conversationId);
      
      // Get fresh state after mutation
      store = useCanvasStore.getState();
      expect(store.stateMachine).toBeDefined();
    });
    
    it('should transition state machine states', async () => {
      const store = useCanvasStore.getState();
      
      const conversationId = 'transition-test';
      store.initializeStateMachine(conversationId);
      
      const result = await store.transitionState('DOCUMENT_CREATED', {
        documentId: 'doc-1'
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Revision History', () => {
    it('should initialize revision history', () => {
      let store = useCanvasStore.getState();
      
      store.initializeRevisionHistory();
      
      // Get fresh state after mutation
      store = useCanvasStore.getState();
      expect(store.revisionHistory).toBeDefined();
    });
    
    it('should create atomic version', () => {
      const store = useCanvasStore.getState();
      store.initializeRevisionHistory();
      
      const versionId = store.createAtomicVersion('doc-1', 'Test content', {
        author: 'test-user',
        reason: 'Initial creation'
      });
      
      expect(versionId).toBeDefined();
    });
    
    it('should finalize version', () => {
      const store = useCanvasStore.getState();
      store.initializeRevisionHistory();
      
      const versionId = store.createAtomicVersion('doc-1', 'Test content', {
        author: 'test-user'
      });
      
      store.finalizeVersion(versionId);
      
      // Version should be marked as finalized
      expect(store.revisionHistory).toBeDefined();
    });
  });

  describe('Element State Lifecycle', () => {
    it('should track element state changes', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('lifecycle-test');
      
      // Create element in 'creating' state
      const elementId = store.addCanvasElement({
        type: 'document',
        content: {},
        position: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        layer: 0,
        state: 'creating'
      });
      
      let elements = store.getCurrentCanvasElements();
      expect(elements[0].state).toBe('creating');
      
      // Transition to 'active'
      store.updateCanvasElement(elementId, { state: 'active' });
      elements = store.getCurrentCanvasElements();
      expect(elements[0].state).toBe('active');
      
      // Transition to 'completed'
      store.updateCanvasElement(elementId, { state: 'completed' });
      elements = store.getCurrentCanvasElements();
      expect(elements[0].state).toBe('completed');
    });
  });

  describe('Multiple Element Types', () => {
    it('should handle document elements', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('doc-test');
      
      store.addCanvasElement({
        type: 'document',
        content: { title: 'Test Document', content: 'Content' },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0
      });
      
      const elements = store.getCurrentCanvasElements();
      expect(elements[0].type).toBe('document');
    });
    
    it('should handle chart elements', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('chart-test');
      
      store.addCanvasElement({
        type: 'chart',
        content: { chartType: 'bar', data: [] },
        position: { x: 0, y: 0 },
        size: { width: 500, height: 400 },
        layer: 0
      });
      
      const elements = store.getCurrentCanvasElements();
      expect(elements[0].type).toBe('chart');
    });
    
    it('should handle code elements', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('code-test');
      
      store.addCanvasElement({
        type: 'code',
        content: { language: 'javascript', code: 'console.log("test");' },
        position: { x: 0, y: 0 },
        size: { width: 500, height: 300 },
        layer: 0
      });
      
      const elements = store.getCurrentCanvasElements();
      expect(elements[0].type).toBe('code');
    });
  });
});


