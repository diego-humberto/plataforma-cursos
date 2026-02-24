/**
 * Hook mantido por compatibilidade.
 * A lógica de salvamento de sessão foi movida para a subscription
 * no nível da store (useFocusTimer.ts) para funcionar mesmo quando
 * o usuário navega para fora da página /foco.
 */
export function useFocusSessionSaver() {
  // No-op: salvamento agora é feito via subscription em useFocusTimer.ts
}
