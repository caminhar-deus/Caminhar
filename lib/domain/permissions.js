/**
 * Lista de permissões disponíveis para atribuição a cargos de administrador.
 * Utiliza Object.freeze para garantir imutabilidade em tempo de execução,
 * prevenindo modificações acidentais no array durante o ciclo de vida da aplicação.
 *
 * @type {ReadonlyArray<string>}
 */
const permissionsList = Object.freeze([
  'Visão Geral',
  'Posts/Artigos',
  'Gestão de Músicas',
  'Gestão de Vídeos',
  'Gestão de Produtos',
  'Gestão de Dicas',
  'Configuração de Cabeçalho',
  'Segurança',
  'Usuários',
  'Auditoria',
]);

export default permissionsList;