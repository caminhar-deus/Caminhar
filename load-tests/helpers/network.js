// Módulo compartilhado para funções de rede
// Nota: IP spoofing é usado nos testes para evitar rate limit.
// Consulte a seção 2.2 do UPGRADE_load-tests.md para discussão sobre isso.

export function getRandomIP() {
  const octet = () => Math.floor(Math.random() * 255);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}