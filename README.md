# teste-funcional-OCPP
O projeto implementa um Central System (CS) OCPP 1.6 J em Node.js (Express/WebSocket). Ele permite o controle remoto de um Charge Point (CP) via API REST. O frontend envia requisições HTTP (/start-transaction e /stop-transaction), que são traduzidas pelo backend em comandos OCPP para iniciar ou parar o carregamento, gerindo o estado da transação.
