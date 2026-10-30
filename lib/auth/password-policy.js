/**
 * Política de senha do painel (ADR-0031): mínimo de 12 caracteres com pelo
 * menos uma letra maiúscula, uma minúscula e um número.
 *
 * Módulo puro, sem dependências de servidor — compartilhado entre a API
 * (`pages/api/admin/users.js`) e o formulário (`components/Admin/AdminUsersTab.js`)
 * para que a regra tenha uma única fonte. O login não valida comprimento: a
 * política vale para criação e troca de senha no painel de Usuários.
 */
export const PASSWORD_MIN_LENGTH = 12;

export const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

export const passwordPolicyMessage =
  'A senha deve ter no mínimo 12 caracteres e conter letra maiúscula, minúscula e número.';

export function isValidPassword(value) {
  return typeof value === 'string' && strongPasswordPattern.test(value);
}
