import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock de dependências externas
jest.mock('fs');
jest.mock('path');

// Importa a função a ser testada
import { getAllFiles } from '../lib/find-unused.js'; // Ajuste o caminho se necessário

// Mock the main script execution to prevent side effects during testing
jest.mock('../lib/find-unused.js', () => {
  const actual = jest.requireActual('../lib/find-unused.js');
  return {
    ...actual,
    // Mock the main script execution but keep the function
    getAllFiles: actual.getAllFiles
  };
}, { virtual: true });

describe('find-unused.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllFiles', () => {
    it('deve retornar uma lista vazia se o diretório não existir', () => {
      fs.existsSync.mockReturnValue(false);

      // Executa a função
      const result = getAllFiles('/testdir');

      // Verificações
      expect(result).toEqual([]);
      expect(fs.existsSync).toHaveBeenCalledWith('/testdir');
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it('deve lidar com arquivos sem extensão', () => {
       fs.existsSync.mockReturnValue(true);
       fs.readdirSync.mockReturnValue(['file1', 'file2.js']);

       fs.statSync.mockImplementation((filePath) => ({
         isDirectory: () => false,
       }));

       path.join.mockImplementation((dir, file) => `${dir}/${file}`);
       path.extname.mockImplementation((file) => `.${file.split('.').pop()}`);
       path.normalize.mockImplementation((filePath) => filePath);

       // Executa a função
       const result = getAllFiles('/testdir');
   
       expect(result).toEqual([ '/testdir/file2.js' ]);
     });

    it('deve usar as extensões configuradas para filtrar os arquivos', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(['file1.js', 'file2.txt', 'file3.jsx']);


      fs.statSync.mockImplementation((filePath) => ({
        isDirectory: () => false,


      }));

      path.join.mockImplementation((dir, file) => `${dir}/${file}`);
      path.normalize.mockImplementation((filePath) => filePath);
      path.extname.mockImplementation((file) => `.${file.split('.').pop()}`);

      // Executa a função
      const result = getAllFiles('/testdir');

      // Verificações
      expect(result).toEqual(['/testdir/file1.js', '/testdir/file3.jsx']);
      expect(fs.existsSync).toHaveBeenCalledWith('/testdir');
      expect(fs.readdirSync).toHaveBeenCalledWith('/testdir');
      expect(fs.statSync).toHaveBeenCalledTimes(3);
      expect(path.join).toHaveBeenCalledTimes(3);
      expect(path.extname).toHaveBeenCalledTimes(3);
    });
  });
});
