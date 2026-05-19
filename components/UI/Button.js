import React, { useRef, useCallback, useState } from 'react';
import styles from './Button.module.css';
import { Spinner } from '@/components/UI';
/**
 * Button - Componente base de botão
 * @param {string} variant - 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {boolean} fullWidth - Ocupa toda a largura disponível
 * @param {boolean} disabled - Desabilita o botão
 * @param {boolean} loading - Mostra spinner de loading
 * @param {ReactNode} leftIcon - Ícone à esquerda
 * @param {ReactNode} rightIcon - Ícone à direita
 * @param {function} onClick - Handler de click
 * @param {string} type - 'button' | 'submit' | 'reset'
 * @param {boolean} ripple - Habilita efeito ripple no clique (default: true)
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  onClick,
  type = 'button',
  ripple = true,
  className = '',
  ...props
}) => {
  const buttonRef = useRef(null);
  const rippleIdRef = useRef(0);
  const ripplesRef = useRef([]);
  const [renderTick, setRenderTick] = useState(0);

  const addRipple = useCallback((x, y) => {
    const id = rippleIdRef.current++;
    ripplesRef.current = [...ripplesRef.current, { x, y, id }];
    setRenderTick((t) => t + 1);

    setTimeout(() => {
      ripplesRef.current = ripplesRef.current.filter((r) => r.id !== id);
      setRenderTick((t) => t + 1);
    }, 600);
  }, []);

  const handleClick = useCallback((e) => {
    if (ripple && !disabled && !loading && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addRipple(x, y);
    }

    onClick?.(e);
  }, [ripple, disabled, loading, onClick, addRipple]);

  const buttonClasses = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    (disabled || loading) && styles.disabled,

    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={buttonRef}
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading ? "true" : "false"}
      aria-busy={loading ? "true" : "false"}
      {...props}
    >
      {ripplesRef.current.map((r) => (
        <span
          key={r.id}
          className={styles.ripple}
          style={{ left: r.x, top: r.y }}
          aria-hidden="true"
        />
      ))}
      {loading && (
        <span className={styles.spinner} aria-hidden="true">
          <Spinner size="sm" />
        </span>
      )}
      {!loading && leftIcon && (
        <span className={styles.leftIcon} aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className={styles.content}>{children}</span>
      {!loading && rightIcon && (
        <span className={styles.rightIcon} aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
};

export default Button;