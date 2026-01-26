import { initializeAuth } from './auth.js';
import { closeDatabase } from './db.js';

/**
 * Initialize server - set up database and authentication
 */
export async function initializeServer() {
  try {
    console.log('Initializing server...');

    // Initialize authentication system (which also initializes database)
    await initializeAuth();

    console.log('Server initialization completed successfully');
  } catch (error) {
    console.error('Failed to initialize server:', error);
    throw error;
  }
}

/**
 * Cleanup server resources
 */
export async function cleanupServer() {
  try {
    console.log('Cleaning up server resources...');
    await closeDatabase();
    console.log('Server cleanup completed');
  } catch (error) {
    console.error('Error during server cleanup:', error);
  }
}