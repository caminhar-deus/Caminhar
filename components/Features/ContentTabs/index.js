import { useState, Suspense } from 'react';
import { AppIcon } from '@/components/UI/icons';
import styles from './styles/ContentTabs.module.css';
import BlogSection from '../Blog/BlogSection';
import MusicGallery from '../Music/MusicGallery';
import VideoGallery from '../Video/VideoGallery';
import ProductList from '../Products/ProductList';

export default function ContentTabs() {
  const [activeTab, setActiveTab] = useState('reflexoes');

  const tabs = [
    { id: 'reflexoes', label: 'Reflexões & Estudos', active: true, icon: 'book' },
    { id: 'projeto1', label: 'Em Desenvolvimento', active: false, icon: 'construction' },
    { id: 'musicas', label: 'Músicas', active: false, icon: 'music' },
    { id: 'videos', label: 'Vídeos', active: false, icon: 'video' },
    { id: 'produtos', label: 'Produtos Religiosos', active: false, icon: 'package' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'reflexoes':
        return <BlogSection limit={6} />;
      case 'produtos':
        return <ProductList />;
      case 'musicas':
        return <MusicGallery />;
      case 'videos':
        return <VideoGallery />;
      case 'projeto1':
        return <PlaceholderContent />;
      default:
        return <BlogSection limit={6} />;
    }
  };

  return (
    <section className={styles.tabsSection}>
      <div className={styles.container}>
        <div className={styles.tabsContainer} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              id={tab.id + '-tab'}
              role="tab"
              type="button"
              className={`${styles.tabButton} ${
                activeTab === tab.id ? styles.active : ''
              }`}
              onClick={() => {
                if (tab.id !== 'projeto1') {
                  setActiveTab(tab.id);
                }
              }}
              aria-selected={activeTab === tab.id}
              aria-controls={tab.id + '-panel'}
              disabled={tab.id === 'projeto1'}
            >
              <span className={styles.tabIcon} aria-hidden="true">
                <AppIcon name={tab.icon} size={20} />
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className={styles.contentContainer}
          role="tabpanel"
          id={activeTab + '-panel'}
          aria-labelledby={activeTab + '-tab'}
        >
          <Suspense fallback={<div className={styles.loading}>Carregando...</div>}>
            {renderContent()}
          </Suspense>
        </div>
      </div>
    </section>
  );
}

function PlaceholderContent() {
  return (
    <div className={styles.placeholderContainer}>
      <div className={styles.placeholderCard}>
        <h3 className={styles.placeholderTitle}>Projeto Futuro</h3>
        <p className={styles.placeholderText}>Conteúdo será implementado em breve</p>
        <div className={styles.placeholderImage}>
          <div className={styles.imagePlaceholder}>
            <span>Imagem de placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}
