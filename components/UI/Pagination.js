import React from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import styles from './Pagination.module.css';

/**
 * Pagination - Componente unificado de paginação para o Design System.
 * Suporta modo interativo via `onPageChange` (com botões) e modo SSR via `getPageUrl` (com links).
 */
export function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  getPageUrl,
  totalItems,
  itemLabel,
  disabled = false,
  className = '',
}) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const renderPrev = () => {
    if (getPageUrl && hasPrev && !disabled) {
      return (
        <Link
          href={getPageUrl(currentPage - 1)}
          className={styles.pageButton}
          aria-label="Página anterior"
        >
          ❮ Anterior
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onPageChange && onPageChange(currentPage - 1)}
        disabled={!hasPrev || disabled}
        className={`${styles.pageButton} ${(!hasPrev || disabled) ? styles.pageButtonDisabled : ''}`}
        aria-label="Página anterior"
      >
        ❮ Anterior
      </button>
    );
  };

  const renderNext = () => {
    if (getPageUrl && hasNext && !disabled) {
      return (
        <Link
          href={getPageUrl(currentPage + 1)}
          className={styles.pageButton}
          aria-label="Próxima página"
        >
          Próxima ❯
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => onPageChange && onPageChange(currentPage + 1)}
        disabled={!hasNext || disabled}
        className={`${styles.pageButton} ${(!hasNext || disabled) ? styles.pageButtonDisabled : ''}`}
        aria-label="Próxima página"
      >
        Próxima ❯
      </button>
    );
  };

  return (
    <nav className={`${styles.pagination} ${className}`.trim()} aria-label="Navegação de páginas">
      {renderPrev()}
      <span className={styles.pageInfo} aria-live="polite" aria-atomic="true">
        Página {currentPage} de {totalPages}
        {totalItems > 0 && itemLabel && (
          <span className={styles.totalInfo}>
            {' '}({totalItems} {itemLabel}{totalItems !== 1 ? 's' : ''})
          </span>
        )}
      </span>
      {renderNext()}
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func,
  getPageUrl: PropTypes.func,
  totalItems: PropTypes.number,
  itemLabel: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Pagination;
