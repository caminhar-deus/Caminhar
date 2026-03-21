import AdminVideosNew from '../../components/Admin/AdminVideosNew';
import withAdminAuth from '../../components/Admin/withAdminAuth';

/**
 * Página de administração de vídeos.
 * A lógica de autenticação e layout é gerenciada pelo HOC withAdminAuth.
 */
function VideosPage() {
  return <AdminVideosNew />;
}

export default withAdminAuth(VideosPage, {
  title: 'Gestão de Vídeos'
});