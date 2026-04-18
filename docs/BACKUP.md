# Sistema de Backup

## Visão Geral

Este documento descreve o sistema de backup para o banco de dados PostgreSQL do projeto, projetado para ser robusto e fácil de operar.

## Funcionalidades Principais

- **Backups Automáticos:** Agendados para rodar diariamente.
- **Compressão:** Os arquivos são comprimidos com `gzip` para economizar espaço.
- **Rotação Automática:** Mantém os 10 backups mais recentes, removendo os antigos.
- **Gestão Manual:** Permite criar e restaurar backups via linha de comando ou painel admin.

## Como Usar (Linha de Comando)

- **Criar um backup:**
  ```bash
  npm run backup:create
  ```
- **Restaurar um backup:**
  ```bash
  npm run backup:restore [nome-do-arquivo.sql.gz]
  ```

## Segurança

- **Permissões:** Arquivos de backup são criados com permissões restritas.
- **Acesso:** As operações de backup via API exigem autenticação de administrador.
- **Recomendação:** Armazene cópias dos backups em um local externo e seguro.

## Troubleshooting

| Problema | Solução |
|---|---|
| **Permissão Negada** | Verifique as permissões de escrita no diretório `data/backups/`. |
| **Falha de Conexão** | Certifique-se de que o PostgreSQL está rodando e as credenciais no `.env` estão corretas. |
| **Espaço em Disco** | Remova backups antigos manualmente ou ajuste a configuração de rotação. |

## Documentação Relacionada

- Arquitetura do Projeto
- Guia de Deploy
- Testes e Qualidade