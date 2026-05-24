/**
 * Módulo compartilhado para funções de sleep randomizado.
 *
 * Substitui sleep() com valores fixos por intervalos aleatórios que
 * simulam melhor o comportamento real de usuários (tempo de pensamento
 * e ação variáveis).
 *
 * Uso:
 *   import { randomSleep } from './helpers/sleep.js';
 *   randomSleep();          // 0.5s – 3s (padrão)
 *   randomSleep(1, 2);      // 1s – 2s
 *   randomSleep(0.3, 1.3);  // 0.3s – 1.3s
 */

import { sleep } from 'k6';

/**
 * Executa sleep() com duração aleatória entre min e max.
 *
 * @param {number} min - Duração mínima em segundos (padrão: 0.5)
 * @param {number} max - Duração máxima em segundos (padrão: 3)
 */
export function randomSleep(min = 0.5, max = 3) {
  sleep(min + Math.random() * (max - min));
}