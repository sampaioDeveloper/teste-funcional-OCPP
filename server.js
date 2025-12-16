const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

let wsClient = null; // Armazena a conexão WebSocket
let activeTransactionId = 11; // ID da transação ativa
let pendingRequests = new Map(); // Para esperar respostas do carregador

// Criar servidor HTTP
const server = http.createServer(app);

// Configurar WebSocket
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log(' Cliente WebSocket conectado.');
  wsClient = ws;

  ws.on('message', (message) => {
    const msgString = message.toString();
    console.log(' Mensagem recebida:', msgString);
    handleOcppMessage(ws, msgString);
  });

  ws.on('close', () => {
    console.log(' Cliente WebSocket desconectado.');
    wsClient = null;
  });

  ws.on('error', (error) => {
    console.error(' Erro no WebSocket:', error);
  });
});

// Função para enviar requisição OCPP com retorno de promessa
function sendOcppRequest(ws, action, payload) {
  return new Promise((resolve, reject) => {
    if (!ws) return reject('Nenhum cliente websocket conectado.');

    const messageId = `${Date.now()}-${Math.random()}`;
    const request = [2, messageId, action, payload];

    pendingRequests.set(messageId, resolve);

    ws.send(JSON.stringify(request), (error) => {
      if (error) {
        console.error(' Erro ao enviar mensagem WebSocket:', error);
        reject(error);
      } else {
        console.log(` Mensagem "${action}" enviada.`);
      }
    });
  });
}

// Rota para iniciar a transação
app.post('/start-transaction', async (req, res) => {
  if (!wsClient) {
    return res.status(500).json({ error: 'Nenhum cliente WebSocket conectado.' });
  }

  console.log('⚡ Iniciando transação remota...');

  try {
    // Passo 1: Enviar GetConfiguration.req
    await sendOcppRequest(wsClient, 'GetConfiguration', {});
    console.log('GetConfiguration enviado.');

    // Passo 2: Enviar RemoteStartTransaction.req
    const remoteStartResponse = await sendOcppRequest(wsClient, 'RemoteStartTransaction', {
      idTag: '12345',
      connectorId: 1,
    });
    console.log('RemoteStartTransaction enviado.');
    console.log(remoteStartResponse + "gabriel")
    // Passo 3: Esperar autorização
    await sendOcppRequest(wsClient, 'Authorize', {
      idTag: '12345',
    });
    console.log('Autorizar solicitado.');

    // Passo 4: StatusNotification
    await sendOcppRequest(wsClient, 'StatusNotification', {
      connectorId: 1,
      errorCode: 'NoError',
      status: 'Charging',
      timestamp: new Date().toISOString(),
    });
    console.log('StatusNotification enviado.');

    res.json({ status: 'Transação iniciada com sucesso.' });
  } catch (error) {
    console.error('Erro ao iniciar transação remota:', error);
    res.status(500).json({ error: 'Falha ao iniciar transação.' });
  }
});

// Rota para parar a transação
app.post('/stop-transaction', async (req, res) => {
	console.log('wsClient:', wsClient);
	console.log('activeTransactionId:', activeTransactionId);
    if (!wsClient || !activeTransactionId) {
      return res.status(400).json({ error: 'Nenhuma transação ativa para parar.' });
    }

    console.log(`Parando transação ${activeTransactionId}...`);

    try {
      const response = await sendOcppRequest(wsClient, 'RemoteStopTransaction', {
        transactionId: activeTransactionId,
      });

      res.json({ status: 'Requisição de parada enviada', response });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao parar transação.' });
    }
  });

// Manipulador de mensagens OCPP
function handleOcppMessage(ws, message) {
  try {
    const parsedMessage = JSON.parse(message);
    console.log(parsedMessage + "gabriel na Angelim")
    const [messageType, messageId, action, payload] = parsedMessage;
    console.log(messageType, messageId, action, payload)

    console.log(`Ação recebida: ${action}`);

    // Se for uma resposta de uma requisição pendente
    if (messageType === 3 && pendingRequests.has(messageId)) {
      pendingRequests.get(messageId)(payload);
      pendingRequests.delete(messageId);
      return;
    }

    switch (action) {
      case 'BootNotification':
        sendOcppResponse(ws, messageId, {
          currentTime: new Date().toISOString(),
          interval: 300,
          status: 'Accepted',
        });
        break;

      case 'Heartbeat':
        sendOcppResponse(ws, messageId, { currentTime: new Date().toISOString() });
        break;

      case 'Authorize':
        sendOcppResponse(ws, messageId, { idTagInfo: { status: 'Accepted' } });
        break;

      case 'StartTransaction':
        handleStartTransaction(ws, messageId, payload);
        break;

      case 'StopTransaction':
        handleStopTransaction(ws, messageId, payload);
        break;

      case 'StatusNotification':
        sendOcppResponse(ws, messageId, { status: 'Accepted' });
        break;

      default:
        console.log(`Ação desconhecida: ${action}`);
        break;
    }
  } catch (error) {
    console.error('Erro ao processar mensagem:', error);
  }
}

// Função para tratar StartTransaction
function handleStartTransaction(ws, messageId, payload) {
  console.log(payload.connectorId + "negao do worship")
  activeTransactionId = payload.connectorId;

  console.log(`Transação ${activeTransactionId} iniciada com sucesso.`);
  sendOcppResponse(ws, messageId, {
    transactionId: activeTransactionId,
    idTagInfo: { status: 'Accepted' },
  });
}

// Função para tratar StopTransaction
function handleStopTransaction(ws, messageId, payload) {
  console.log(`Transação ${payload.connectorId} parada.`);
  activeTransactionId = null; 
  sendOcppResponse(ws, messageId, { status: 'Accepted' });
}

// Função para enviar resposta OCPP
function sendOcppResponse(ws, messageId, payload) {
  const response = [3, messageId, payload];
  ws.send(JSON.stringify(response));
}

// Iniciar o servidor HTTP
server.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
  