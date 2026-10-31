/**
 * Política de senha do painel (ADR-0031): mínimo de 12 caracteres com pelo
 * menos uma letra maiúscula, uma minúscula e um número.
 *
 * Módulo puro, sem dependências de servidor — compartilhado entre a API
 * (`pages/api/admin/users.js`) e o formulário (`components/Admin/AdminUsersTab.js`)
 * para que a regra tenha uma única fonte. O login não valida comprimento: a
 * política vale para criação e troca de senha no painel de Usuários.
 */
// Fonte única do comprimento mínimo: a regex e a mensagem derivam daqui
// (literais repetidos fariam a regra divergir entre si).
export const PASSWORD_MIN_LENGTH = 12;

export const strongPasswordPattern = new RegExp(
  `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{${PASSWORD_MIN_LENGTH},}$`
);

export const passwordPolicyMessage = `A senha deve ter no mínimo ${PASSWORD_MIN_LENGTH} caracteres e conter letra maiúscula, minúscula e número.`;

export function isValidPassword(value) {
  return typeof value === 'string' && strongPasswordPattern.test(value);
}
