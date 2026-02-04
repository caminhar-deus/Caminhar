/**
 * Next.js Instrumentation File
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This file runs at server startup. We use it to initialize server-side components
 * like the database connection and authentication system.
 */

export async function register() {
  // We must only run server-side initializations in the 'nodejs' runtime.
  // The 'edge' runtime does not support Node.js APIs like 'crypto' or 'pg'.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      console.log('Next.js instrumentation: Initializing server for Node.js runtime...');
      const { initializeServer } = await import('./lib/init-server.js');
      await initializeServer();
      console.log('Next.js instrumentation: Server initialized successfully.');
    } catch (error) {
      console.error('Next.js instrumentation: Failed to initialize server:', error);
    }
  }
}