import React, { useState, useEffect, useRef } from 'react';
import styles from './Alert.module.css';
import { defaultIcons } from './icons';

/**
 * Alert - Componente de alerta/avisos
 * @param {string} status - 'info' | 'success' | 'warning' | 'error'
 * @param {string} variant - 'subtle' | 'solid' | 'left-accent' | 'top-accent'
 * @param {ReactNode} title - Título do alerta
 * @param {ReactNode} children - Conteúdo do alerta
 * @param {ReactNode} icon - Ícone customizado
 * @param {boolean} closable - Permite fechar
 * @param {function} onClose - Handler ao fechar
 * @param {boolean} isOpen - Se fornecido, controla externamente a visibilidade do alerta (substitui o estado interno)
 * @param {function} onBeforeClose - Handler chamado antes de fechar. Se retornar `false`, o fechamento é cancelado.
 * 
 * @exports defaultIcons - Ícones padrão por status (exportação nomeada, re-exportado de ./icons)
 * 
 * @description
 * O `role` do alerta é dinâmico:
 * - Para alertas críticos (`status="error"` + `closable`): usa `role="alertdialog"` com `aria-modal="true"`,
 *   sinalizando aos leitores de tela que o usuário precisa interagir antes de prosseguir.
 * - Para os demais casos: usa `role="alert"` com `aria-live="polite"`.
 * 
 * Quando `alertdialog` está ativo, o foco é automaticamente movido para o container do alerta
 * para garantir que o leitor de tela anuncie o conteúdo imediatamente.
 */

export const Alert = ({
  status = 'info',
  variant = 'subtle',
  title,
  children,
  icon,
  closable = false,
  onClose,
  isOpen: controlledIsOpen,
  onBeforeClose,
  className = '',
}) => {
  const [internalIsVisible, setInternalIsVisible] = useState(true);
  const alertRef = useRef(null);

  // Se isOpen for passado como prop, usa controle externo; senão, usa interno
  const isControlled = controlledIsOpen !== undefined;
  const isVisible = isControlled ? controlledIsOpen : internalIsVisible;

  // define criticidade para role dinâmico
  const isCritical = status === 'error' && closable;
  const role = isCritical ? 'alertdialog' : 'alert';

  useEffect(() => {
    if (isCritical && isVisible && alertRef.current) {
      // Move o foco para o alerta crítico para que leitores de tela anunciem imediatamente
      alertRef.current.focus();
    }
  }, [isCritical, isVisible]);

  const handleClose = () => {
    if (onBeforeClose) {
      const shouldClose = onBeforeClose();
      if (shouldClose === false) return;
    }
    if (!isControlled) {
      setInternalIsVisible(false);
    }
    onClose?.();
  };

  if (!isVisible) return null;

  const alertClasses = [
    styles.alert,
    styles[status],
    styles[variant],
    closable && styles.closable,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={alertRef}
      className={alertClasses}
      role={role}
      aria-live={isCritical ? undefined : 'polite'}
      aria-modal={isCritical ? true : undefined}
      tabIndex={isCritical ? 0 : undefined}
    >
      <div className={styles.icon}>
        {icon || defaultIcons[status]}
      </div>
      <div className={styles.content}>
        {title && <h5 className={styles.title}>{title}</h5>}
        {children && <div className={styles.description}>{children}</div>}
      </div>
      {closable && (
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Fechar alerta"
        >
          <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export { defaultIcons };
export default Alert;
