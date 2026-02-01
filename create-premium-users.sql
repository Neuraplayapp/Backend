-- Create Premium Users with Full Rights
-- These users can set their own password on first login
-- Password field is set to a placeholder that triggers the first-login flow

-- User 1: Nourah (nouthu@msn.com)
INSERT INTO users (
    id, 
    username, 
    email, 
    password, 
    role,
    profile, 
    subscription,
    usage,
    created_at, 
    updated_at, 
    is_verified
) VALUES (
    uuid_generate_v4(),
    'Nourah',
    'nouthu@msn.com',
    'NEEDS_PASSWORD_SETUP',
    'admin',
    '{
        "role": "admin",
        "avatar": "/assets/images/Mascot.png",
        "rank": "Premium Member",
        "xp": 0,
        "stars": 0,
        "permissions": [
            "full_access",
            "user_management",
            "ai_administration",
            "analytics_access",
            "content_moderation"
        ],
        "needsPasswordSetup": true
    }',
    '{"tier": "unlimited", "status": "active"}',
    '{"aiPrompts": {"count": 0, "lastReset": "2025-01-01T00:00:00.000Z", "history": []}, "imageGeneration": {"count": 0, "lastReset": "2025-01-01T00:00:00.000Z", "history": []}}',
    NOW(),
    NOW(),
    true
) ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    profile = EXCLUDED.profile,
    subscription = EXCLUDED.subscription,
    password = 'NEEDS_PASSWORD_SETUP',
    updated_at = NOW(),
    is_verified = true;

-- User 2: Mohammed (m_abulhassan@msn.com)
INSERT INTO users (
    id, 
    username, 
    email, 
    password, 
    role,
    profile, 
    subscription,
    usage,
    created_at, 
    updated_at, 
    is_verified
) VALUES (
    uuid_generate_v4(),
    'Mohammed',
    'm_abulhassan@msn.com',
    'NEEDS_PASSWORD_SETUP',
    'admin',
    '{
        "role": "admin",
        "avatar": "/assets/images/Mascot.png",
        "rank": "Premium Member",
        "xp": 0,
        "stars": 0,
        "permissions": [
            "full_access",
            "user_management",
            "ai_administration",
            "analytics_access",
            "content_moderation"
        ],
        "needsPasswordSetup": true
    }',
    '{"tier": "unlimited", "status": "active"}',
    '{"aiPrompts": {"count": 0, "lastReset": "2025-01-01T00:00:00.000Z", "history": []}, "imageGeneration": {"count": 0, "lastReset": "2025-01-01T00:00:00.000Z", "history": []}}',
    NOW(),
    NOW(),
    true
) ON CONFLICT (email) DO UPDATE SET 
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    profile = EXCLUDED.profile,
    subscription = EXCLUDED.subscription,
    password = 'NEEDS_PASSWORD_SETUP',
    updated_at = NOW(),
    is_verified = true;

-- User 3: Ahmed (Uncle_Ahmed)
INSERT INTO users (
    id, 
    username, 
    email, 
    password, 
    role,
    profile, 
    subscription,
    usage,
    created_at, 
    updated_at, 
    is_verified
) VALUES (
    uuid_generate_v4(),
    'Uncle_Ahmed',
    'uncle_ahmed@neuraplay.user',
    'NEEDS_PASSWORD_SETUP',
    'admin',
    '{
        "role": "admin",
        "displayName": "Ahmed",
        "avatar": "/assets/images/Mascot.png",
        "rank": "Premium Member",
        "xp": 0,
        "stars": 0,
        "permissions": [
            "full_access",
            "user_management",
            "ai_administration",
            "analytics_access",
            "content_moderation"
        ],
        "needsPasswordSetup": true
    }',
    '{"tier": "unlimited", "status": "active"}',
    '{"aiPrompts": {"count": 0, "lastReset": "2025-01-01T00:00:00.000Z", "history": []}, "imageGeneration": {"count": 0, "lastReset": "2025-01-01T00:00:00.000Z", "history": []}}',
    NOW(),
    NOW(),
    true
) ON CONFLICT (username) DO UPDATE SET 
    role = EXCLUDED.role,
    profile = EXCLUDED.profile,
    subscription = EXCLUDED.subscription,
    password = 'NEEDS_PASSWORD_SETUP',
    updated_at = NOW(),
    is_verified = true;

-- Verify users were created
SELECT id, username, email, role, subscription->>'tier' as tier, is_verified, 
       profile->>'needsPasswordSetup' as needs_password_setup
FROM users 
WHERE email IN ('nouthu@msn.com', 'm_abulhassan@msn.com') 
   OR username = 'Uncle_Ahmed';

