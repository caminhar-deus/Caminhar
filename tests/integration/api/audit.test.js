import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { logActivity } from '../../../lib/domain/audit.js';
import { query } from '../../../lib/db.js';

jest.mock('../../../lib/db.js', () => ({ query: jest.fn() }));

describe('Domain - Audit', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('logActivity: deve inserir o log no banco de dados com os parâmetros preenchidos', async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    
    await logActivity('admin', 'CREATE', 'POST', 1, 'Details', '127.0.0.1', { client: 'mockClient' });
    
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO activity_logs'),
      ['admin', 'CREATE', 'POST', 1, 'Details', '127.0.0.1'],
      { log: false, client: 'mockClient' }
    );
  });
  
  it('logActivity: deve usar valores padrão para ipAddress e opções omitidas', async () => {
    await logActivity('admin', 'DELETE', 'USER', 2, 'Details');
    
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO activity_logs'),
      ['admin', 'DELETE', 'USER', 2, 'Details', ''],
      { log: false, client: undefined }
    );
  });
});