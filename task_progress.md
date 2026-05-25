# Plano de Ação - Correção das Falhas nos Testes de Carga

## Status: EM ANDAMENTO

- [x] Analisar todos os arquivos envolvidos (26 arquivos)
- [ ] P1 - Corrigir /api/settings para retornar fallback quando chave não existir
- [ ] P1 - Criar seed de configurações (site_name)
- [ ] P2 - Adicionar proteção contra IP spoofing no rate-limit middleware
- [ ] P3 - Ajustar rate limit para cenário DDoS (com suporte a IP real via socket)
- [ ] P4 - Corrigir API de vídeos (handleDelete aceitar body)
- [ ] P5 - Corrigir API de músicas (handleDelete aceitar query param)
- [ ] P6 - Corrigir script stress-test-combined (fallback quando setup falha)
- [ ] P7 - Adicionar thresholds reais nos testes de segurança ip-spoofing
- [ ] Validar todas as correções