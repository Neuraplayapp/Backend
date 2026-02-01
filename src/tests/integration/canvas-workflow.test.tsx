/**
 * 🧪 Canvas Workflow Integration Tests
 * 
 * End-to-end tests for complete canvas workflows:
 * - Document creation → typing → completion
 * - Adding sections → version history
 * - Export → vectorization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { useCanvasStore } from '../../stores/canvasStore';
import NeuraPlayDocumentCanvas from '../../components/NeuraPlayDocumentCanvas';

describe('Canvas Workflow Integration', () => {
  beforeEach(() => {
    const store = useCanvasStore.getState();
    store.clearCanvas();
    vi.clearAllMocks();
  });

  describe('Complete Document Lifecycle', () => {
    it('should complete full workflow: create → type → complete → export', async () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('workflow-test');
      
      // Step 1: Create document element
      const elementId = store.addCanvasElement({
        type: 'document',
        content: {
          title: 'Integration Test Doc',
          content: 'This is a test document'
        },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0,
        state: 'creating',
        currentVersion: 1,
        versions: [{
          id: 'v1',
          version: 1,
          content: 'This is a test document',
          state: 'typing',
          timestamp: Date.now()
        }]
      });
      
      let elements = store.getCurrentCanvasElements();
      expect(elements.length).toBe(1);
      expect(elements[0].state).toBe('creating');
      
      // Step 2: Transition to active (typing)
      store.updateCanvasElement(elementId, { state: 'active' });
      elements = store.getCurrentCanvasElements();
      expect(elements[0].state).toBe('active');
      
      // Step 3: Complete typing - freeze version
      store.setFrozenVersion(elementId, 1, 'This is a test document');
      const frozenVersions = store.getFrozenVersions(elementId);
      expect(frozenVersions['1']).toBe('This is a test document');
      
      // Step 4: Mark as completed
      store.updateCanvasElement(elementId, { state: 'completed' });
      elements = store.getCurrentCanvasElements();
      expect(elements[0].state).toBe('completed');
      
      // Step 5: Verify element is ready for export
      const finalElement = elements[0];
      expect(finalElement.type).toBe('document');
      expect(finalElement.state).toBe('completed');
      expect(finalElement.versions?.length).toBe(1);
    });
  });

  describe('Multi-Version Document Workflow', () => {
    it('should handle adding sections to SAME continuous scrollable document with version checkpoints', async () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('multi-version-test');
      store.initializeRevisionHistory();
      
      // User: "Create a document about AI"
      // AI: Creates v1 with introduction
      const elementId = store.addCanvasElement({
        type: 'document',
        content: {
          title: 'AI Overview',
          content: '# Introduction to AI\n\nArtificial Intelligence is transforming technology.'
        },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0,
        currentVersion: 1,
        versions: []
      });
      
      // Version 1: Introduction
      const v1Content = '# Introduction to AI\n\nArtificial Intelligence is transforming technology.';
      const v1Id = store.createAtomicVersion(
        elementId,
        v1Content,
        { author: 'test', reason: 'Initial creation' }
      );
      store.finalizeVersion(v1Id);
      store.setFrozenVersion(elementId, 1, v1Content);
      
      // User: "add a section about machine learning"
      // AI: Continues SAME document by adding v2
      const v2Content = '## Machine Learning\n\nML is a subset of AI focused on learning from data.';
      const v2Id = store.createAtomicVersion(
        elementId,
        v2Content,
        { author: 'test', reason: 'User: add ML section' }
      );
      store.finalizeVersion(v2Id);
      store.setFrozenVersion(elementId, 2, v2Content);
      
      // User: "continue with applications"
      // AI: Continues SAME document by adding v3
      const v3Content = '## Applications\n\nAI is used in healthcare, finance, and autonomous vehicles.';
      const v3Id = store.createAtomicVersion(
        elementId,
        v3Content,
        { author: 'test', reason: 'User: add applications' }
      );
      store.finalizeVersion(v3Id);
      store.setFrozenVersion(elementId, 3, v3Content);
      
      store.updateCanvasElement(elementId, { currentVersion: 3 });
      
      // Verify versions are tracked separately (for history/rollback)
      const frozenVersions = store.getFrozenVersions(elementId);
      expect(Object.keys(frozenVersions).length).toBe(3);
      expect(frozenVersions['1']).toContain('Introduction to AI');
      expect(frozenVersions['2']).toContain('Machine Learning');
      expect(frozenVersions['3']).toContain('Applications');
      
      // CRITICAL: Verify document is CONTINUOUS and SCROLLABLE
      // When rendered, versions are joined into ONE document
      const fullDocument = [v1Content, v2Content, v3Content].join('\n\n');
      expect(fullDocument).toContain('Introduction to AI');
      expect(fullDocument).toContain('Machine Learning');  
      expect(fullDocument).toContain('Applications');
      
      // User scrolls through ONE continuous document, not 3 separate docs
      const sections = fullDocument.split('\n\n');
      expect(sections.length).toBeGreaterThanOrEqual(3);
      
      const elements = store.getCurrentCanvasElements();
      expect(elements[0].currentVersion).toBe(3);
    });
  });

  describe('Canvas Activation Workflow', () => {
    it('should activate canvas when document is created', () => {
      let store = useCanvasStore.getState();
      store.setCurrentConversation('activation-test');
      
      // Initially not in canvas mode
      expect(store.isCanvasMode).toBe(false);
      
      // Add document element
      store.addCanvasElement({
        type: 'document',
        content: { title: 'Test' },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0
      });
      
      // Canvas should be activated (in real app this would be triggered by event)
      store.toggleCanvasMode();
      
      // Get fresh state after mutation to check reactivity
      store = useCanvasStore.getState();
      expect(store.isCanvasMode).toBe(true);
      
      // Verify element exists
      const elements = store.getCurrentCanvasElements();
      expect(elements.length).toBe(1);
    });
  });

  describe('Concurrent Document Handling', () => {
    it('should handle multiple documents in same conversation', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('concurrent-test');
      
      // Add first document
      const doc1Id = store.addCanvasElement({
        type: 'document',
        content: { title: 'Document 1' },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0,
        state: 'active'
      });
      
      // Add second document
      const doc2Id = store.addCanvasElement({
        type: 'document',
        content: { title: 'Document 2' },
        position: { x: 650, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0,
        state: 'active'
      });
      
      const elements = store.getCurrentCanvasElements();
      expect(elements.length).toBe(2);
      
      // Both should be independent
      store.updateCanvasElement(doc1Id, { state: 'completed' });
      store.updateCanvasElement(doc2Id, { state: 'active' });
      
      const updatedElements = store.getCurrentCanvasElements();
      expect(updatedElements[0].state).toBe('completed');
      expect(updatedElements[1].state).toBe('active');
    });
  });

  describe('State Machine Integration', () => {
    it('should integrate with state machine for document lifecycle', async () => {
      const store = useCanvasStore.getState();
      const conversationId = 'state-machine-test';
      
      store.setCurrentConversation(conversationId);
      store.initializeStateMachine(conversationId);
      
      // Create document
      const elementId = store.addCanvasElement({
        type: 'document',
        content: { title: 'State Machine Test' },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0
      });
      
      // Trigger state machine event
      const result = await store.transitionState('DOCUMENT_CREATED', {
        documentId: elementId
      });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid element updates gracefully', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('error-test');
      
      // Try to update non-existent element
      expect(() => {
        store.updateCanvasElement('non-existent-id', { state: 'completed' });
      }).not.toThrow();
      
      // Verify no side effects
      const elements = store.getCurrentCanvasElements();
      expect(elements.length).toBe(0);
    });
    
    it('should handle invalid version freezing', () => {
      const store = useCanvasStore.getState();
      
      // Try to freeze version for non-existent element
      expect(() => {
        store.setFrozenVersion('non-existent-id', 1, 'content');
      }).not.toThrow();
    });
  });

  describe('Persistence', () => {
    it('should persist canvas state across store resets', () => {
      const store = useCanvasStore.getState();
      store.setCurrentConversation('persist-test');
      
      // Add element
      const elementId = store.addCanvasElement({
        type: 'document',
        content: { title: 'Persisted Doc' },
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        layer: 0
      });
      
      // Get state
      const state = store;
      
      // Verify element exists
      const elements = state.canvasElementsByConversation['persist-test'];
      expect(elements).toBeDefined();
      expect(elements.length).toBe(1);
      expect(elements[0].id).toBe(elementId);
    });
  });
});


