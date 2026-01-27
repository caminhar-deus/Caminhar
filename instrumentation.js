/**
 * Next.js 16 Instrumentation File
 * This runs at server startup and initializes the database and authentication system
 * 
 * IMPORTANT: This file should not import heavy Node.js modules to avoid Edge Runtime warnings.
 * The actual initialization is done in a separate module to prevent import issues.
 */

export async function register() {
  try {
    console.log('Next.js instrumentation: Initializing server...');
    
    // Import and initialize server only when needed to avoid Edge Runtime issues
    const { initializeServer } = await import('./lib/init-server.js');
    await initializeServer();
    
    console.log('Next.js instrumentation: Server initialized successfully');
  } catch (error) {
    console.error('Next.js instrumentation: Failed to initialize server:', error);
    // Don't throw to prevent Next.js from failing to start
  }
}
