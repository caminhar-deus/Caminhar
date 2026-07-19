#!/usr/bin/env node

/**
 * Constantes compartilhadas entre os scripts do projeto
 *
 * Centraliza valores de configuração que antes estavam espalhados
 * como números mágicos nos arquivos (correção 5.2).
 */

// ─── Backup ────────────────────────────────────────────
/** Número máximo de backups a manter (rotação) */
export const MAX_BACKUPS = 10;

/** Limite padrão de arquivos listados em getAvailableBackups */
export const DEFAULT_LIST_LIMIT = 50;

/** Prefixo para backups de segurança pré-restore */
export const PRE_RESTORE_PREFIX = 'pre-restore_';

/** Intervalo entre backups agendados (24 horas em ms) */
export const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Tamanho esperado da chave de criptografia AES-256 em bytes */
export const ENCRYPTION_KEY_LENGTH = 32;

/** Tamanho máximo do buffer de log em memória */
export const MAX_LOG_LINES = 100;

// ─── Servidor ──────────────────────────────────────────
/** Porta padrão do servidor Next.js */
export const DEFAULT_PORT = 3000;

/** Timeout (ms) para verificação de disponibilidade do servidor */
export const SERVER_CHECK_TIMEOUT = 2000;

// ─── Diagnósticos ──────────────────────────────────────
/** Limite de posts para exibir alerta de paginação */
export const POST_ALERT_THRESHOLD = 10;

// ─── Manutenção ────────────────────────────────────────
/** Tamanho padrão de lote para operações em lote */
export const DEFAULT_BATCH_SIZE = 50;

// ─── Diretórios ────────────────────────────────────────
/** Diretório de relatórios */
export const REPORTS_DIR = 'reports';

/** Subdiretório de sumários k6 dentro de reports */
export const K6_SUMMARY_DIR = 'reports/k6-summaries';

/** Diretório dos scripts de teste de carga */
export const LOAD_TESTS_DIR = 'load-tests';

// ─── Migrações ─────────────────────────────────────────
/** Nome da tabela de controle de migrações no banco */
export const MIGRATIONS_TABLE = '_migrations';

// ─── Limpeza ───────────────────────────────────────────
/** Dias de retenção de relatórios k6 */
export const K6_RETENTION_DAYS = 7;

// ─── Log de Backup ──────────────────────────────────────
/** Período de retenção de logs em dias (logs mais antigos são removidos) */
export const LOG_RETENTION_DAYS = 30;

/** Tamanho máximo do arquivo de log em bytes antes de forçar rotação (10 MB) */
export const LOG_MAX_SIZE_BYTES = 10 * 1024 * 1024;

// ─── Monitoramento de Disco ────────────────────────────
/** Percentual de uso do disco que dispara alerta */
export const DISK_THRESHOLD_PERCENT = 85;

/** Caminho padrão do mount point a verificar */
export const DISK_PATH_DEFAULT = '/';