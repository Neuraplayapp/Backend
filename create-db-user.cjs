/**
 * 👤 UNIVERSAL DATABASE USER CREATION SCRIPT
 * Creates PostgreSQL users with configurable privileges
 * 
 * Usage:
 *   node create-db-user.cjs <username> <password> [privileges]
 * 
 * Examples:
 *   node create-db-user.cjs AdminUncle AdminUncle superuser
 *   node create-db-user.cjs myuser mypass standard
 *   node create-db-user.cjs readonly readpass readonly
 * 
 * Privilege Levels:
 *   - superuser: Full database superuser privileges
 *   - admin: Database creation and role management
 *   - standard: Read/write access to all tables (default)
 *   - readonly: Read-only access to all tables
 */

const { Pool } = require('pg');

// Parse connection string or use individual components
const connectionConfig = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false }
  : {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '1332',
      database: process.env.POSTGRES_DATABASE || 'neuraplay',
      ssl: false
    };

const pool = new Pool(connectionConfig);

async function createDatabaseUser(username, password, privilegeLevel = 'standard') {
  console.log(`👤 Creating database user: ${username}`);
  console.log(`🔐 Privilege level: ${privilegeLevel}\n`);
  
  const client = await pool.connect();
  
  try {
    // Check if user already exists
    const checkUserQuery = `
      SELECT usename, usesuper, usecreatedb, usecreaterole 
      FROM pg_user 
      WHERE usename = $1;
    `;
    
    const existingUser = await client.query(checkUserQuery, [username]);
    
    const userExists = existingUser.rows.length > 0;
    
    if (userExists) {
      console.log(`⚠️  User "${username}" already exists`);
      console.log(existingUser.rows[0]);
      console.log('\n🔄 Updating password and privileges...\n');
      
      // Update password
      await client.query(`ALTER USER "${username}" WITH PASSWORD $1;`, [password]);
    } else {
      // Create new user
      console.log(`📝 Creating new user "${username}"...\n`);
      await client.query(`CREATE USER "${username}" WITH PASSWORD $1;`, [password]);
    }
    
    // Apply privilege level
    switch (privilegeLevel.toLowerCase()) {
      case 'superuser':
        console.log('🔑 Applying SUPERUSER privileges...');
        await client.query(`ALTER USER "${username}" WITH SUPERUSER;`);
        await client.query(`ALTER USER "${username}" WITH CREATEDB;`);
        await client.query(`ALTER USER "${username}" WITH CREATEROLE;`);
        await client.query(`ALTER USER "${username}" WITH REPLICATION;`);
        break;
        
      case 'admin':
        console.log('🔑 Applying ADMIN privileges...');
        await client.query(`ALTER USER "${username}" WITH NOSUPERUSER;`);
        await client.query(`ALTER USER "${username}" WITH CREATEDB;`);
        await client.query(`ALTER USER "${username}" WITH CREATEROLE;`);
        await client.query(`ALTER USER "${username}" WITH NOREPLICATION;`);
        break;
        
      case 'readonly':
        console.log('🔑 Applying READ-ONLY privileges...');
        await client.query(`ALTER USER "${username}" WITH NOSUPERUSER;`);
        await client.query(`ALTER USER "${username}" WITH NOCREATEDB;`);
        await client.query(`ALTER USER "${username}" WITH NOCREATEROLE;`);
        await client.query(`ALTER USER "${username}" WITH NOREPLICATION;`);
        break;
        
      case 'standard':
      default:
        console.log('🔑 Applying STANDARD privileges...');
        await client.query(`ALTER USER "${username}" WITH NOSUPERUSER;`);
        await client.query(`ALTER USER "${username}" WITH NOCREATEDB;`);
        await client.query(`ALTER USER "${username}" WITH NOCREATEROLE;`);
        await client.query(`ALTER USER "${username}" WITH NOREPLICATION;`);
        break;
    }
    
    // Grant database-level privileges
    const dbName = client.database || 'neuraplay';
    console.log(`\n📚 Granting privileges on database: ${dbName}`);
    
    if (privilegeLevel.toLowerCase() === 'readonly') {
      // Read-only: CONNECT only
      await client.query(`GRANT CONNECT ON DATABASE ${dbName} TO "${username}";`);
      await client.query(`GRANT USAGE ON SCHEMA public TO "${username}";`);
      await client.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${username}";`);
      await client.query(`GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "${username}";`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "${username}";`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO "${username}";`);
    } else {
      // Standard, admin, or superuser: Full or near-full access
      await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO "${username}";`);
      await client.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${username}";`);
      await client.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${username}";`);
      await client.query(`GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "${username}";`);
      await client.query(`GRANT USAGE ON SCHEMA public TO "${username}";`);
      
      // Grant default privileges for future objects
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${username}";`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${username}";`);
      await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "${username}";`);
    }
    
    // Verify user privileges
    const verifyQuery = `
      SELECT 
        usename as username,
        usesuper as is_superuser,
        usecreatedb as can_create_db,
        usecreaterole as can_create_role
      FROM pg_user 
      WHERE usename = $1;
    `;
    
    const userInfo = await client.query(verifyQuery, [username]);
    
    console.log('\n✅ Database User Created Successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:        ', username);
    console.log('Password:        ', password);
    console.log('Privilege Level: ', privilegeLevel);
    console.log('Superuser:       ', userInfo.rows[0].is_superuser);
    console.log('Can Create DB:   ', userInfo.rows[0].can_create_db);
    console.log('Can Create Role: ', userInfo.rows[0].can_create_role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🎯 Connection String Examples:');
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com')) {
      const renderHost = 'dpg-d29kqv2li9vc73frta6g-a.oregon-postgres.render.com';
      const renderDb = 'neuraplay_database';
      console.log(`   postgresql://${username}:${password}@${renderHost}/${renderDb}`);
    }
    console.log(`   postgresql://${username}:${password}@localhost:5432/neuraplay`);
    
    console.log(`\n🚀 User "${username}" is ready with ${privilegeLevel} access!`);
    
    return userInfo.rows[0];
    
  } catch (error) {
    console.error(`❌ Error creating user "${username}":`, error.message);
    console.error('\nDetails:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('❌ Missing required arguments\n');
    console.log('Usage: node create-db-user.cjs <username> <password> [privileges]\n');
    console.log('Examples:');
    console.log('  node create-db-user.cjs AdminUncle AdminUncle superuser');
    console.log('  node create-db-user.cjs myuser mypass standard');
    console.log('  node create-db-user.cjs readonly readpass readonly\n');
    console.log('Privilege Levels:');
    console.log('  - superuser: Full database superuser privileges');
    console.log('  - admin: Database creation and role management');
    console.log('  - standard: Read/write access to all tables (default)');
    console.log('  - readonly: Read-only access to all tables');
    process.exit(1);
  }
  
  const [username, password, privilegeLevel = 'standard'] = args;
  
  (async () => {
    try {
      await createDatabaseUser(username, password, privilegeLevel);
    } catch (error) {
      console.error('\n❌ Failed to create database user');
      process.exit(1);
    } finally {
      await pool.end();
      process.exit(0);
    }
  })();
}

module.exports = { createDatabaseUser };

