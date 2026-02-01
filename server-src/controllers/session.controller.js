// Session Controller - Dedicated session management
const sessionService = require('../services/session.service');
const { validationResult } = require('express-validator');

class SessionController {
  
  /**
   * GET /api/sessions
   * Get all sessions for a user
   */
  async getUserSessions(req, res) {
    try {
      const { userId } = req.user;
      const { limit = 20, offset = 0, status } = req.query;
      
      const sessions = await sessionService.getUserSessions(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status
      });
      
      res.json({
        success: true,
        data: {
          sessions,
          count: sessions.length,
          userId
        },
        metadata: {
          timestamp: new Date().toISOString(),
          pagination: { limit, offset }
        }
      });
      
    } catch (error) {
      console.error('❌ Get user sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get sessions'
      });
    }
  }

  /**
   * POST /api/sessions/bulk-close
   * Close multiple sessions
   */
  async bulkCloseSessions(req, res) {
    try {
      const { sessionIds } = req.body;
      const { userId } = req.user;
      
      const results = await sessionService.bulkCloseSessions(sessionIds, userId);
      
      res.json({
        success: true,
        data: {
          closed: results.closed,
          failed: results.failed,
          total: sessionIds.length
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'bulk_close'
        }
      });
      
    } catch (error) {
      console.error('❌ Bulk close sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to close sessions'
      });
    }
  }

  /**
   * GET /api/sessions/active
   * Get active session count and details
   */
  async getActiveSessions(req, res) {
    try {
      const { userId } = req.user;
      
      const activeData = await sessionService.getActiveSessionStats(userId);
      
      res.json({
        success: true,
        data: activeData,
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'active_sessions'
        }
      });
      
    } catch (error) {
      console.error('❌ Get active sessions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get active sessions'
      });
    }
  }

  /**
   * POST /api/sessions/:sessionId/archive
   * Archive a completed session
   */
  async archiveSession(req, res) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.user;
      
      await sessionService.archiveSession(sessionId, userId);
      
      res.json({
        success: true,
        data: {
          sessionId,
          status: 'archived'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          action: 'session_archived'
        }
      });
      
    } catch (error) {
      console.error('❌ Archive session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to archive session'
      });
    }
  }

  /**
   * GET /api/sessions/analytics
   * Get session analytics for user
   */
  async getSessionAnalytics(req, res) {
    try {
      const { userId } = req.user;
      const { timeRange = '7d' } = req.query;
      
      const analytics = await sessionService.getUserSessionAnalytics(userId, timeRange);
      
      res.json({
        success: true,
        data: analytics,
        metadata: {
          timestamp: new Date().toISOString(),
          timeRange,
          userId
        }
      });
      
    } catch (error) {
      console.error('❌ Session analytics error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session analytics'
      });
    }
  }
}

module.exports = new SessionController();
