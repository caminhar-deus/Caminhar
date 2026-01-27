# Caminhar Database Backup System

## Overview

This automatic database backup system provides comprehensive backup and restore functionality for the Caminhar application's SQLite database.

## Features

- **Automatic Backups**: Scheduled daily backups at 2 AM
- **Compression**: Backups are compressed to save disk space
- **Backup Rotation**: Maintains up to 10 backup versions
- **Logging**: Detailed backup operation logs
- **Restore Functionality**: Easy database restoration from backups
- **Automatic Scheduling**: Built-in backup scheduler

## Files Created

- `lib/backup.js` - Main backup system implementation
- `lib/init-backup.js` - Backup system initialization script
- `data/backups/` - Backup storage directory
- `data/backups/backup.log` - Backup operation logs

## Usage

### Starting the Backup System

```bash
npm run init-backup
```

This will:
1. Create the backup directory if it doesn't exist
2. Create an initial backup of the database
3. Start the automated backup scheduler

### Manual Backup Creation

```bash
npm run create-backup
```

### Viewing Available Backups

```bash
node -e "import('./lib/backup.js').then(m => m.getAvailableBackups().then(console.log).catch(console.error))"
```

### Restoring from Backup

```bash
node -e "import('./lib/backup.js').then(m => m.restoreBackup('backup_filename.db.gz').then(() => console.log('Restore complete')).catch(console.error))"
```

### Viewing Backup Logs

```bash
node -e "import('./lib/backup.js').then(m => m.getBackupLogs().then(console.log).catch(console.error))"
```

## Configuration

The backup system can be configured by modifying the `BACKUP_CONFIG` object in `lib/backup.js`:

```javascript
const BACKUP_CONFIG = {
  maxBackups: 10, // Maximum number of backups to keep
  backupInterval: '0 2 * * *', // Daily at 2 AM (cron format)
  compressBackups: true, // Whether to compress backups
  backupPrefix: 'caminhar-db-backup'
};
```

## Backup Scheduling

The system uses a cron-like scheduling pattern:
- `0 2 * * *` - Daily at 2 AM
- You can modify this in the `BACKUP_CONFIG.backupInterval` property

## Backup Files

Backup files are stored in `data/backups/` with the naming pattern:
`caminhar-db-backup_YYYY-MM-DD_HH-MM-SS.db.gz`

## Database Restoration

When restoring a database:
1. The current database is backed up as a safety measure
2. The selected backup is decompressed and restored
3. The database connection is automatically re-established

## Monitoring

Check the backup logs regularly:
```bash
cat data/backups/backup.log
```

## Maintenance

- Monitor disk space usage in the backups directory
- Adjust `maxBackups` as needed based on storage capacity
- Test restore functionality periodically

## Troubleshooting

If backups fail:
1. Check the backup log for error messages
2. Ensure sufficient disk space is available
3. Verify database connection is working
4. Check file permissions on the backups directory

## Security

- Backup files contain sensitive database information
- Ensure proper file permissions are set
- Consider encrypting backup files for additional security
<task_progress>
- [x] Analyze current database setup
- [x] Create backup directory structure
- [x] Implement backup script
- [x] Set up automated scheduling
- [x] Test backup functionality
</task_progress>
</write_to_file>