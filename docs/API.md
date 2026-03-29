# Documentação da API - Projeto Caminhar

Este documento descreve os principais endpoints da API do projeto, divididos entre a API Pública (para consumo do site) e a API Administrativa (para o painel de gestão).

## Autenticação

- **API Pública**: Os endpoints são abertos, mas protegidos por um sistema de *Rate Limiting* para evitar abuso.
- **API Administrativa**: Todos os endpoints em `/api/admin/*` são protegidos e exigem um token JWT válido no cabeçalho `Authorization`.
  ```
  Authorization: Bearer <seu-token-jwt>
  ```

---

## 1. API Pública

Endpoints otimizados para performance, com cache, para servir o conteúdo do site.

### `GET /api/posts`

Retorna uma lista paginada de posts publicados. Suporta busca por termo.

**Parâmetros (Query)**:

- `page` (opcional): Número da página. Padrão: `1`.
- `limit` (opcional): Itens por página. Padrão: `10`, Máximo: `100`.
- `search` (opcional): Termo para buscar no título e conteúdo dos posts.

**Exemplo de Resposta (Sucesso `200 OK`)**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Título do Post",
      "slug": "titulo-do-post",
      "excerpt": "Um breve resumo do post...",
      "image_url": "/uploads/imagem.png",
      "published": true,
      "created_at": "2026-03-29T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 2. API Administrativa

Endpoints para gerenciar o conteúdo através do painel de administração.

### Recurso: Posts (`/api/admin/posts`)

- **`GET /`**: Retorna uma lista paginada de **todos** os posts (publicados e rascunhos).
- **`POST /`**: Cria um novo post.
- **`PUT /`**: Atualiza um post existente.
- **`DELETE /`**: Deleta um post.

### Recurso: Vídeos (`/api/admin/videos`)

- **`GET /`**: Retorna uma lista paginada de todos os vídeos.
- **`POST /`**: Cria um novo vídeo.
- **`PUT /`**: Atualiza um vídeo existente ou reordena a lista.
- **`DELETE /`**: Deleta um vídeo.

### Recurso: Configurações (`/api/settings`)

- **`GET /`**: Retorna todas as configurações do site.
- **`PUT /`**: Atualiza uma ou mais configurações.

### Utilitários

#### `POST /api/upload-image`

Realiza o upload de uma imagem para o servidor. Espera um `multipart/form-data`.

#### `POST /api/admin/fetch-youtube`

Busca metadados (como o título) de um vídeo do YouTube a partir de uma URL.

- **Corpo da Requisição**: `{"url": "https://www.youtube.com/watch?v=..."}`
- **Resposta de Sucesso**: `{"title": "Título do Vídeo"}`