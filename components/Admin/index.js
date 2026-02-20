/**
 * Admin Components - CRUD Reutilizável
 * 
 * Este módulo exporta todos os componentes do sistema administrativo
 * para facilitar importações.
 * 
 * @example
 * import { AdminCrudBase, AdminMusicasNew, TextField } from './components/Admin';
 */

// Componente Base
export { default as AdminCrudBase } from './AdminCrudBase';

// Componentes Refatorados
export { default as AdminMusicasNew } from './AdminMusicasNew';
export { default as AdminVideosNew } from './AdminVideosNew';
export { default as AdminPostsNew } from './AdminPostsNew';

// Campos de Formulário
export { default as TextField } from './fields/TextField';
export { default as TextAreaField } from './fields/TextAreaField';
export { default as ImageUploadField } from './fields/ImageUploadField';
export { default as ToggleField } from './fields/ToggleField';
export { default as UrlField } from './fields/UrlField';
