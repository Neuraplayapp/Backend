-- Create permanent admin user: smt@neuraplay.biz
-- User sets their own password on first login (secure - no password in code)

INSERT INTO users (
    id, 
    username, 
    email, 
    password, 
    role,
    profile, 
    created_at, 
    updated_at, 
    is_verified
) VALUES (
    'admin-smt-001',
    'NeuraPlay Admin',
    'smt@neuraplay.biz',
    'NEEDS_PASSWORD_SETUP',
    'admin',
    '{
        "role": "admin",
        "needsPasswordSetup": true,
        "permissions": [
            "full_access",
            "immutable_access", 
            "database_admin",
            "user_management",
            "system_control",
            "ai_administration",
            "analytics_access",
            "content_moderation"
        ],
        "level": 999,
        "xp": 999999,
        "stars": 999999,
        "gameProgress": {
            "completedGames": [],
            "totalScore": 999999,
            "achievements": ["founder", "admin", "god_mode", "neuraplay_creator"]
        },
        "preferences": {
            "theme": "admin",
            "notifications": true,
            "beta_features": true,
            "admin_panel": true,
            "debug_mode": true
        },
        "adminSettings": {
            "canDeleteUsers": true,
            "canModifyDatabase": true,
            "canAccessLogs": true,
            "canControlSystem": true,
            "immutableAccess": true
        }
    }',
    NOW(),
    NOW(),
    true
) ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    password = 'NEEDS_PASSWORD_SETUP',
    profile = EXCLUDED.profile,
    updated_at = NOW(),
    is_verified = true;

-- Verify admin user was created
SELECT id, username, email, profile->>'role' as role, is_verified 
FROM users 
WHERE email = 'smt@neuraplay.biz';
