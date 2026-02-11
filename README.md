# 🔐 Security Zone – Arquitetura de Card Game Digital Educacional

## 📌 Visão Geral

O **Security Zone** é um card game digital multiplayer com finalidade educacional, inspirado em jogos como *Legends of Runeterra* e *Pokémon TCG*.  

O projeto foi concebido com o objetivo de unir **entretenimento e conscientização em segurança digital**, abordando de forma estratégica e interativa os riscos associados a redes Wi-Fi abertas e as principais ferramentas de proteção cibernética.

Cada carta representa:

- 🦠 Ameaças cibernéticas  
- 🛡️ Mecanismos de defesa  
- ✨ Efeitos e ações estratégicas  

O objetivo da partida é reduzir a **Vida Digital** do adversário a zero, respeitando regras formais de turno, validações estruturadas e aplicação de efeitos.

---

## 🏗️ Arquitetura do Sistema

O sistema foi desenvolvido com base em princípios de **Arquitetura Orientada a Serviços (SOA)**, garantindo:

- Separação clara de responsabilidades  
- Escalabilidade modular  
- Facilidade de manutenção  
- Isolamento de regras de negócio  

### Estrutura Arquitetural

Frontend (React + Vite)
↓
Gateway API (Node.js + Express)
↓
Match Service (Orquestração da Partida)
↓
Rules Service (Validação de Regras)
↓
MySQL (Persistência via Prisma ORM)


---

## 🔄 Fluxo de Comunicação

1. O cliente (frontend) envia uma ação de jogo.
2. O Gateway API autentica e encaminha a requisição.
3. O Match Service gerencia o estado da partida.
4. O Rules Service valida e aplica as regras do jogo.
5. O resultado retorna ao frontend.
6. Atualizações em tempo real são propagadas via WebSocket.

Essa abordagem garante que **a lógica de regras permaneça desacoplada da interface**, mantendo o sistema coerente com boas práticas de engenharia de software.

---

## 🛠️ Tecnologias Utilizadas

[![Technologies](https://skillicons.dev/icons?i=react,js,html,css,tailwind,nodejs,express,mysql,prisma,docker,nginx,git,vscode,vite,figma)](https://skillicons.dev)

### 🎨 Frontend
- React + Vite  
- JavaScript (ESM)  
- Tailwind CSS  
- Comunicação via REST e WebSocket  

### ⚙️ Backend
- Node.js (padrão ESM)  
- Express  
- Prisma ORM  
- MySQL  
- WebSocket  

### 🐳 Infraestrutura
- Docker  
- Docker Compose  
- Nginx (Reverse Proxy)  
- Containers isolados por serviço  

---

## 🧠 Organização dos Serviços

### 🔹 Gateway API
Responsável por:
- Autenticação
- Middleware de segurança
- Encaminhamento de requisições
- Comunicação WebSocket
- Controle de sessão

### 🔹 Match Service
Responsável por:
- Controle de turno
- Gerenciamento do estado da partida
- Orquestração das ações do jogador
- Integração com bot automatizado

### 🔹 Rules Service
Responsável por:
- Validação formal das regras
- Verificação de decks
- Aplicação de efeitos
- Regras de combate
- Garantia de integridade da partida

---

## 🎮 Funcionalidades Implementadas

- ✔️ Sistema de criação e gerenciamento de decks  
- ✔️ Validação de deck antes da partida  
- ✔️ Controle estruturado de turnos  
- ✔️ Execução de ataques e efeitos  
- ✔️ Comunicação em tempo real  
- ✔️ Integração com jogador automatizado (bot)  
- ✔️ Persistência estruturada com Prisma  

---

## 🔐 Conceitos de Engenharia Aplicados

- Arquitetura Orientada a Serviços (SOA)  
- Separação de responsabilidades  
- Comunicação entre microsserviços  
- Validação centralizada de regras  
- Persistência relacional  
- Controle de estado distribuído  
- Orquestração via Docker Compose  

---

## 🚧 Trabalhos Futuros

- Refinamento das validações do Rules Service  
- Ajuste completo de compatibilidade entre frontend e serviços  
- Aprimoramento do sistema de autenticação  
- Melhorias no tratamento de exceções e logs  
- Otimizações de performance e escalabilidade  

---

## 📜 Licença

Este projeto está licenciado sob a Licença MIT.  
Consulte o arquivo `LICENSE` para mais detalhes.

---

## 👥 Desenvolvedores

- Camila Lídia  
- Rafael Figueiredo  
