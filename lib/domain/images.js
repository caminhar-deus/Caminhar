import { createRecord } from '../crud.js';
import { z } from 'zod';

// Define um esquema de validação para os metadados da imagem.
// Isso garante a integridade dos dados antes de qualquer operação no banco.
const imageSchema = z.object({
  filename: z.string({ required_error: 'O nome do arquivo é obrigatório.' }).min(1, 'O nome do arquivo não pode estar vazio.'),
  path: z.string({ required_error: 'O caminho do arquivo é obrigatório.' }).min(1, 'O caminho do arquivo não pode estar vazio.'),
  type: z.string({ required_error: 'O tipo do arquivo é obrigatório.' }).min(1, 'O tipo do arquivo não pode estar vazio.'),
  size: z.number({ required_error: 'O tamanho do arquivo é obrigatório.', invalid_type_error: 'O tamanho do arquivo deve ser um número.' }).int('O tamanho do arquivo deve ser um número inteiro.').positive('O tamanho do arquivo deve ser positivo.'),
  user_id: z.number().int().positive().nullable(),
});

/**
 * Saves image metadata to the database after validation.
 * @param {string} filename 
 * @param {string} relativePath 
 * @param {string} type 
 * @param {number} fileSize 
 * @param {number|null} userId 
 * @param {object} [options] - Opções adicionais, como um cliente de transação.
 * @returns {Promise<Object>} The saved image record.
 */
export async function saveImage(filename, relativePath, type, fileSize, userId, options = {}) {
    const imageData = {
        filename,
        path: relativePath,
        type: type,
        size: fileSize,
        user_id: userId,
    };

    // Valida os dados antes de passá-los para o banco de dados.
    const validatedData = imageSchema.parse(imageData);

    return createRecord('images', validatedData, options);
}