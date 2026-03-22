import React, { useState } from 'react';
import AdminUsersTab from './AdminUsersTab';
import AdminRolesTab from './AdminRolesTab';

export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Gestão de Usuários e Admins', icon: '👤' },
    { id: 'roles', label: 'Gestão de Cargos', icon: '🛡️' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cabeçalho de Navegação (Abas) */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e5e7eb', paddingBottom: '12px', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              backgroundColor: activeTab === tab.id ? '#2563eb' : '#f3f4f6',
              color: activeTab === tab.id ? '#ffffff' : '#374151',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '600', fontSize: '0.95rem',
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Área de Conteúdo Dinâmico */}
      <div style={{ minHeight: '500px' }}>
        {activeTab === 'users' && <AdminUsersTab />}
        {activeTab === 'roles' && <AdminRolesTab />}
      </div>
    </div>
  );
}