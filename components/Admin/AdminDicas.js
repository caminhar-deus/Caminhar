import React from 'react';
import PropTypes from 'prop-types';
import AdminCrudBase from '@/components/Admin/AdminCrudBase';
import TextField from '@/components/Admin/fields/TextField';
import TextAreaField from '@/components/Admin/fields/TextAreaField';
import ToggleField from '@/components/Admin/fields/ToggleField';

/**
 * Componente de gerenciamento de "Dicas do Dia".
 *
 * Delega toda a lógica CRUD para o {@link AdminCrudBase}, atuando como
 * componente de configuração que define as colunas da tabela e os campos
 * do formulário de criação/edição.
 *
 * @component
 * @returns {JSX.Element} Painel de gerenciamento de dicas
 *
 * @example
 * <AdminDicas />
 *
 * @see AdminCrudBase Para detalhes da implementação CRUD base
 *
 * @param {Object} [props] - O componente não recebe props externas
 * @param {Array<Object>} props.columns - Definição das colunas da tabela (uso interno)
 * @param {Object} props.columns[].key - Chave do campo no objeto
 * @param {string} props.columns[].header - Cabeçalho da coluna
 * @param {string} [props.columns[].width] - Largura da coluna (ex: '60px')
 * @param {Function} [props.columns[].format] - Função de formatação do valor
 * @param {string} [props.columns[].activeBgColor] - Cor de fundo para status ativo
 * @param {string} [props.columns[].activeColor] - Cor do texto para status ativo
 * @param {string} [props.columns[].activeIcon] - Ícone para status ativo
 * @param {string} [props.columns[].inactiveBgColor] - Cor de fundo para status inativo
 * @param {string} [props.columns[].inactiveColor] - Cor do texto para status inativo
 * @param {string} [props.columns[].inactiveIcon] - Ícone para status inativo
 * @param {Array<Object>} props.fields - Configuração dos campos do formulário (uso interno)
 * @param {string} props.fields[].name - Nome do campo
 * @param {React.ComponentType} props.fields[].component - Componente de campo (TextField, TextAreaField, ToggleField)
 * @param {string} props.fields[].label - Label do campo
 * @param {boolean} [props.fields[].required] - Se o campo é obrigatório
 * @param {string} [props.fields[].placeholder] - Placeholder do campo
 * @param {number} [props.fields[].rows] - Número de linhas (para TextAreaField)
 *
 * @note Os componentes TextField/TextAreaField de Admin/fields delegam internamente
 *       para Input/TextArea da UI, mantendo a API específica do AdminCrudBase.
 *       A unificação foi concluída em 18/05/2026.
 */
export default function AdminDicas() {
  // Define as colunas que aparecerão na tabela de listagem
  const columns = [
    { key: 'id', header: 'ID', width: '60px' },
    { key: 'name', header: 'Nome' },
    {
      key: 'content',
      header: 'Conteúdo',
      format: (val) => val && val.length > 80 ? `${val.substring(0, 80)}...` : val
    },
    {
      key: 'published',
      header: 'Status',
      width: '120px',
      activeBgColor: '#dcfce7',
      activeColor: '#166534',
      activeIcon: '✅',
      inactiveBgColor: '#f3f4f6',
      inactiveColor: '#4b5563',
      inactiveIcon: '📝'
    }
  ];

  // Define os campos do modal de Criação/Edição
  const fields = [
    { name: 'name', component: TextField, label: 'Nome da Dica', required: true, placeholder: 'Ex: Palavra do dia' },
    { name: 'content', component: TextAreaField, label: 'Conteúdo da Mensagem', required: true, placeholder: 'Digite a mensagem inspiradora...', rows: 4 },
    { name: 'published', component: ToggleField, label: 'Status de Publicação', description: 'Ative para exibir esta dica no site público' }
  ];

  return (
    <AdminCrudBase
      title="Gerenciar Dicas do Dia"
      apiEndpoint="/api/admin/dicas"
      columns={columns}
      fields={fields}
      initialFormData={{ name: '', content: '', published: true }}
      itemNameSingular="dica"
      itemNamePlural="dicas"
      searchable={true}
    />
  );
}

/**
 * PropTypes para documentação das props esperadas pelo AdminCrudBase.
 *
 * @see AdminCrudBase Para a definição completa das PropTypes do componente base.
 */
AdminDicas.propTypes = {
  /** Definição das colunas da tabela (configuração interna, não recebida via props) */
  columns: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      header: PropTypes.string.isRequired,
      width: PropTypes.string,
      format: PropTypes.func,
      activeBgColor: PropTypes.string,
      activeColor: PropTypes.string,
      activeIcon: PropTypes.string,
      inactiveBgColor: PropTypes.string,
      inactiveColor: PropTypes.string,
      inactiveIcon: PropTypes.string
    })
  ),
  /** Configuração dos campos do formulário (configuração interna, não recebida via props) */
  fields: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      component: PropTypes.elementType.isRequired,
      label: PropTypes.string.isRequired,
      required: PropTypes.bool,
      placeholder: PropTypes.string,
      rows: PropTypes.number,
      description: PropTypes.string
    })
  )
};
