import PropTypes from 'prop-types';
import styles from './styles/crud.module.css';

/**
 * Subcomponente de tabela para CRUD administrativo.
 * Extraído de AdminCrudBase para reduzir complexidade do componente pai.
 */
export default function CrudTable({
  columns,
  items,
  loading,
  readOnly,
  reorderable,
  searchTerm,
  renderCustomCell,
  handleEdit,
  handleDelete,
  handleToggleBoolean,
  localItems,
  setLocalItems,
  dragOverIndex,
  setDragOverIndex,
  onReorder,
  currentPage,
  totalPages,
  goToPage,
  emptyMessage,
  usePagination,
  itemsPerPage,
  title,
  isFormVisible,
  setIsFormVisible
}) {
  // Renderiza uma célula da tabela
  const renderCell = (item, column) => {
    const { key, render, format } = column;
    const value = item[key];

    // Renderização customizada
    if (render) {
      const customCell = render(item, value);
      if (customCell !== undefined) return customCell;
    }

    // Renderização via função externa
    if (renderCustomCell) {
      const customCell = renderCustomCell(column, item, value);
      if (customCell !== undefined) return customCell;
    }

    // Formatação padrão
    if (format) {
      return format(value, item);
    }

    // Valores booleanos (status)
    if (typeof value === 'boolean') {
      const activeBgColor = column.activeBgColor || '';
      const activeColor = column.activeColor || '';
      const inactiveBgColor = column.inactiveBgColor || '';
      const inactiveColor = column.inactiveColor || '';
      const activeText = column.activeText || 'Publicado';
      const inactiveText = column.inactiveText || 'Rascunho';
      const activeIcon = column.activeIcon || '✅';
      const inactiveIcon = column.inactiveIcon || '📝';

      const customStyle = {};
      if (value && activeBgColor) customStyle.backgroundColor = activeBgColor;
      if (value && activeColor) customStyle.color = activeColor;
      if (!value && inactiveBgColor) customStyle.backgroundColor = inactiveBgColor;
      if (!value && inactiveColor) customStyle.color = inactiveColor;

      return (
        <button
          type="button"
          onClick={() => handleToggleBoolean(item, key, value)}
          className={`${styles.statusBadge} ${value ? styles.statusPublished : styles.statusDraft} ${styles.statusToggle}`}
          style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
          title="Clique para alterar o status rapidamente"
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>{value ? activeIcon : inactiveIcon}</span>
          <span>{value ? activeText : inactiveText}</span>
        </button>
      );
    }

    // URLs
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          Abrir link
        </a>
      );
    }

    // Valor padrão
    return value || <span className={styles.emptyCell}>-</span>;
  };

  return (
    <>
      <div className={styles.tableContainer} style={{ flex: 1, overflowY: 'auto', maxHeight: '600px' }}>
        <table className={styles.table} aria-label={title}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--color-bg-secondary)', boxShadow: 'inset 0 -2px 0 var(--color-border-light)' }}>
            <tr>
              {reorderable && !searchTerm && <th scope="col" style={{ width: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>☰</th>}
              {columns.map(col => (
                <th key={col.key} scope="col" style={col.width ? { width: col.width } : {}}>
                  {col.header}
                </th>
              ))}
              {!readOnly && <th scope="col" style={{ width: '120px' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading && localItems.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {reorderable && !searchTerm && (
                    <td><div className={styles.skeletonBox} style={{ width: '20px', margin: '0 auto' }}></div></td>
                  )}
                  {columns.map(col => (
                    <td key={`skeleton-col-${col.key}`}>
                      <div className={styles.skeletonBox} style={{ width: col.width ? '100%' : '80%' }}></div>
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div className={styles.skeletonBox} style={{ height: '32px', width: '60px' }}></div>
                        <div className={styles.skeletonBox} style={{ height: '32px', width: '60px' }}></div>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : items.length > 0 ? (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  draggable={reorderable && !searchTerm}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', index.toString());
                  }}
                  onDragOver={(e) => {
                    if (reorderable && !searchTerm) {
                      e.preventDefault();
                      setDragOverIndex(index);
                    }
                  }}
                  onDragLeave={() => setDragOverIndex(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverIndex(null);
                    if (!reorderable || searchTerm) return;
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                    if (fromIndex !== index) {
                      const newItems = [...localItems];
                      const [movedItem] = newItems.splice(fromIndex, 1);
                      newItems.splice(index, 0, movedItem);
                      setLocalItems(newItems);
                      if (onReorder) onReorder(newItems, currentPage, itemsPerPage);
                    }
                  }}
                  style={{
                    cursor: reorderable && !searchTerm ? 'move' : 'default',
                    backgroundColor: dragOverIndex === index ? 'var(--color-bg-secondary)' : '',
                    borderTop: dragOverIndex === index ? '2px solid var(--color-primary-500)' : '',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {reorderable && !searchTerm && (
                    <td
                      style={{ width: '40px', color: 'var(--color-text-tertiary)', textAlign: 'center', cursor: 'grab' }}
                      aria-grabbed={dragOverIndex !== null}
                      aria-roledescription="Botão de ordenação por arrastar"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          // Placeholder para ativar o modo de arrasto via teclado
                        }
                      }}
                    >
                      ⣿
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={`${item.id}-${col.key}`}>
                      {renderCell(item, col)}
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.editButton}
                          onClick={() => {
                            handleEdit(item);
                            setIsFormVisible(true);
                            setTimeout(() => document.getElementById('crud-form')?.scrollIntoView({ behavior: 'smooth' }), 50);
                          }}
                          disabled={loading}
                          type="button"
                        >
                          Editar
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(item.id)}
                          disabled={loading}
                          type="button"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (reorderable && !searchTerm ? 1 : 0) + (readOnly ? 0 : 1)}
                  className={styles.emptyStateRow}
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {usePagination && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || loading}
            className={styles.paginationButton}
            type="button"
          >
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || loading}
            className={styles.paginationButton}
            type="button"
          >
            Próxima
          </button>
        </div>
      )}
    </>
  );
}

CrudTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    header: PropTypes.string.isRequired,
    render: PropTypes.func,
    format: PropTypes.func,
    width: PropTypes.string,
    activeBgColor: PropTypes.string,
    activeColor: PropTypes.string,
    inactiveBgColor: PropTypes.string,
    inactiveColor: PropTypes.string,
    activeText: PropTypes.string,
    inactiveText: PropTypes.string,
    activeIcon: PropTypes.string,
    inactiveIcon: PropTypes.string
  })).isRequired,
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  readOnly: PropTypes.bool,
  reorderable: PropTypes.bool,
  searchTerm: PropTypes.string,
  renderCustomCell: PropTypes.func,
  handleEdit: PropTypes.func.isRequired,
  handleDelete: PropTypes.func.isRequired,
  handleToggleBoolean: PropTypes.func.isRequired,
  localItems: PropTypes.array.isRequired,
  setLocalItems: PropTypes.func.isRequired,
  dragOverIndex: PropTypes.number,
  setDragOverIndex: PropTypes.func.isRequired,
  onReorder: PropTypes.func,
  currentPage: PropTypes.number,
  totalPages: PropTypes.number,
  goToPage: PropTypes.func,
  emptyMessage: PropTypes.string,
  usePagination: PropTypes.bool,
  title: PropTypes.string.isRequired,
  isFormVisible: PropTypes.bool,
  setIsFormVisible: PropTypes.func.isRequired,
  itemsPerPage: PropTypes.number
};