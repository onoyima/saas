require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');

const db = require('./db');
const whatsapp = require('./whatsapp');
const ai = require('./ai');
const logger = require('./logger');
const multer = require('multer');
const path = require('path');
const parser = require('./parser');

const upload = multer({ dest: 'uploads/' });

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
            .log-entry:hover { transform: translateX(5px); }
            .log-entry.success { border-left-color: #22c55e; }
            .log-entry.error { border-left-color: #ef4444; }
            .log-entry.warning { border-left-color: #f59e0b; }
            .log-time { color: #64748b; font-size: 0.85em; margin-bottom: 5px; font-family: monospace; }
            .log-action { font-weight: 600; margin-bottom: 8px; font-size: 1.1em; color: #f1f5f9; }
            .log-details { color: #94a3b8; font-size: 0.95em; white-space: pre-wrap; font-family: monospace; background: #1e293b; padding: 10px; border-radius: 4px; overflow-x: hidden; }
            .nav { display: flex; gap: 20px; margin-bottom: 20px; }
            .nav a { color: #94a3b8; text-decoration: none; font-weight: 500; padding: 5px 10px; border-radius: 5px; }
            .nav a:hover { color: #38bdf8; background: #1e293b; }
            .nav a.active { color: #38bdf8; background: #1e293b; border: 1px solid #334155; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="nav">
                <a href="/logs" class="active">Live Logs</a>
                <a href="/admin">Admin Dashboard</a>
            </div>
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

// Admin Dashboard Route
app.get('/admin', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Admin Dashboard - AI Assistant</title>
        <style>
            body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
            .container { max-width: 1000px; margin: 0 auto; }
            .nav { display: flex; gap: 20px; margin-bottom: 20px; }
            .nav a { color: #94a3b8; text-decoration: none; font-weight: 500; padding: 5px 10px; border-radius: 5px; }
            .nav a:hover { color: #38bdf8; background: #1e293b; }
            .nav a.active { color: #38bdf8; background: #1e293b; border: 1px solid #334155; }
            h1 { color: #38bdf8; margin-bottom: 30px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
            .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 25px; }
            h2 { color: #38bdf8; font-size: 1.25em; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
            label { display: block; margin-bottom: 8px; color: #94a3b8; font-size: 0.9em; }
            input, textarea { width: 100%; background: #0f172a; border: 1px solid #334155; border-radius: 6px; padding: 10px; color: #f1f5f9; margin-bottom: 20px; box-sizing: border-box; }
            input:focus, textarea:focus { border-color: #38bdf8; outline: none; }
            button { background: #38bdf8; color: #0f172a; border: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; }
            button:hover { background: #0ea5e9; transform: translateY(-2px); }
            .status { margin-top: 20px; padding: 10px; border-radius: 6px; display: none; }
            .status.success { display: block; background: #065f46; color: #34d399; border: 1px solid #059669; }
            .status.error { display: block; background: #7f1d1d; color: #f87171; border: 1px solid #b91c1c; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="nav">
                <a href="/logs">Live Logs</a>
                <a href="/admin" class="active">Admin Dashboard</a>
            </div>
            <h1>Admin Dashboard</h1>
            
            <div class="grid">
                <!-- Knowledge Ingestion -->
                <div class="card">
                    <h2>Knowledge Ingestion</h2>
                    <form id="knowledgeForm" enctype="multipart/form-data">
                        <label>Business Manual (PDF, DOCX, TXT)</label>
                        <input type="file" name="manual" id="manualFile" required>
                        <button type="submit">Train AI Brain</button>
                    </form>
                    <div id="kStatus" class="status"></div>
                </div>

                <!-- Product Catalog -->
                <div class="card">
                    <h2>Add Product to Catalog</h2>
                    <form id="productForm">
                        <label>Product Name</label>
                        <input type="text" id="pName" placeholder="e.g. Premium Hub" required>
                        <label>Description</label>
                        <textarea id="pDesc" placeholder="Bot features..." rows="3" required></textarea>
                        <label>Price</label>
                        <input type="text" id="pPrice" placeholder="e.g. $150/month" required>
                        <label>Image URL</label>
                        <input type="text" id="pImg" placeholder="https://..." required>
                        <button type="submit">Add Product</button>
                    </form>
                    <div id="pStatus" class="status"></div>
                </div>
            </div>
        </div>

        <script>
            // Knowledge Upload
            document.getElementById('knowledgeForm').onsubmit = async (e) => {
                e.preventDefault();
                const status = document.getElementById('kStatus');
                status.className = 'status'; status.innerText = 'Uploading...'; status.style.display = 'block';
                
                const formData = new FormData();
                formData.append('manual', document.getElementById('manualFile').files[0]);
                
                try {
                    const res = await fetch('/api/upload-manual', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (res.ok) {
                        status.className = 'status success';
                        status.innerText = 'AI Brain Updated Successfully!';
                    } else { throw new Error(data.error); }
                } catch (err) {
                    status.className = 'status error';
                    status.innerText = 'Failed: ' + err.message;
                }
            };

            // Product Add
            document.getElementById('productForm').onsubmit = async (e) => {
                e.preventDefault();
                const status = document.getElementById('pStatus');
                status.className = 'status'; status.innerText = 'Adding...'; status.style.display = 'block';
                
                const payload = {
                    name: document.getElementById('pName').value,
                    description: document.getElementById('pDesc').value,
                    price: document.getElementById('pPrice').value,
                    imageUrl: document.getElementById('pImg').value
                };
                
                try {
                    const res = await fetch('/api/add-product', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (res.ok) {
                        status.className = 'status success';
                        status.innerText = 'Product Added to Catalog!';
                        document.getElementById('productForm').reset();
                    } else { throw new Error(data.error); }
                } catch (err) {
                    status.className = 'status error';
                    status.innerText = 'Failed: ' + err.message;
                }
            };
        </script>
    </body>
    </html>
    `);
});

// Admin API Endpoints
app.post('/api/upload-manual', upload.single('manual'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const text = await parser.extractText(req.file.path);
        await db.saveKnowledge(text, { filename: req.file.originalname });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/add-product', async (req, res) => {
    const { name, description, price, imageUrl } = req.body;
    try {
        await db.addProduct(name, description, price, imageUrl);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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

        // 3. Get Business Context & Products (Knowledge Hub)
        const businessManual = await db.getAllKnowledge();
        const products = await db.getProducts();
        const productListString = products.map(p => `ID: ${p.id} | Name: ${p.name} | Price: ${p.price} | Desc: ${p.description}`).join('\n');

        // 4. Get Conversation History
        const history = await db.getRecentConversation(customer.id, 5);

        // 5. Process with AI
        logger.sendEvent('AI Processing Started', `Analyzing message from ${phoneNumber}...`, 'info');
        const aiResponse = await ai.processIncomingMessage(customer, history, incomingText, businessManual, productListString);
        logger.sendEvent('AI Response Generated', aiResponse, 'success');

        // 6. Update Customer Profile
        if (aiResponse.extracted_profile) {
          await db.updateCustomerProfile(customer.id, aiResponse.extracted_profile);
        }

        // 7. Handle Media Send (Marketing Support)
        if (aiResponse.send_product_id) {
          const product = await db.getProductById(aiResponse.send_product_id);
          if (product && product.image_url) {
            await whatsapp.sendWhatsAppImage(phoneNumber, product.image_url, `Check this out: ${product.name} - ${product.price}`);
          }
        }

        // 8. Save & Send Response
        if (aiResponse.messageToUser) {
          await db.saveMessage(customer.id, 'assistant', aiResponse.messageToUser);
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
