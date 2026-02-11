## 🔐 Security Zone – Card Game Digital 🎮⚔️✨

O Security Zone é um card game digital inspirado em títulos como Legends of Runeterra e Pokémon TCG, mas com um toque único: ele ensina, de forma divertida e estratégica, os perigos das redes Wi-Fi abertas e as ferramentas de proteção digital.

Cada carta representa uma ameaça cibernética, uma defesa tecnológica ou uma magia especial. O objetivo é reduzir a Vida Digital do adversário a 0, utilizando estratégia, ataque, defesa e efeitos especiais.

## 🛠️ Tecnologias Utilizadas

[![Technologies](https://skillicons.dev/icons?i=react,js,html,css,tailwind,nodejs,express,mysql,prisma,figma,git,vscode,vite,firebase,websocket)](https://skillicons.dev)

- **React + Vite** – Frontend moderno e rápido  
- **Tailwind CSS** – Estilização responsiva e customizada  
- **Node.js + Express** – Backend para lógica do jogo (opcional)  
- **Firebase** – Banco de dados e funcionalidades distribuídas  
- **MySQL + Prisma** – Persistência de dados estruturada  
- **Git & VSCode** – Versionamento e desenvolvimento  
- **Figma** – Design e prototipagem  

## 👍 Benefícios do Jogo

🧠 **Educação Digital:** ensina conceitos de segurança em redes Wi-Fi abertas.

🎮 **Diversão + Aprendizado:** mecânica de card game com propósito educativo.

👥 **Multiplayer Local (futuro):** possibilidade de jogar em duplas ou 1x1.

## 📜 Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo [📜 LICENSE](LICENSE) para mais detalhes.

---

## 👥 Devs

- Camila Lídia  
- Rafael Figueiredo


```
Security-Zone
├─ Infra
│  ├─ docker
│  │  ├─ frontend.Dockerfile
│  │  └─ node.Dockerfile
│  └─ nginx
│     └─ default.conf
├─ README.md
├─ docker-compose.yml
├─ frontend
│  ├─ dist
│  │  ├─ assets
│  │  │  ├─ index-0ri-Tx85.css
│  │  │  └─ index-Gnpqnpam.js
│  │  ├─ img
│  │  │  ├─ atualizacao.png
│  │  │  ├─ capturapacotes.png
│  │  │  ├─ detectarede.png
│  │  │  ├─ escudo.png
│  │  │  ├─ eviltwin.png
│  │  │  ├─ firewall.png
│  │  │  ├─ injecaoscript.png
│  │  │  ├─ loginFake.png
│  │  │  ├─ logoSZ.png
│  │  │  ├─ malicioso.png
│  │  │  ├─ modonavega.png
│  │  │  ├─ senhaforte.png
│  │  │  └─ vpn.png
│  │  ├─ index.html
│  │  └─ vite.svg
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ postcss.config.js
│  ├─ public
│  │  ├─ img
│  │  │  └─ cards
│  │  │     ├─ attsoftware.png
│  │  │     ├─ backupseguro.png
│  │  │     ├─ capturapacotes.png
│  │  │     ├─ decredesfalsas.png
│  │  │     ├─ engsocial.png
│  │  │     ├─ escudodigital.png
│  │  │     ├─ eviltwin.png
│  │  │     ├─ exploracaoapi.png
│  │  │     ├─ fakelogin.png
│  │  │     ├─ firewall.png
│  │  │     ├─ forcabruta.png
│  │  │     ├─ injecaoscript.png
│  │  │     ├─ logsauditoria.png
│  │  │     ├─ malicioso.png
│  │  │     ├─ manmiddle.png
│  │  │     ├─ modonavsegura.png
│  │  │     ├─ pontofantasma.png
│  │  │     ├─ quebraautorizacao.png
│  │  │     ├─ senhaforte.png
│  │  │     ├─ verso.png
│  │  │     └─ vpnativada.png
│  │  └─ vite.svg
│  ├─ src
│  │  ├─ App.css
│  │  ├─ App.jsx
│  │  ├─ assets
│  │  │  └─ react.svg
│  │  ├─ firebase
│  │  │  ├─ auth.js
│  │  │  ├─ config.js
│  │  │  └─ context.js
│  │  ├─ index.css
│  │  ├─ main.jsx
│  │  ├─ pages
│  │  │  ├─ BattleArena
│  │  │  │  ├─ battleArena.jsx
│  │  │  │  ├─ components
│  │  │  │  │  ├─ ActionBar.jsx
│  │  │  │  │  ├─ ArenaHeader.jsx
│  │  │  │  │  ├─ Board.jsx
│  │  │  │  │  ├─ BoardSlot.jsx
│  │  │  │  │  ├─ CardPreview.jsx
│  │  │  │  │  ├─ EndTurnButton.jsx
│  │  │  │  │  ├─ EnergyOrb.jsx
│  │  │  │  │  ├─ EventLog.jsx
│  │  │  │  │  ├─ HandCarousel.jsx
│  │  │  │  │  ├─ Overlays
│  │  │  │  │  │  ├─ ConfirmActionModal.jsx
│  │  │  │  │  │  └─ TargetPickerModal.jsx
│  │  │  │  │  ├─ Stage.jsx
│  │  │  │  │  └─ ZoneCard.jsx
│  │  │  │  ├─ hooks
│  │  │  │  │  ├─ useActionQueue.js
│  │  │  │  │  ├─ useMatchSession.js
│  │  │  │  │  └─ useSelections.js
│  │  │  │  └─ utils
│  │  │  │     ├─ actionBuilders.js
│  │  │  │     ├─ mappers.js
│  │  │  │     └─ stateSelectors.js
│  │  │  ├─ GameHome
│  │  │  │  ├─ CardsView
│  │  │  │  │  ├─ Decks
│  │  │  │  │  │  ├─ CreateDeck.jsx
│  │  │  │  │  │  ├─ DeckActions.jsx
│  │  │  │  │  │  ├─ EditDeck.jsx
│  │  │  │  │  │  └─ decksView.jsx
│  │  │  │  │  └─ cardsView.jsx
│  │  │  │  ├─ ProfileView
│  │  │  │  │  ├─ components
│  │  │  │  │  │  ├─ ConfirmModal
│  │  │  │  │  │  │  └─ confirmModal.jsx
│  │  │  │  │  │  ├─ EditProfile
│  │  │  │  │  │  │  └─ editProfile.jsx
│  │  │  │  │  │  ├─ GoogleLink
│  │  │  │  │  │  │  └─ googleLink.jsx
│  │  │  │  │  │  ├─ ProfileHistory
│  │  │  │  │  │  │  └─ profileHistory.jsx
│  │  │  │  │  │  └─ ProfileSettings
│  │  │  │  │  │     └─ profileSettings.jsx
│  │  │  │  │  ├─ hooks
│  │  │  │  │  │  └─ useProfile.js
│  │  │  │  │  └─ profileView.jsx
│  │  │  │  └─ gameHome.jsx
│  │  │  ├─ GameModeSelect
│  │  │  │  ├─ GameModeSelect.jsx
│  │  │  │  └─ components
│  │  │  │     ├─ BotSelectModal.jsx
│  │  │  │     └─ DeckPickerFooter.jsx
│  │  │  ├─ LandingPage
│  │  │  │  ├─ components
│  │  │  │  │  ├─ carrosel.jsx
│  │  │  │  │  ├─ descriptions.jsx
│  │  │  │  │  ├─ footer.jsx
│  │  │  │  │  ├─ gameEx.jsx
│  │  │  │  │  ├─ modalAuth.jsx
│  │  │  │  │  └─ navbar.jsx
│  │  │  │  └─ landingpage.jsx
│  │  │  ├─ Login
│  │  │  │  └─ login.jsx
│  │  │  └─ Register
│  │  │     └─ register.jsx
│  │  ├─ services
│  │  │  └─ api.js
│  │  └─ utils
│  │     └─ auth.js
│  ├─ tailwind.config.js
│  └─ vite.config.js
├─ services
│  ├─ bot-service
│  │  ├─ .env
│  │  ├─ .env.example
│  │  ├─ Dockerfile
│  │  ├─ eslint.config.js
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  └─ src
│  │     ├─ ai
│  │     │  ├─ botEasy.js
│  │     │  └─ botNormal.js
│  │     ├─ controllers
│  │     │  └─ botControllers.js
│  │     ├─ routes
│  │     │  └─ botRoutes.js
│  │     └─ server.js
│  ├─ gateway-api
│  │  ├─ .env
│  │  ├─ .env.example
│  │  ├─ Dockerfile
│  │  ├─ eslint.config.js
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ prisma
│  │  │  ├─ migrations
│  │  │  │  └─ migration_lock.toml
│  │  │  ├─ schema.prisma
│  │  │  ├─ seed.js
│  │  │  └─ seedUsersBotsDecks.js
│  │  └─ src
│  │     ├─ config
│  │     │  └─ firebaseAdmin.js
│  │     ├─ controllers
│  │     │  ├─ authController.js
│  │     │  ├─ deckController.js
│  │     │  ├─ internalDeckController.js
│  │     │  ├─ matchProxyController.js
│  │     │  └─ playerController.js
│  │     ├─ middleware
│  │     │  └─ authMiddleware.js
│  │     ├─ prismaClient.js
│  │     ├─ routes
│  │     │  ├─ authRoutes.js
│  │     │  ├─ cardsPublicRoutes.js
│  │     │  ├─ deckRoutes.js
│  │     │  ├─ internalRoutes.js
│  │     │  ├─ matchRoutes.js
│  │     │  ├─ playerRoutes.js
│  │     │  └─ profile.js
│  │     ├─ server.js
│  │     └─ utils
│  │        ├─ httpClient.js
│  │        └─ jwtUtils.js
│  ├─ match-service
│  │  ├─ .env
│  │  ├─ .env.example
│  │  ├─ Dockerfile
│  │  ├─ eslint.config.js
│  │  ├─ package-lock.json
│  │  ├─ package.json
│  │  ├─ prisma
│  │  │  └─ schema.prisma
│  │  └─ src
│  │     ├─ controllers
│  │     │  └─ matchController.js
│  │     ├─ prismaClient.js
│  │     ├─ routes
│  │     │  └─ matchRoutes.js
│  │     ├─ server.js
│  │     └─ services
│  │        ├─ botClient.js
│  │        ├─ gatewayClient.js
│  │        ├─ rulesClient.js
│  │        └─ stateService.js
│  └─ rules-service
│     ├─ .env
│     ├─ .env.example
│     ├─ Dockerfile
│     ├─ eslint.config.js
│     ├─ package-lock.json
│     ├─ package.json
│     └─ src
│        ├─ controllers
│        │  └─ rulesController.js
│        ├─ engine
│        │  ├─ endTurn.js
│        │  ├─ resolveAbility.js
│        │  ├─ resolveAttack.js
│        │  ├─ resolvePlayCard.js
│        │  ├─ resolveSpell.js
│        │  └─ validateAction.js
│        ├─ routes
│        │  └─ rulesRoutes.js
│        └─ server.js
└─ src
   └─ pages
      └─ BattleArena
         ├─ battleArena.jsx
         ├─ components
         │  ├─ ActionBar.jsx
         │  ├─ ArenaHeader.jsx
         │  ├─ Board.jsx
         │  ├─ BoardSlot.jsx
         │  ├─ CardPreview.jsx
         │  ├─ EventLog.jsx
         │  ├─ HandCarousel.jsx
         │  └─ Overlays
         │     ├─ ConfirmActionModal.jsx
         │     └─ TargetPickerModal.jsx
         ├─ hooks
         │  ├─ useActionQueue.js
         │  ├─ useMatchSession.js
         │  └─ useSelections.js
         └─ utils
            ├─ actionBuilders.js
            ├─ mappers.js
            └─ stateSelectors.js

```