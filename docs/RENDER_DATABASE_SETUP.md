# Render Database Setup Guide for NeuraPlay

## Overview

This guide will help you set up a PostgreSQL database on Render and integrate it with your NeuraPlay AI platform for comprehensive data collection and analytics.

## 🗄️ Database Setup on Render

### Step 1: Create PostgreSQL Database on Render

1. **Log into Render Dashboard**
   - Go to [render.com](https://render.com)
   - Sign in to your account

2. **Create New PostgreSQL Service**
   - Click "New +" button
   - Select "PostgreSQL"
   - Choose your region (closest to your users)
   - Select plan:
     - **Free**: 1GB storage, 90 days (for testing)
     - **Starter**: $7/month, 1GB storage (recommended)
     - **Standard**: $20/month, 10GB storage (for production)

3. **Configure Database**
   - **Name**: `neuraplay-db` (or your preferred name)
   - **Database**: `neuraplay`
   - **User**: `neuraplay_user`
   - **Password**: Generate a strong password

4. **Get Connection Details**
   - After creation, note the:
     - **Internal Database URL**: `postgresql://neuraplay_user:password@host:port/neuraplay`
     - **External Database URL**: For local development

### Step 2: Environment Variables Setup

Add these environment variables to your Render service:

```bash
# Database Configuration
RENDER_POSTGRES_URL=postgresql://neuraplay_user:password@host:port/neuraplay

# Optional: Redis for caching (if you add Redis service)
RENDER_REDIS_URL=redis://username:password@host:port

# Existing variables (keep these)
together_token=your_together_ai_token
hf_token=your_huggingface_token
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_key
VITE_BRIDGE_SERVICE_URL=your_bridge_service_url
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
Serper_api=your_serper_api_key
WEATHER_API=your_weather_api_key
```

### Step 3: Database Schema

The database will automatically create these tables on startup:

#### Users Table
```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  profile JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Analytics Table
```sql
CREATE TABLE analytics (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255),
  user_agent TEXT,
  platform VARCHAR(100),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Posts Table
```sql
CREATE TABLE posts (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  channel VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  replies JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Conversations Table
```sql
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  messages JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### AI Logs Table
```sql
CREATE TABLE ai_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  interaction_type VARCHAR(100) NOT NULL,
  input TEXT,
  output TEXT,
  tools_used JSONB DEFAULT '[]',
  response_time INTEGER,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔧 Integration with Existing Code

### 1. Database Service Integration

The `DatabaseService` class provides:
- **Hybrid Storage**: Local IndexedDB + Remote PostgreSQL
- **Offline Support**: Works without internet connection
- **Automatic Sync**: Syncs local data when online
- **Type Safety**: Full TypeScript support

### 2. Data Collection Service

The `DataCollectionService` provides:
- **Game Analytics**: Track game sessions, scores, progress
- **AI Interactions**: Log all AI conversations and tool usage
- **User Behavior**: Navigation, errors, achievements
- **Learning Analytics**: Educational progress tracking
- **Accessibility**: Track accessibility feature usage

### 3. Usage Examples

#### Initialize in UserContext
```typescript
import { dataCollectionService } from '../services/DataCollectionService';

// In UserContext.tsx
useEffect(() => {
  if (user?.id) {
    dataCollectionService.setUserId(user.id);
  }
}, [user?.id]);
```

#### Log Game Session
```typescript
// In any game component
await dataCollectionService.logGameSession('memory-game', {
  score: 1500,
  level: 3,
  starsEarned: 2,
  xpEarned: 150,
  playTime: 300, // seconds
  success: true,
  moves: 25,
  errors: 2,
  completionRate: 0.92
});
```

#### Log AI Interaction
```typescript
// In AIAssistant.tsx
await dataCollectionService.logAIInteraction({
  interactionType: 'tool_call',
  input: 'What\'s the weather in New York?',
  output: 'The weather in New York is 72°F and sunny.',
  toolsUsed: ['get_weather'],
  responseTime: 1200 // milliseconds
});
```

#### Log Navigation
```typescript
// In navigation components
await dataCollectionService.logNavigation('dashboard', 'home');
```

## 📊 Analytics Dashboard

### Available Analytics

1. **Game Analytics**
   - Session duration and frequency
   - Score progression and achievements
   - Game completion rates
   - Error tracking and debugging

2. **AI Interaction Analytics**
   - Tool usage patterns
   - Response times and performance
   - User satisfaction metrics
   - Conversation flow analysis

3. **User Behavior Analytics**
   - Navigation patterns
   - Feature usage statistics
   - Accessibility adoption
   - Learning progress tracking

4. **Performance Analytics**
   - Page load times
   - Error rates and types
   - Platform and device statistics
   - Session duration analysis

### Query Examples

#### Get User's Game Progress
```sql
SELECT 
  u.username,
  u.profile->>'level' as user_level,
  u.profile->>'xp' as total_xp,
  COUNT(a.id) as total_sessions,
  AVG(a.event_data->>'score') as avg_score
FROM users u
LEFT JOIN analytics a ON u.id = a.user_id 
  AND a.event_type = 'game_session'
WHERE u.id = 'user_id'
GROUP BY u.id, u.username, u.profile;
```

#### Get Popular Games
```sql
SELECT 
  a.event_data->>'gameId' as game_id,
  COUNT(*) as play_count,
  AVG((a.event_data->>'score')::int) as avg_score
FROM analytics a
WHERE a.event_type = 'game_session'
GROUP BY a.event_data->>'gameId'
ORDER BY play_count DESC
LIMIT 10;
```

#### Get AI Tool Usage
```sql
SELECT 
  interaction_type,
  COUNT(*) as usage_count,
  AVG(response_time) as avg_response_time
FROM ai_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY interaction_type
ORDER BY usage_count DESC;
```

## 🔒 Security Considerations

### 1. Data Privacy
- All user data is encrypted in transit
- Personal information is stored securely
- GDPR compliance considerations
- User consent for data collection

### 2. Access Control
- Database access is restricted to your application
- Connection strings are environment variables
- No direct database access from client

### 3. Backup Strategy
- Render provides automatic backups
- Consider additional backup solutions
- Test restore procedures regularly

## 🚀 Deployment Checklist

### Before Deployment
- [ ] PostgreSQL database created on Render
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Local development working

### After Deployment
- [ ] Database tables created successfully
- [ ] Health check endpoint responding
- [ ] Data collection working
- [ ] Analytics dashboard accessible

### Monitoring
- [ ] Set up database monitoring
- [ ] Configure error alerts
- [ ] Monitor performance metrics
- [ ] Track data growth

## 🛠️ Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check `RENDER_POSTGRES_URL` environment variable
   - Verify database is running on Render
   - Check network connectivity

2. **Tables Not Created**
   - Check server logs for initialization errors
   - Verify PostgreSQL permissions
   - Restart the application

3. **Data Not Syncing**
   - Check internet connectivity
   - Verify API endpoints are working
   - Check browser console for errors

4. **Performance Issues**
   - Monitor database query performance
   - Consider adding indexes
   - Implement caching strategies

### Debug Commands

```bash
# Check database connection
curl -X GET https://your-app.onrender.com/api/health

# Test database API
curl -X POST https://your-app.onrender.com/api/database \
  -H "Content-Type: application/json" \
  -d '{"action":"get","collection":"users"}'
```

## 📈 Scaling Considerations

### Database Scaling
- **Free Plan**: 1GB storage, 90 days
- **Starter Plan**: 1GB storage, $7/month
- **Standard Plan**: 10GB storage, $20/month
- **Pro Plan**: 100GB storage, $100/month

### Performance Optimization
- Add database indexes for frequent queries
- Implement connection pooling
- Use Redis for caching
- Consider read replicas for high traffic

### Cost Optimization
- Monitor data usage
- Archive old data
- Use appropriate plan sizes
- Consider data retention policies

## 🎯 Next Steps

1. **Deploy the updated code** with database integration
2. **Test data collection** with real user interactions
3. **Monitor analytics** to understand user behavior
4. **Optimize performance** based on usage patterns
5. **Implement advanced features** like real-time analytics

This database integration will provide comprehensive insights into user behavior, game performance, and AI interaction patterns, enabling data-driven improvements to the NeuraPlay platform. 