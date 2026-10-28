import { useState, useEffect, useId } from 'react';
import PropTypes from 'prop-types';
import styles from './DateTimeBRField.module.css';

/**
 * Campo de data e hora com máscara pt-BR (dd/mm/aaaa hh:mm).
 *
 * Substitui o input nativo `datetime-local`, cuja formatação exibida segue o
 * idioma do navegador do usuário e não respeita o pt-BR do painel (doc
 * ARQUITETURA_SITE_PRIVADO.md §8, item 9).
 *
 * Dispara `onChange({ target: { value } })` no MESMO formato do input nativo
 * ("YYYY-MM-DDTHH:mm") quando a máscara está completa e válida — de modo que o
 * restante do formulário não precisa de adaptação. Ao apagar tudo, dispara
 * valor vazio (''). Enquanto o usuário digita (máscara incompleta), nada é
 * disparado — estado transitório de digitação, não erro. Quando a máscara
 * completa é inválida (ex.: mês 13), o campo é marcado `aria-invalid` e exibe
 * mensagem de erro inline ligada por `aria-describedby`.
 *
 * Acessibilidade (MASTER §3/§7): passe `label` para obter rótulo visível
 * associado por `id`/`htmlFor`; em barras de filtro densas sem rótulos
 * visíveis, passe `ariaLabel` — `title` é apenas tooltip suplementar e nunca
 * a fonte principal do nome acessível.
 *
 * @param {string} [value] - Valor atual no formato "YYYY-MM-DDTHH:mm" (ou '').
 * @param {Function} onChange - Handler de mudança (e.target.value no formato nativo).
 * @param {string} [id] - Identificador do campo (necessário para label externo).
 * @param {string} [label] - Rótulo visível renderizado acima do campo.
 * @param {string} [ariaLabel] - Nome acessível para layouts sem rótulo visível.
 * @param {string} [title] - Tooltip suplementar do campo.
 * @param {Object} [style] - Estilos inline do input.
 * @param {string} [placeholder] - Placeholder do campo.
 */
export default function DateTimeBRField({
  value = '',
  onChange,
  id,
  label,
  ariaLabel,
  title,
  style,
  placeholder = 'dd/mm/aaaa hh:mm'
}) {
  const autoId = useId();
  const inputId = id || `datetime-br-${autoId}`;
  const errorId = `${inputId}-error`;

  const toDisplay = (iso) => {
    if (!iso || typeof iso !== 'string') return '';
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : '';
  };

  const [display, setDisplay] = useState(toDisplay(value));
  const [invalid, setInvalid] = useState(false);

  // Sincroniza a máscara quando o valor é alterado externamente (ex.: reset)
  useEffect(() => {
    setDisplay(toDisplay(value));
    setInvalid(false);
  }, [value]);

  const parseDigits = (digits) => {
    const dia = parseInt(digits.slice(0, 2), 10);
    const mes = parseInt(digits.slice(2, 4), 10);
    const hora = parseInt(digits.slice(8, 10), 10);
    const min = parseInt(digits.slice(10, 12), 10);
    if (mes < 1 || mes > 12) return null;
    if (dia < 1 || dia > 31) return null;
    if (hora > 23 || min > 59) return null;
    return `${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}T${digits.slice(8, 10)}:${digits.slice(10, 12)}`;
  };

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
    let out = digits;
    if (digits.length > 2) out = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    if (digits.length > 4) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    if (digits.length > 8) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8)}`;
    if (digits.length > 10) out = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)} ${digits.slice(8, 10)}:${digits.slice(10)}`;
    setDisplay(out);

    if (!onChange) return;
    if (digits.length === 0) {
      setInvalid(false);
      onChange({ target: { value: '' } });
      return;
    }
    if (digits.length === 12) {
      const iso = parseDigits(digits);
      if (iso) {
        setInvalid(false);
        onChange({ target: { value: iso } });
      } else {
        setInvalid(true);
      }
    } else {
      // Máscara incompleta: digitação em curso, não é erro
      setInvalid(false);
    }
  };

  return (
    <>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        title={title}
        style={style}
        className={styles.field}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        maxLength={16}
      />
      {invalid && (
        <span id={errorId} className={styles.errorMessage} role="alert">
          Data inválida — use dd/mm/aaaa hh:mm
        </span>
      )}
    </>
  );
}

DateTimeBRField.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  id: PropTypes.string,
  label: PropTypes.string,
  ariaLabel: PropTypes.string,
  title: PropTypes.string,
  style: PropTypes.object,
  placeholder: PropTypes.string
};
