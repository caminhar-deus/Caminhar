import { useState } from 'react';
import Link from 'next/link';
import styles from '../styles/ContentTabs.module.css';
import BlogSection from './BlogSection';
import MusicGallery from './MusicGallery';

export default function ContentTabs() {
  const [activeTab, setActiveTab] = useState('reflexoes');

  const tabs = [
    { id: 'reflexoes', label: 'Reflexões & Estudos', active: true },
    { id: 'projeto1', label: 'Em Desenvolvimento', active: false },
    { id: 'musicas', label: 'Músicas', active: false },
    { id: 'videos', label: 'Vídeos', active: false },
    { id: 'projeto2', label: 'Em Desenvolvimento', active: false }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'reflexoes':
        return <BlogSection limit={3} />;
      case 'musicas':
        return <MusicGallery />;
      case 'projeto1':
      case 'videos':
      case 'projeto2':
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
                if (tab.id !== 'projeto1' && tab.id !== 'projeto2') {
                  setActiveTab(tab.id);
                }
              }}
              aria-selected={activeTab === tab.id}
              disabled={tab.id === 'projeto1' || tab.id === 'projeto2'}
            >
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
    },
    'projeto2': {
      title: 'Projeto Futuro',
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