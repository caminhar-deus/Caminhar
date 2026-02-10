# Caminhar Database Backup System

## Overview

This automatic database backup system provides comprehensive backup and restore functionality for the Caminhar application's **PostgreSQL** database.

## Features

- **Automatic Backups**: Scheduled daily backups at 2 AM
- **Compression**: Backups are compressed to save disk space
- **Backup Rotation**: Maintains up to 10 backup versions
- **Logging**: Detailed backup operation logs
- **Restore Functionality**: Easy database restoration from backups
- **Automatic Scheduling**: Built-in backup scheduler
- **UI Integration**: Complete backup management interface in admin panel
- **Backup Verification**: Automatic verification of backup integrity
- **Error Handling**: Robust error handling and recovery mechanisms

## Files Created

- `lib/backup.js` - Main backup system implementation
- `lib/init-backup.js` - Backup system initialization script
- `lib/restore-backup.js` - Helper script for restoring backups
- `lib/verify-backup.js` - Backup verification system
- `components/AdminBackupManager.js` - UI component for backup management
- `pages/api/admin/backups.js` - API endpoint for backup operations
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
npm run restore-backup caminhar-pg-backup_YYYY-MM-DD_HH-mm-ss.sql.gz
```

### Viewing Backup Logs

```bash
node -e "import('./lib/backup.js').then(m => m.getBackupLogs().then(console.log).catch(console.error))"
```

### Verifying Backup Integrity

```bash
npm run verify-backup caminhar-pg-backup_YYYY-MM-DD_HH-mm-ss.sql.gz
```

## Configuration

The backup system can be configured by modifying the `BACKUP_CONFIG` object in `lib/backup.js`:

```javascript
const BACKUP_CONFIG = {
  maxBackups: 10, // Maximum number of backups to keep
  backupInterval: '0 2 * * *', // Daily at 2 AM (cron format)
  compressBackups: true, // Whether to compress backups
  backupPrefix: 'caminhar-db-backup',
  verifyBackups: true, // Whether to verify backup integrity
  logRetentionDays: 30 // Number of days to keep logs
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
4. Backup integrity is verified after restoration

## UI Integration

The backup system is fully integrated into the admin panel at `/admin`:

### Features:
- **Backup List**: View all available backups with metadata
- **Create Backup**: Manual backup creation with progress indicator
- **Restore Backup**: One-click restore with confirmation dialog
- **Delete Backup**: Remove old backups to free up space
- **Backup Logs**: View detailed operation logs
- **System Status**: Monitor backup system health

### API Endpoints:
- `GET /api/admin/backups` - List all backups
- `POST /api/admin/backups` - Create new backup
- `DELETE /api/admin/backups/:filename` - Delete specific backup
- `POST /api/admin/backups/restore` - Restore from backup
- `GET /api/admin/backups/logs` - Get backup logs

## Monitoring

Check the backup logs regularly:
```bash
cat data/backups/backup.log
```

### Log Levels:
- **INFO**: Successful operations
- **WARN**: Warnings and non-critical issues
- **ERROR**: Failed operations and critical issues

## Maintenance

- Monitor disk space usage in the backups directory
- Adjust `maxBackups` as needed based on storage capacity
- Test restore functionality periodically
- Review backup logs for any issues
- Verify backup integrity regularly

## Troubleshooting

If backups fail:
1. Check the backup log for error messages
2. Ensure sufficient disk space is available
3. Verify database connection is working
4. Check file permissions on the backups directory
5. Verify PostgreSQL is running and accessible
6. Check if the backup directory exists and is writable

### Common Issues:
- **Permission Denied**: Ensure the application has write permissions to `data/backups/`
- **Disk Full**: Clean up old backups or increase storage capacity
- **Database Connection**: Verify PostgreSQL connection string and credentials
- **Compression Error**: Check if gzip is available on the system

## Security

- Backup files contain sensitive database information
- Ensure proper file permissions are set (600 for backup files)
- Consider encrypting backup files for additional security
- Store backups in a secure location
- Implement access controls for backup operations

## Performance Considerations

- Backups are performed during low-traffic hours (2 AM)
- Compression reduces storage requirements but increases CPU usage
- Backup verification adds overhead but ensures data integrity
- Consider using incremental backups for very large databases

## Integration with CI/CD

The backup system can be integrated into your deployment pipeline:

```yaml
# Example GitHub Actions workflow
- name: Create Database Backup
  run: npm run create-backup
  if: github.ref == 'refs/heads/main'

- name: Verify Backup
  run: npm run verify-backup $(ls data/backups/*.gz | tail -1)
  if: github.ref == 'refs/heads/main'
```

## Backup Best Practices

1. **Regular Testing**: Test restore procedures regularly
2. **Multiple Locations**: Store backups in multiple locations
3. **Version Control**: Keep track of backup versions and changes
4. **Documentation**: Document backup and restore procedures
5. **Monitoring**: Set up alerts for backup failures
6. **Security**: Encrypt sensitive backup data
7. **Retention**: Implement appropriate backup retention policies

## Support

For issues with the backup system:
1. Check the backup logs in `data/backups/backup.log`
2. Verify system requirements are met
3. Ensure proper file permissions are set
4. Contact the development team with detailed error information

## Changelog

### v1.2.0 (08/02/2026)
- ✅ **UI Integration**: Complete backup management interface in admin panel
- ✅ **Backup Verification**: Automatic verification of backup integrity
- ✅ **Enhanced Logging**: Detailed operation logs with multiple levels
- ✅ **Error Handling**: Robust error handling and recovery mechanisms
- ✅ **API Endpoints**: Complete RESTful API for backup operations
- ✅ **Performance**: Optimized backup creation and restoration
- ✅ **Security**: Enhanced security measures for backup files
- ✅ **Documentation**: Comprehensive documentation and troubleshooting guide
<task_progress>
- [x] Analyze current database setup
- [x] Create backup directory structure
- [x] Implement backup script
- [x] Set up automated scheduling
- [x] Test backup functionality
</task_progress>
</write_to_file>