# EAD Platform - White-Label

Plataforma EAD completa com suporte a arquitetura White-Label, processamento de vídeos HLS via FFmpeg, JWT, Swagger, e integração via token de API.

## Pré-requisitos
- **Node.js**: v18+ recomendado.
- **MariaDB** / **MySQL**: em execução e acessível.
- **FFmpeg**: O sistema necessita do FFmpeg instalado na máquina onde a aplicação for rodar para converter vídeos MP4 para HLS.

### Instalação do FFmpeg (Windows)
1. Baixe o FFmpeg executável em [https://ffmpeg.org/download.html](https://ffmpeg.org/download.html) ou via Scoop `scoop install ffmpeg` / Choco `choco install ffmpeg`.
2. Garanta que o diretório `bin` do FFmpeg adicionado nas variáveis de ambiente `PATH` do sistema.

## Instalação e Execução

1. Abra a pasta do projeto no terminal.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o banco de dados:
   - Abra o arquivo `.env` e ajuste seu `DB_USER` e `DB_PASSWORD` (por padrão, tenta user `root` e senha vazia no host localhost).
4. Inicialize o Banco de Dados (cria database, tabelas e seeds):
   ```bash
   npm run init-db
   ```
   **Credenciais Padrão Criadas:**
   - **Admin:** `admin@ead.com` | Senha: `admin123`
   - **Aluno:** `aluno@ead.com` | Senha: `student123`
5. Inicie o Servidor:
   ```bash
   npm run dev
   ```
   (Ou `npm start` para rodar sem nodemon).

## Acesso
- **Plataforma Web (Login)**: [http://localhost:3000](http://localhost:3000)
- **Documentação da API (Swagger)**: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## White-Label e Integrações
- Acesse com o painel de **Admin**, vá em "Config. White-Label" e troque as cores/logo para transformar a interface.
- Vá no menu **Meu Perfil** como Admin para ver seu **Token de API**. Clique em "Acessar Documentação" na tela e, no Swagger UI, use o botão **Authorize** selecionando a opção do token para testar endpoints externos sem estar logado via navegador.
