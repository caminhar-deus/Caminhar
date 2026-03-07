import AdminMusicasNew from '../../components/Admin/AdminMusicasNew';
import withAdminAuth from '../../components/Admin/withAdminAuth';

/**
 * Página de administração de músicas.
 * Esta página é "burra", apenas renderiza o componente de CRUD.
 * A lógica de autenticação e layout é gerenciada pelo HOC withAdminAuth.
 */
function MusicasPage() {
  return <AdminMusicasNew />;
}

export default withAdminAuth(MusicasPage, {
  title: 'Gestão de Músicas (Novo Sistema)'
});