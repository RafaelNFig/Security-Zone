# Gateway API

## Descrição
O **Gateway API** atua como a porta de entrada principal (API REST) para o front-end e os usuários. Ele é responsável pelo gerenciamento de contas, autenticação, inventário (cartas e decks) e criação/listagem de partidas. O Gateway não gerencia o estado quente da partida em memória, delegando o controle de jogo para o `match-service`.

## Funcionalidades
- **Auth**: Registro, login e validação de tokens JWT / Firebase.
- **Inventário**: Listagem de cartas do jogador e gerenciamento de decks.
- **Matchmaking**: Busca de partidas ativas e criação de novas partidas contra bots (vsBot) ou jogadores (PvP).
- **Seed**: Popula o banco de dados inicial (usuários, bots e cartas).

## Tecnologias
- Node.js + Express
- Prisma (ORM) + MySQL
- JWT & Firebase Admin

## Variáveis de Ambiente
- `PORT` (padrão: 3000)
- `DATABASE_URL` (conexão Prisma MySQL)
- `JWT_SECRET` e `JWT_EXPIRES_IN`

## Como Rodar Isoladamente
```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```
