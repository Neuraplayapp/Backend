#!/usr/bin/env node

/**
 * COMPREHENSIVE CHAT STATE MANAGEMENT DIAGNOSTIC TEST
 * 
 * Tests for the specific issues mentioned:
 * 1. ONE session transfer from AIAssistantSmall to NeuraPlayAssistantLite
 * 2. Canvas triggers stay in SAME session/chat (not create new ones)
 * 3. Multiple individual chat tabs working properly
 * 4. Chat deletion persistence (not reappearing)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ChatStateDiagnostics {
  constructor() {
    this.results = {
      sessionTransfer: { passed: false, issues: [] },
      canvasSameSession: { passed: false, issues: [] },
      multipleChatTabs: { passed: false, issues: [] },
      deletionPersistence: { passed: false, issues: [] },
      overallHealth: 0
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '💬',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'test': '🧪'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  // Test 1: Session Transfer Logic
  testSessionTransfer() {
    this.log('Testing session transfer from Small to Lite assistant...', 'test');
    
    try {
      // Check AIAssistantSmall session transfer logic
      const smallAssistantPath = 'src/components/AIAssistantSmall.tsx';
      const smallContent = fs.readFileSync(smallAssistantPath, 'utf8');
      
      // Verify session ID generation and transfer
      const hasSessionIdGeneration = smallContent.includes('sessionId') && 
                                    smallContent.includes('useState') &&
                                    smallContent.includes('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx');
      
      const hasEventDispatch = smallContent.includes('openNeuraPlayAssistant') &&
                               smallContent.includes('CustomEvent') &&
                               smallContent.includes('sessionId: sessionId');
      
      // Check NeuraPlayAssistantLite listener
      const litePath = 'src/components/NeuraPlayAssistantLite.tsx';
      const liteContent = fs.readFileSync(litePath, 'utf8');
      
      const hasEventListener = liteContent.includes('openNeuraPlayAssistant') &&
                              liteContent.includes('addEventListener') &&
                              liteContent.includes('switchToConversation');
      
      if (hasSessionIdGeneration && hasEventDispatch && hasEventListener) {
        this.results.sessionTransfer.passed = true;
        this.log('Session transfer logic appears correct', 'success');
      } else {
        this.results.sessionTransfer.issues.push('Missing session transfer components');
        if (!hasSessionIdGeneration) this.results.sessionTransfer.issues.push('No proper session ID generation in Small assistant');
        if (!hasEventDispatch) this.results.sessionTransfer.issues.push('No event dispatch in Small assistant');
        if (!hasEventListener) this.results.sessionTransfer.issues.push('No event listener in Lite assistant');
      }
      
      // Check for duplicate session transfer logic (should be only ONE)
      const transferCount = (smallContent.match(/openNeuraPlayAssistant/g) || []).length;
      if (transferCount > 2) { // One for creation, one for dispatch
        this.results.sessionTransfer.issues.push(`Multiple transfer logic found (${transferCount} instances) - should be only ONE`);
      }
      
    } catch (error) {
      this.results.sessionTransfer.issues.push(`Error reading files: ${error.message}`);
    }
  }

  // Test 2: Canvas Staying in Same Session
  testCanvasSameSession() {
    this.log('Testing canvas activation stays in same session...', 'test');
    
    try {
      // Check ToolCallingHandler for canvas tools
      const toolHandlerPath = 'src/ai/handlers/ToolCallingHandler.ts';
      const toolContent = fs.readFileSync(toolHandlerPath, 'utf8');
      
      // Canvas tools should use current session context, not create new sessions
      const canvasTools = [
        'canvas-document-creation',
        'canvas-chart-creation', 
        'canvas-code-creation'
      ];
      
      let wrongSessionCreation = false;
      const issues = [];
      
      for (const tool of canvasTools) {
        if (toolContent.includes(tool)) {
          // Check if it creates new conversations/sessions (BAD)
          const toolSection = this.extractToolSection(toolContent, tool);
          if (toolSection.includes('createNewConversation') || 
              toolSection.includes('newConversation') ||
              toolSection.includes('sessionId:') && !toolSection.includes('request.sessionId')) {
            wrongSessionCreation = true;
            issues.push(`${tool} appears to create new session instead of using current one`);
          }
        }
      }
      
      // Check NeuraPlayAssistantLite canvas activation
      const litePath = 'src/components/NeuraPlayAssistantLite.tsx';
      const liteContent = fs.readFileSync(litePath, 'utf8');
      
      const canvasActivationHandler = this.extractCanvasActivationHandler(liteContent);
      if (canvasActivationHandler.includes('createNewConversation') || 
          canvasActivationHandler.includes('switchToConversation')) {
        issues.push('Canvas activation handler switches sessions instead of staying in current one');
        wrongSessionCreation = true;
      }
      
      if (!wrongSessionCreation && issues.length === 0) {
        this.results.canvasSameSession.passed = true;
        this.log('Canvas tools correctly stay in same session', 'success');
      } else {
        this.results.canvasSameSession.issues = issues;
      }
      
    } catch (error) {
      this.results.canvasSameSession.issues.push(`Error analyzing canvas logic: ${error.message}`);
    }
  }

  // Test 3: Multiple Chat Tabs
  testMultipleChatTabs() {
    this.log('Testing multiple chat tabs functionality...', 'test');
    
    try {
      // Check ConversationService for proper multi-conversation management
      const servicePath = 'src/services/ConversationService.ts';
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      const hasMultiConversationSupport = serviceContent.includes('Map<string, Conversation>') &&
                                         serviceContent.includes('getAllConversations') &&
                                         serviceContent.includes('switchToConversation');
      
      // Check ConversationSidebar for tab rendering
      const sidebarPath = 'src/components/ConversationSidebar.tsx';
      const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
      
      const hasTabRendering = sidebarContent.includes('conversations.map') &&
                             sidebarContent.includes('handleSwitchConversation') &&
                             sidebarContent.includes('activeConversationId');
      
      // Check for state sync issues between components
      const litePath = 'src/components/NeuraPlayAssistantLite.tsx';
      const liteContent = fs.readFileSync(litePath, 'utf8');
      
      const hasProperStateSync = liteContent.includes('handleConversationChange') &&
                                liteContent.includes('setCurrentConversation') &&
                                liteContent.includes('currentConversation.messages');
      
      if (hasMultiConversationSupport && hasTabRendering && hasProperStateSync) {
        this.results.multipleChatTabs.passed = true;
        this.log('Multiple chat tabs infrastructure appears correct', 'success');
      } else {
        if (!hasMultiConversationSupport) this.results.multipleChatTabs.issues.push('ConversationService missing multi-conversation support');
        if (!hasTabRendering) this.results.multipleChatTabs.issues.push('ConversationSidebar missing tab rendering logic');
        if (!hasProperStateSync) this.results.multipleChatTabs.issues.push('NeuraPlayAssistantLite missing proper state sync');
      }
      
      // Check for potential race conditions or duplicate state
      if (liteContent.includes('useEffect') && liteContent.includes('currentConversation')) {
        const effectCount = (liteContent.match(/useEffect.*currentConversation/g) || []).length;
        if (effectCount > 3) {
          this.results.multipleChatTabs.issues.push(`Too many useEffects depending on currentConversation (${effectCount}) - potential state thrashing`);
        }
      }
      
    } catch (error) {
      this.results.multipleChatTabs.issues.push(`Error analyzing chat tabs: ${error.message}`);
    }
  }

  // Test 4: Chat Deletion Persistence
  testDeletionPersistence() {
    this.log('Testing chat deletion persistence...', 'test');
    
    try {
      // Check ConversationService deletion logic
      const servicePath = 'src/services/ConversationService.ts';
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      const deletionMethod = this.extractDeletionMethod(serviceContent);
      
      // Proper deletion should:
      // 1. Remove from Map
      // 2. Save to localStorage 
      // 3. Sync with database (if available)
      // 4. Update UI state
      
      const hasMapDeletion = deletionMethod.includes('conversations.delete');
      const hasLocalStorageSave = deletionMethod.includes('saveToStorage');
      const hasDatabaseSync = serviceContent.includes('debouncedSyncWithDatabase');
      
      // Check for reappearing issue causes
      const issues = [];
      
      // Check for deletion blacklist mechanism
      const hasDeletionBlacklist = serviceContent.includes('deletedConversations') &&
                                   serviceContent.includes('addToDeletedList') &&
                                   serviceContent.includes('loadDeletedList');
      
      // Issue 1: Database sync might reload deleted conversations
      if (serviceContent.includes('loadConversationsFromDatabase') && 
          !serviceContent.includes('deletedConversations.has')) {
        issues.push('Database sync might reload deleted conversations - missing blacklist check');
      }
      
      // Issue 2: LocalStorage corruption recovery might restore conversations  
      if (serviceContent.includes('loadFromStorage') && 
          !serviceContent.includes('deletedConversations.has')) {
        issues.push('localStorage recovery might restore deleted conversations - missing blacklist check');
      }
      
      // Check if blacklist mechanism is implemented
      if (!hasDeletionBlacklist) {
        issues.push('Missing deletion blacklist mechanism');
      }
      
      // Issue 3: ConversationSidebar might not refresh properly after deletion
      const sidebarPath = 'src/components/ConversationSidebar.tsx';
      const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
      
      const sidebarDeletionHandler = this.extractSidebarDeletionHandler(sidebarContent);
      if (!sidebarDeletionHandler.includes('loadConversations') || 
          !sidebarDeletionHandler.includes('setSearchResults([])')) {
        issues.push('ConversationSidebar deletion handler may not refresh properly');
      }
      
      if (hasMapDeletion && hasLocalStorageSave && issues.length === 0) {
        this.results.deletionPersistence.passed = true;
        this.log('Chat deletion logic appears correct', 'success');
      } else {
        if (!hasMapDeletion) issues.push('Missing Map deletion in ConversationService');
        if (!hasLocalStorageSave) issues.push('Missing localStorage save after deletion');
        this.results.deletionPersistence.issues = issues;
      }
      
    } catch (error) {
      this.results.deletionPersistence.issues.push(`Error analyzing deletion logic: ${error.message}`);
    }
  }

  // Helper methods to extract code sections
  extractToolSection(content, toolName) {
    const startIndex = content.indexOf(toolName);
    if (startIndex === -1) return '';
    
    const contextStart = Math.max(0, startIndex - 500);
    const contextEnd = Math.min(content.length, startIndex + 500);
    return content.substring(contextStart, contextEnd);
  }
  
  extractCanvasActivationHandler(content) {
    const startMarker = 'handleCanvasActivation';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    const contextStart = Math.max(0, startIndex - 100);
    const contextEnd = Math.min(content.length, startIndex + 1000);
    return content.substring(contextStart, contextEnd);
  }
  
  extractDeletionMethod(content) {
    const startMarker = 'deleteConversation(';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    // Find the end of the method (next method or class end)
    let braceCount = 0;
    let endIndex = startIndex;
    let inMethod = false;
    
    for (let i = startIndex; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        inMethod = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (inMethod && braceCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    return content.substring(startIndex, endIndex + 1);
  }
  
  extractSidebarDeletionHandler(content) {
    const startMarker = 'handleDeleteConversation';
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    
    const contextStart = Math.max(0, startIndex - 100);
    const contextEnd = Math.min(content.length, startIndex + 2000);
    return content.substring(contextStart, contextEnd);
  }

  // Generate detailed report
  generateReport() {
    this.log('\n=== CHAT STATE MANAGEMENT DIAGNOSTIC REPORT ===', 'test');
    
    const tests = [
      { name: 'Session Transfer (Small → Lite)', result: this.results.sessionTransfer },
      { name: 'Canvas Stays Same Session', result: this.results.canvasSameSession },
      { name: 'Multiple Chat Tabs', result: this.results.multipleChatTabs },
      { name: 'Chat Deletion Persistence', result: this.results.deletionPersistence }
    ];
    
    let passedCount = 0;
    
    tests.forEach(test => {
      if (test.result.passed) {
        this.log(`${test.name}: PASSED`, 'success');
        passedCount++;
      } else {
        this.log(`${test.name}: FAILED`, 'error');
        test.result.issues.forEach(issue => {
          this.log(`  - ${issue}`, 'warning');
        });
      }
    });
    
    this.results.overallHealth = (passedCount / tests.length) * 100;
    
    this.log(`\nOverall Health Score: ${this.results.overallHealth.toFixed(1)}%`, 'info');
    
    if (this.results.overallHealth === 100) {
      this.log('All tests passed! Chat state management is healthy.', 'success');
    } else if (this.results.overallHealth >= 75) {
      this.log('Most systems working, minor issues detected.', 'warning');
    } else {
      this.log('Significant issues detected. Fixes needed.', 'error');
    }
    
    return this.results;
  }

  // Generate fix recommendations
  generateFixRecommendations() {
    this.log('\n=== FIX RECOMMENDATIONS ===', 'test');
    
    const fixes = [];
    
    // Session Transfer Issues
    if (!this.results.sessionTransfer.passed) {
      fixes.push({
        issue: 'Session Transfer',
        fixes: [
          'Ensure AIAssistantSmall generates proper UUID sessionId',
          'Verify openNeuraPlayAssistant event includes sessionId in detail',
          'Check NeuraPlayAssistantLite event listener calls switchToConversation',
          'Remove any duplicate session transfer logic'
        ]
      });
    }
    
    // Canvas Session Issues  
    if (!this.results.canvasSameSession.passed) {
      fixes.push({
        issue: 'Canvas Same Session',
        fixes: [
          'Canvas tools should use request.sessionId, not create new sessions',
          'Remove any createNewConversation calls from canvas activation',
          'Canvas activation should only trigger UI state, not session switching',
          'Verify canvas elements are added to current conversation'
        ]
      });
    }
    
    // Multiple Chat Tabs Issues
    if (!this.results.multipleChatTabs.passed) {
      fixes.push({
        issue: 'Multiple Chat Tabs',
        fixes: [
          'Ensure ConversationService properly manages Map<string, Conversation>',
          'ConversationSidebar should render all conversations as tabs',
          'NeuraPlayAssistantLite should sync currentConversation state properly',
          'Reduce useEffect dependencies to prevent state thrashing'
        ]
      });
    }
    
    // Deletion Persistence Issues
    if (!this.results.deletionPersistence.passed) {
      fixes.push({
        issue: 'Chat Deletion Persistence',
        fixes: [
          'Ensure deleteConversation removes from Map AND saves to localStorage',
          'Prevent database sync from reloading deleted conversations',
          'ConversationSidebar should refresh list after deletion',
          'Clear search results when conversation is deleted',
          'Add deletion timestamp to prevent resurrection from database'
        ]
      });
    }
    
    fixes.forEach(fix => {
      this.log(`\n${fix.issue}:`, 'warning');
      fix.fixes.forEach(recommendation => {
        this.log(`  • ${recommendation}`, 'info');
      });
    });
    
    return fixes;
  }

  // Run all tests
  async run() {
    this.log('Starting comprehensive chat state diagnostics...', 'test');
    
    this.testSessionTransfer();
    this.testCanvasSameSession();
    this.testMultipleChatTabs(); 
    this.testDeletionPersistence();
    
    const results = this.generateReport();
    const fixes = this.generateFixRecommendations();
    
    // Save results to file
    const reportData = {
      timestamp: new Date().toISOString(),
      results,
      fixes,
      summary: {
        totalTests: 4,
        passed: Object.values(results).filter(r => r.passed).length,
        healthScore: results.overallHealth
      }
    };
    
    fs.writeFileSync('chat_state_diagnostic_report.json', JSON.stringify(reportData, null, 2));
    this.log('Diagnostic report saved to chat_state_diagnostic_report.json', 'success');
    
    return reportData;
  }
}

// Run diagnostics if called directly
if (require.main === module) {
  const diagnostics = new ChatStateDiagnostics();
  diagnostics.run().then(results => {
    process.exit(results.summary.healthScore === 100 ? 0 : 1);
  }).catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = ChatStateDiagnostics;
