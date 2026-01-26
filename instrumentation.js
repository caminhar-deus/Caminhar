import { initializeServer } from './lib/init-server.js';

/**
 * Next.js 16 Instrumentation File
 * This runs at server startup and initializes the database and authentication system
 */
export async function register() {
  try {
    console.log('Next.js instrumentation: Initializing server...');
    await initializeServer();
    console.log('Next.js instrumentation: Server initialized successfully');
  } catch (error) {
    console.error('Next.js instrumentation: Failed to initialize server:', error);
    // Don't throw to prevent Next.js from failing to start
  }
}