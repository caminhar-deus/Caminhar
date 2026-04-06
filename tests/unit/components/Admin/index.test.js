import { describe, it, expect } from '@jest/globals';
import * as AdminComponents from '../../../../components/Admin/index.js';

describe('Admin Components Index', () => {
  it('deve exportar todos os componentes administrativos e campos de formulário corretamente', () => {
    // Componentes Base e de Feature
    expect(AdminComponents.AdminCrudBase).toBeDefined();
    expect(AdminComponents.AdminMusicasNew).toBeDefined();
    expect(AdminComponents.AdminVideosNew).toBeDefined();
    expect(AdminComponents.AdminPostsNew).toBeDefined();
    
    // Campos de Formulário
    expect(AdminComponents.TextField).toBeDefined();
    expect(AdminComponents.TextAreaField).toBeDefined();
    expect(AdminComponents.ImageUploadField).toBeDefined();
    expect(AdminComponents.ToggleField).toBeDefined();
    expect(AdminComponents.UrlField).toBeDefined();
  });
});