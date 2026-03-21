import { useState } from 'react';
import Link from 'next/link';
import styles from './ContentTabs.module.css';
import BlogSection from '../Blog/BlogSection';
import MusicGallery from '../Music/MusicGallery';
import VideoGallery from '../Video/VideoGallery';
import ProductList from '../../Products/ProductList';

export default function ContentTabs() {
  const [activeTab, setActiveTab] = useState('reflexoes');

  const tabs = [
    { id: 'reflexoes', label: 'Reflexões & Estudos', active: true, icon: '📖' },
    { id: 'projeto1', label: 'Em Desenvolvimento', active: false, icon: '🏗️' },
    { id: 'musicas', label: 'Músicas', active: false, icon: '🎵' },
    { id: 'videos', label: 'Vídeos', active: false, icon: '🎬' },
    { id: 'produtos', label: 'Produtos Religiosos', active: false, icon: '📦' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'reflexoes':
        return <BlogSection limit={3} />;
      case 'produtos':
        return <ProductList />;
      case 'musicas':
        return <MusicGallery />;
      case 'videos':
        return <VideoGallery />;
      case 'projeto1':
        return <PlaceholderContent tabId={activeTab} />;
      default:
        return <BlogSection limit={3} />;
    }
  };

  return (
    <section className={styles.tabsSection}>
      <div className={styles.container}>
        <div className={styles.tabsContainer}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabButton} ${
                activeTab === tab.id ? styles.active : ''
              }`}
              onClick={() => {
                if (tab.id !== 'projeto1') {
                  setActiveTab(tab.id);
                }
              }}
              aria-selected={activeTab === tab.id}
              disabled={tab.id === 'projeto1'}
            >
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className={styles.contentContainer}>
          {renderContent()}
        </div>
      </div>
    </section>
  );
}

function PlaceholderContent({ tabId }) {
  const contentMap = {
    'projeto1': {
      title: 'Projeto Futuro',
      description: 'Conteúdo será implementado em breve'
    },
    'musicas': {
      title: 'Músicas',
      description: 'Conteúdo será implementado em breve'
    },
    'videos': {
      title: 'Vídeos',
      description: 'Conteúdo será implementado em breve'
    }
  };

  const content = contentMap[tabId];

  return (
    <div className={styles.placeholderContainer}>
      <div className={styles.placeholderCard}>
        <h3 className={styles.placeholderTitle}>{content.title}</h3>
        <p className={styles.placeholderText}>{content.description}</p>
        <div className={styles.placeholderImage}>
          <div className={styles.imagePlaceholder}>
            <span>Imagem de placeholder</span>
          </div>
        </div>
      </div>
    </div>
  );
}