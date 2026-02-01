// Session Service - Session lifecycle management
const dbManager = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  
  async getUserSessions(userId, options = {}) {
    const { limit = 20, offset = 0, status } = options;
    
    try {
      const filters = { user_id: userId };
      if (status) filters.phase = status;
      
      const sessions = await dbManager.getWarmData('agent_sessions', filters);
      
      // Apply pagination
      const paginatedSessions = sessions.slice(offset, offset + limit);
      
      return paginatedSessions.map(session => ({
        id: session.id,
        phase: session.phase,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        expiresAt: session.expires_at,
        stateChanges: session.state_history?.length || 0,
        summary: this.generateSessionSummary(session)
      }));
      
    } catch (error) {
      console.error('❌ Get user sessions error:', error);
      throw error;
    }
  }

  async bulkCloseSessions(sessionIds, userId) {
    const results = { closed: [], failed: [] };
    
    for (const sessionId of sessionIds) {
      try {
        const session = await dbManager.getSession(sessionId);
        
        if (!session) {
          results.failed.push({ sessionId, reason: 'Session not found' });
          continue;
        }
        
        if (session.user_id !== userId) {
          results.failed.push({ sessionId, reason: 'Access denied' });
          continue;
        }
        
        if (session.phase === 'CLOSED') {
          results.failed.push({ sessionId, reason: 'Already closed' });
          continue;
        }
        
        // Update session to closed state
        const updatedSession = {
          ...session,
          phase: 'CLOSED',
          state: {
            ...session.state,
            phase: 'CLOSED',
            closedAt: new Date(),
            closedBy: 'bulk_operation'
          },
          updated_at: new Date()
        };
        
        await dbManager.saveSession(updatedSession);
        
        // Remove from hot cache
        await dbManager.deleteHotData(`session:${sessionId}`);
        
        results.closed.push(sessionId);
        
      } catch (error) {
        console.error(`❌ Failed to close session ${sessionId}:`, error);
        results.failed.push({ sessionId, reason: error.message });
      }
    }
    
    return results;
  }

  async getActiveSessionStats(userId) {
    try {
      const allSessions = await dbManager.getWarmData('agent_sessions', { 
        user_id: userId 
      });
      
      const now = new Date();
      const activeSessions = allSessions.filter(session => {
        return session.phase !== 'CLOSED' && 
               session.phase !== 'COMPLETED' &&
               new Date(session.expires_at) > now;
      });
      
      const stats = {
        total: allSessions.length,
        active: activeSessions.length,
        byPhase: activeSessions.reduce((acc, session) => {
          acc[session.phase] = (acc[session.phase] || 0) + 1;
          return acc;
        }, {}),
        oldestActive: activeSessions.length > 0 
          ? Math.min(...activeSessions.map(s => new Date(s.created_at).getTime()))
          : null,
        newestActive: activeSessions.length > 0
          ? Math.max(...activeSessions.map(s => new Date(s.created_at).getTime()))
          : null,
        sessions: activeSessions.map(session => ({
          id: session.id,
          phase: session.phase,
          createdAt: session.created_at,
          lastActivity: session.updated_at
        }))
      };
      
      return stats;
      
    } catch (error) {
      console.error('❌ Get active session stats error:', error);
      throw error;
    }
  }

  async archiveSession(sessionId, userId) {
    try {
      const session = await dbManager.getSession(sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }
      
      if (session.user_id !== userId) {
        throw new Error('Access denied');
      }
      
      if (session.phase === 'EXECUTING') {
        throw new Error('Cannot archive session that is currently executing');
      }
      
      // Move to archive (in production, this would move to cold storage)
      const archivedSession = {
        ...session,
        phase: 'ARCHIVED',
        archived_at: new Date(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
      };
      
      await dbManager.saveSession(archivedSession);
      
      // Remove from hot cache
      await dbManager.deleteHotData(`session:${sessionId}`);
      
      console.log(`📦 Session ${sessionId} archived`);
      
    } catch (error) {
      console.error('❌ Archive session error:', error);
      throw error;
    }
  }

  async getUserSessionAnalytics(userId, timeRange) {
    try {
      const timeRangeMs = this.parseTimeRange(timeRange);
      const cutoffDate = new Date(Date.now() - timeRangeMs);
      
      const sessions = await dbManager.getWarmData('agent_sessions', { 
        user_id: userId 
      });
      
      const recentSessions = sessions.filter(session => 
        new Date(session.created_at) >= cutoffDate
      );
      
      const analytics = {
        timeRange,
        period: {
          start: cutoffDate.toISOString(),
          end: new Date().toISOString()
        },
        summary: {
          totalSessions: recentSessions.length,
          completedSessions: recentSessions.filter(s => s.phase === 'COMPLETED').length,
          failedSessions: recentSessions.filter(s => s.phase === 'ERROR').length,
          activeTime: this.calculateActiveTime(recentSessions),
          avgSessionDuration: this.calculateAvgDuration(recentSessions)
        },
        trends: {
          byDay: this.groupSessionsByDay(recentSessions),
          byPhase: this.groupSessionsByPhase(recentSessions),
          successRate: this.calculateSuccessRate(recentSessions)
        },
        toolUsage: await this.getToolUsageForSessions(recentSessions.map(s => s.id))
      };
      
      return analytics;
      
    } catch (error) {
      console.error('❌ Session analytics error:', error);
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    try {
      const now = new Date();
      
      // Find expired sessions
      const allSessions = await dbManager.getWarmData('agent_sessions', {});
      const expiredSessions = allSessions.filter(session => 
        new Date(session.expires_at) < now
      );
      
      console.log(`🧹 Found ${expiredSessions.length} expired sessions to cleanup`);
      
      for (const session of expiredSessions) {
        // Archive or delete based on phase
        if (session.phase === 'COMPLETED' || session.phase === 'ERROR') {
          // Move to archive
          await this.archiveSession(session.id, session.user_id);
        } else {
          // Force close active sessions
          await dbManager.saveSession({
            ...session,
            phase: 'EXPIRED',
            updated_at: now
          });
        }
        
        // Remove from hot cache
        await dbManager.deleteHotData(`session:${session.id}`);
      }
      
      return expiredSessions.length;
      
    } catch (error) {
      console.error('❌ Cleanup expired sessions error:', error);
      throw error;
    }
  }

  // Helper methods
  generateSessionSummary(session) {
    const duration = session.updated_at 
      ? new Date(session.updated_at).getTime() - new Date(session.created_at).getTime()
      : 0;
    
    return {
      duration: Math.round(duration / 1000), // seconds
      stateChanges: session.state_history?.length || 0,
      lastPhase: session.phase,
      hasErrors: session.state?.errors?.length > 0
    };
  }

  parseTimeRange(timeRange) {
    const units = {
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000,
      'w': 7 * 24 * 60 * 60 * 1000,
      'm': 30 * 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 24h
    
    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }

  calculateActiveTime(sessions) {
    return sessions.reduce((total, session) => {
      if (session.phase === 'EXECUTING' || session.phase === 'PLANNING') {
        const start = new Date(session.created_at).getTime();
        const end = session.updated_at 
          ? new Date(session.updated_at).getTime() 
          : Date.now();
        return total + (end - start);
      }
      return total;
    }, 0);
  }

  calculateAvgDuration(sessions) {
    if (sessions.length === 0) return 0;
    
    const completedSessions = sessions.filter(s => 
      s.phase === 'COMPLETED' || s.phase === 'ERROR'
    );
    
    if (completedSessions.length === 0) return 0;
    
    const totalDuration = completedSessions.reduce((total, session) => {
      const duration = new Date(session.updated_at).getTime() - 
                      new Date(session.created_at).getTime();
      return total + duration;
    }, 0);
    
    return Math.round(totalDuration / completedSessions.length);
  }

  groupSessionsByDay(sessions) {
    const grouped = {};
    sessions.forEach(session => {
      const day = new Date(session.created_at).toISOString().split('T')[0];
      grouped[day] = (grouped[day] || 0) + 1;
    });
    return grouped;
  }

  groupSessionsByPhase(sessions) {
    return sessions.reduce((acc, session) => {
      acc[session.phase] = (acc[session.phase] || 0) + 1;
      return acc;
    }, {});
  }

  calculateSuccessRate(sessions) {
    if (sessions.length === 0) return 0;
    const successful = sessions.filter(s => s.phase === 'COMPLETED').length;
    return Math.round((successful / sessions.length) * 100);
  }

  async getToolUsageForSessions(sessionIds) {
    try {
      const toolExecutions = await dbManager.getWarmData('tool_executions', {
        session_id: sessionIds
      });
      
      return toolExecutions.reduce((acc, execution) => {
        acc[execution.tool_name] = (acc[execution.tool_name] || 0) + 1;
        return acc;
      }, {});
      
    } catch (error) {
      console.error('❌ Get tool usage error:', error);
      return {};
    }
  }
}

module.exports = new SessionService();
