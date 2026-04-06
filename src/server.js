require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const db = require('./db');
const whatsapp = require('./whatsapp');
const ai = require('./ai');
const logger = require('./logger');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Logs Dashboard Routes
app.get('/stream-logs', (req, res) => {
    require('./logger').addClient(req, res);
});

app.get('/logs', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Assistant Logs</title>
        <style>
            body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            h1 { color: #38bdf8; display: flex; align-items: center; gap: 10px; }
            .pulse { height: 12px; width: 12px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; animation: pulse 2s infinite; }
            @keyframes pulse { 0% { transform: scale(0.95); opacity: 0.8; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.8; } }
            .log-box { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; max-height: 70vh; overflow-y: auto; }
            .log-entry { margin-bottom: 15px; padding: 15px; background: #0f172a; border-radius: 8px; border-left: 4px solid #3b82f6; transition: transform 0.2s; }
            .log-entry.success { border-left-color: #22c55e; }
            .log-entry.error { border-left-color: #ef4444; }
            .log-entry.warning { border-left-color: #f59e0b; }
            .log-time { color: #64748b; font-size: 0.85em; margin-bottom: 5px; font-family: monospace; }
            .log-action { font-weight: 600; margin-bottom: 8px; font-size: 1.1em; color: #f1f5f9; }
            .log-details { color: #94a3b8; font-size: 0.95em; white-space: pre-wrap; font-family: monospace; background: #1e293b; padding: 10px; border-radius: 4px; overflow-x: hidden; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1><div class="pulse"></div> Live Webhook & AI Logs</h1>
            <div class="log-box" id="logBox">
                <div style="color: #64748b; text-align: center; padding: 20px;">Waiting for events...</div>
            </div>
        </div>
        <script>
            const logBox = document.getElementById('logBox');
            let isFirst = true;

            const appendLog = (log) => {
                if (isFirst) { logBox.innerHTML = ''; isFirst = false; }
                const el = document.createElement('div');
                el.className = 'log-entry ' + log.status;
                el.innerHTML = \`
                    <div class="log-time">\${log.time}</div>
                    <div class="log-action">\${log.action}</div>
                    \${log.details ? \`<div class="log-details">\${typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}</div>\` : ''}
                \`;
                logBox.prepend(el);
            };

            const sse = new EventSource('/stream-logs');
            sse.onmessage = (e) => {
                const payload = JSON.parse(e.data);
                if (payload.type === 'history') {
                    payload.data.forEach(appendLog);
                } else if (payload.type === 'new_log') {
                    appendLog(payload.data);
                }
            };
        </script>
    </body>
    </html>
    `);
});

// Meta Webhook Verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Incoming Messages Webhook
app.post('/webhook', async (req, res) => {
  const body = req.body;
  logger.sendEvent('Webhook Received', body, 'info');

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0] &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const message = body.entry[0].changes[0].value.messages[0];
      const phoneNumber = message.from;
      const messageId = message.id;
      
      let incomingText = '';

      if (message.type === 'text') {
        incomingText = message.text.body;
      } else if (message.type === 'audio') {
        // Here we would normally implement Whisper API to transcribe audio
        incomingText = "[User sent an audio message - transcript needed]";
      } else {
        res.sendStatus(200);
        return;
      }

      // Mark message as read
      await whatsapp.markMessageAsRead(messageId);

      try {
        // 1. Retrieve or Create Customer
        let customer = await db.getCustomer(phoneNumber);
        if (!customer) {
          const newId = await db.createCustomer(phoneNumber);
          customer = {
            id: newId,
            phone_number: phoneNumber,
            name: null,
            interest: null,
            budget_signals: null,
            urgency_level: 'LOW',
            intent_level: 'LOW_INTENT'
          };
        }

        // 2. Save incoming user message
        await db.saveMessage(customer.id, 'user', incomingText);

        // 3. Get Conversation History
        const history = await db.getRecentConversation(customer.id, 5);

        // 4. Process with AI
        logger.sendEvent('AI Processing Started', `Analyzing message from ${phoneNumber}...`, 'info');
        const aiResponse = await ai.processIncomingMessage(customer, history, incomingText);
        logger.sendEvent('AI Response Generated', aiResponse, 'success');

        // 5. Update Customer Profile
        if (aiResponse.extracted_profile) {
          await db.updateCustomerProfile(customer.id, aiResponse.extracted_profile);
        }

        // 6. Save AI message
        if (aiResponse.messageToUser) {
          await db.saveMessage(customer.id, 'assistant', aiResponse.messageToUser);

          // 7. Send to WhatsApp
          await whatsapp.sendWhatsAppMessage(phoneNumber, aiResponse.messageToUser);
        }

      } catch (error) {
        console.error('Error processing message:', error);
      }
    }
    res.sendStatus(200); // 200 required to acknowledge webhook
  } else {
    res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
