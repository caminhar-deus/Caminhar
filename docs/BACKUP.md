# Sistema de Backup - Caminhar com Deus

## Visão Geral

Sistema automático de backup para banco de dados PostgreSQL com compressão, rotação e interface administrativa.

## Funcionalidades

- **Backups automáticos** diários às 2 AM
- **Compressão** de arquivos para economizar espaço
- **Rotação** de backups (máximo 10 versões)
- **Interface administrativa** completa
- **Verificação** de integridade automática
- **Restauração** fácil e segura

## Comandos Principais

### Iniciar Sistema de Backup
```bash
npm run init-backup
```

### Criar Backup Manual
```bash
npm run create-backup
```

### Restaurar Backup
```bash
npm run backup:restore nome-arquivo.sql.gz
```

### Listar Backups Disponíveis
```bash
node -e "import('./scripts/backup.js').then(m => m.getAvailableBackups().then(console.log))"
```

### Visualizar Logs
```bash
cat data/backups/backup.log
```

## Configuração

Arquivo: `scripts/backup.js`

```javascript
const BACKUP_CONFIG = {
  maxBackups: 10,                    // Máximo de backups
  backupInterval: '0 2 * * *',       // Diariamente às 2 AM
  compressBackups: true,             // Comprimir backups
  backupPrefix: 'caminhar-pg-backup', // Prefixo dos arquivos
  verifyBackups: true,               // Verificar integridade
  logRetentionDays: 30               // Dias para manter logs
};
```

## Estrutura de Arquivos

```
data/backups/
├── caminhar-pg-backup_2026-03-07_02-00-00.sql.gz
├── caminhar-pg-backup_2026-03-08_02-00-00.sql.gz
└── backup.log
```

## Interface Administrativa

Acesse: `/admin` → Seção de Backups

### Funcionalidades:
- Listar todos os backups disponíveis
- Criar backup manual com indicador de progresso
- Restaurar backup com confirmação
- Excluir backups antigos
- Visualizar logs de operações
- Monitorar saúde do sistema

## API Endpoints

- `GET /api/admin/backups` - Listar backups
- `POST /api/admin/backups` - Criar backup
- `DELETE /api/admin/backups/:filename` - Excluir backup
- `POST /api/admin/backups/restore` - Restaurar backup
- `GET /api/admin/backups/logs` - Obter logs

## Monitoramento

### Métricas de Performance
- **Tempo de backup**: < 30 segundos
- **Taxa de compressão**: > 70%
- **Taxa de sucesso**: 100%
- **Uso de armazenamento**: Monitorado

### Alertas
- Falhas de backup
- Espaço em disco insuficiente (< 1GB)
- Degradação de performance (> 60s)
- Problemas de segurança

## Segurança

- Permissões de arquivos: 600 (somente leitura/escrita para owner)
- Verificação de integridade automática
- Criptografia recomendada para backups sensíveis
- Controle de acesso às operações

## Troubleshooting

### Problemas Comuns

**Permissão negada**
```bash
chmod 755 data/backups/
```

**Espaço em disco insuficiente**
```bash
# Limpar backups antigos
npm run backup:cleanup
```

**Falha na conexão com PostgreSQL**
```bash
# Verificar conexão
psql -h localhost -U usuario -d banco
```

**Erro de compressão**
```bash
# Verificar gzip
which gzip
```

## Testes

### Testes de Integridade
```bash
npm run test:backup:performance
npm run test:backup:integration
npm run test:backup:load
```

### Testes de Carga (k6)
```bash
k6 run load-tests/backup-concurrent-test.js
k6 run load-tests/backup-restore-test.js
```

## Melhores Práticas

1. **Testar restauração** regularmente
2. **Armazenar backups** em locais diferentes
3. **Documentar** procedimentos de backup/restore
4. **Monitorar** espaço em disco
5. **Criptografar** backups sensíveis
6. **Manter histórico** de versões

## Integração CI/CD

```yaml
- name: Create Database Backup
  run: npm run create-backup
  if: github.ref == 'refs/heads/main'

- name: Verify Backup
  run: npm run verify-backup $(ls data/backups/*.gz | tail -1)
```

## Suporte

Para problemas com o sistema de backup:
1. Verifique os logs em `data/backups/backup.log`
2. Confira os requisitos do sistema
3. Verifique as permissões de arquivos
4. Entre em contato com a equipe de desenvolvimento

## Changelog

### v1.7.0 (07/03/2026)
- ✅ Suporte completo a ES modules
- ✅ Testes de carga corrigidos
- ✅ Performance monitorada
- ✅ Segurança reforçada

### v1.2.0 (08/02/2026)
- ✅ Interface administrativa completa
- ✅ Verificação automática de integridade
- ✅ API RESTful completa
- ✅ Sistema de logs detalhado