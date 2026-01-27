import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Database file path - use relative path instead of dynamic path resolution
const DB_PATH = './data/caminhar.db';

let db = null;

/**
 * Initialize the database connection
 */
export async function initializeDatabase() {
  try {
    // Open database connection
    db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database
    });

    console.log('Database connection established');

    // Create tables if they don't exist
    await createTables();

    // Initialize with default data if needed
    await initializeDefaultData();

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Create database tables
 */
async function createTables() {
  try {
    // Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create settings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create images table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INTEGER,
        FOREIGN KEY (uploaded_by) REFERENCES users(id)
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

/**
 * Initialize default data
 */
async function initializeDefaultData() {
  try {
    // Check if admin user exists
    const adminUser = await db.get('SELECT * FROM users WHERE username = ?', ['admin']);

    if (!adminUser) {
      // Create default admin user
      const hashedPassword = await hashPassword('password');
      await db.run(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      console.log('Default admin user created');
    }

    // Check if basic settings exist
    const titleSetting = await db.get('SELECT * FROM settings WHERE key = ?', ['site_title']);
    if (!titleSetting) {
      await db.run(
        'INSERT INTO settings (key, value, type, description) VALUES (?, ?, ?, ?)',
        ['site_title', 'O Caminhar com Deus', 'string', 'Website title']
      );
    }

    const subtitleSetting = await db.get('SELECT * FROM settings WHERE key = ?', ['site_subtitle']);
    if (!subtitleSetting) {
      await db.run(
        'INSERT INTO settings (key, value, type, description) VALUES (?, ?, ?, ?)',
        ['site_subtitle', 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã', 'string', 'Website subtitle']
      );
    }

    console.log('Default settings initialized');
  } catch (error) {
    console.error('Error initializing default data:', error);
    throw error;
  }
}

/**
 * Get database connection - automatically initializes if needed
 */
export async function getDatabase() {
  if (!db) {
    await initializeDatabase();
  }
  return db;
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  // Import bcryptjs dynamically to avoid issues with SQLite initialization
  const bcrypt = await import('bcryptjs');
  const SALT_ROUNDS = 10;
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Settings CRUD Operations
 */
export async function getSetting(key) {
  try {
    const database = await getDatabase();
    const setting = await database.get('SELECT * FROM settings WHERE key = ?', [key]);
    return setting ? setting.value : null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    throw error;
  }
}

export async function setSetting(key, value, type = 'string', description = '') {
  try {
    const database = await getDatabase();
    const existing = await database.get('SELECT * FROM settings WHERE key = ?', [key]);

    if (existing) {
      await database.run(
        'UPDATE settings SET value = ?, type = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
        [value, type, description, key]
      );
    } else {
      await database.run(
        'INSERT INTO settings (key, value, type, description) VALUES (?, ?, ?, ?)',
        [key, value, type, description]
      );
    }

    return value;
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
}

export async function getAllSettings() {
  try {
    const database = await getDatabase();
    const settings = await database.all('SELECT * FROM settings');
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error getting all settings:', error);
    throw error;
  }
}

/**
 * User CRUD Operations
 */
export async function getUserByUsername(username) {
  try {
    const database = await getDatabase();
    return await database.get('SELECT * FROM users WHERE username = ?', [username]);
  } catch (error) {
    console.error(`Error getting user ${username}:`, error);
    throw error;
  }
}

export async function createUser(username, password, role = 'user') {
  try {
    const database = await getDatabase();
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    await database.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
    );

    return await getUserByUsername(username);
  } catch (error) {
    console.error(`Error creating user ${username}:`, error);
    throw error;
  }
}

/**
 * Image CRUD Operations
 */
export async function saveImage(filename, filePath, type, size, uploadedBy = null) {
  try {
    const database = await getDatabase();
    await database.run(
      'INSERT INTO images (filename, path, type, size, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [filename, filePath, type, size, uploadedBy]
    );
    return await database.get('SELECT * FROM images WHERE filename = ? ORDER BY id DESC LIMIT 1', [filename]);
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

export async function getLatestImage() {
  try {
    const database = await getDatabase();
    return await database.get('SELECT * FROM images ORDER BY uploaded_at DESC LIMIT 1');
  } catch (error) {
    console.error('Error getting latest image:', error);
    throw error;
  }
}

export async function getAllImages() {
  try {
    const database = await getDatabase();
    return await database.all('SELECT * FROM images ORDER BY uploaded_at DESC');
  } catch (error) {
    console.error('Error getting all images:', error);
    throw error;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (db) {
    await db.close();
    db = null;
    console.log('Database connection closed');
  }
}