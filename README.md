# ⚡ teste-funcional-OCPP - Central System (CS) Node.js

Este projeto implementa um servidor básico que atua como **Central System (CS)** para simular o controle de uma Estação de Carregamento (Charge Point - CP) utilizando o protocolo **OCPP (Open Charge Point Protocol) 1.6 J** via WebSocket.

A aplicação expõe endpoints RESTful (HTTP) que permitem a uma interface de usuário enviar comandos remotos para iniciar e parar transações de carregamento.

## 📌 Visão Geral da Arquitetura

O projeto é dividido em dois ambientes de comunicação:

1.  **Backend (Central System):** Construído com Node.js, Express e o módulo `ws`.
    * Recebe comandos HTTP (via rotas `/start-transaction` e `/stop-transaction`).
    * Envia comandos OCPP (via WebSocket) para o Charge Point.
    * Mantém o controle do estado da transação ativa.
2.  **Frontend (Interface do Usuário):** Uma aplicação simples em HTML, CSS e JavaScript.
    * Oferece botões para interagir com os endpoints REST do Backend.
    * Monitora o status do carregamento e da conexão via WebSocket.

## ⚙️ Backend (server.js) - Central System

O arquivo `server.js` é o coração do projeto. Ele gerencia as conexões WebSocket com o CP e traduz as ações HTTP em mensagens OCPP.

### Funcionalidades Chave

* **Comunicação Bidirecional:** Utiliza WebSocket para comunicação persistente com o CP.
* **Gerenciamento de Requisições Pendentes:** O `Map` `pendingRequests` e a função `sendOcppRequest` (baseada em `Promise`) garantem que o servidor espere a resposta (`CallResult` - Tipo 3) do CP antes de prosseguir com fluxos encadeados.
* **Rotas de Controle Remoto:**
    * `POST /start-transaction`: Inicia o fluxo remoto de carregamento.
    * `POST /stop-transaction`: Inicia a parada remota do carregamento.

### Estrutura OCPP

O protocolo utiliza arrays JSON para a comunicação, seguindo o padrão `[MessageTypeId, UniqueId, Action/Payload]`.

| Tipo (`messageType`) | Descrição |
| :--- | :--- |
| **`2`** | Chamada (Call): Uma requisição do CS para o CP (e.g., `RemoteStartTransaction.req`) |
| **`3`** | Resultado da Chamada (CallResult): Resposta bem-sucedida do CP. |
| **`4`** | Erro de Chamada (CallError): Resposta de erro. |

## 🧭 Fluxos de Transação (OCPP Call Actions)

### 1. Início Remoto da Transação (`/start-transaction`)

O endpoint executa a seguinte sequência de comandos para o Charge Point (CP):

1.  `GetConfiguration.req`
2.  `RemoteStartTransaction.req`
3.  `Authorize.req`
4.  `StatusNotification.req` (Status de 'Charging')

### 2. Parada Remota da Transação (`/stop-transaction`)

O endpoint envia o comando necessário para encerrar a transação ativa:

1.  `RemoteStopTransaction.req`

## 💻 Frontend (HTML/CSS/JS) - Interface

A interface do usuário está contida nos arquivos `index.html`, `style.css` e `script.js` e interage diretamente com o backend:

* **Endereçamento:** O `script.js` está configurado para o servidor no IP **`10.0.0.230:8080`**.
    ```javascript
    const WEBSOCKET_URL = 'ws://10.0.0.230:8080';
    const API_URL = '[http://10.0.0.230:8080](http://10.0.0.230:8080)'; 
    ```

## 🚀 Configuração e Instalação

### Pré-requisitos

* Node.js (LTS)
* npm

### Passos para Execução

1.  **Instale as dependências (para o Backend):**
    ```bash
    npm install express ws cors
    ```
2.  **Inicie o Servidor (Backend):**
    ```bash
    node server.js
    ```
    O servidor HTTP/WebSocket estará rodando na porta **8080**.
3.  **Acesse a Interface (Frontend):**
    Abra o arquivo **`index.html`** no seu navegador para começar a interagir.

---
