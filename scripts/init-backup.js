import { initializeBackupSystem, startBackupScheduler } from './backup.js';

/**
 * Initialize and start the backup system
 */
async function main() {
  try {
    console.log('Starting Caminhar Database Backup System...');

    // Initialize backup system (creates first backup)
    await initializeBackupSystem();

    // Start automated backup scheduler
    startBackupScheduler();

    console.log('Backup system is now running with automated scheduling.');
    console.log('You can manually create backups by calling createBackup() from lib/backup.js');
  } catch (error) {
    console.error('Failed to start backup system:', error);
    process.exit(1);
  }
}

// Run the initialization
main().catch(error => {
  console.error('Unhandled error in backup initialization:', error);
  process.exit(1);
});