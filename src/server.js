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
const paystack = require('./paystack');

const upload = multer({ dest: 'uploads/' });

const app = express();
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Success Page for Paystack Callback
app.get('/payment-success', (req, res) => {
    res.send(`
    <body style="font-family:sans-serif; text-align:center; padding-top:100px; background:#0f172a; color:white;">
        <h1 style="color:#22c55e;">Payment Successful! ✅</h1>
        <p>Your transaction was processed. You can now close this tab and return to WhatsApp.</p>
        <button onclick="window.close()" style="padding:10px 20px; background:#38bdf8; border:none; border-radius:5px; cursor:pointer;">Close Tab</button>
    </body>
    `);
});

// Revenue Reports Dashboard
app.get('/reports', async (req, res) => {
    try {
        const { daily, monthly } = await db.getRevenueReports();
        
        res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Revenue Reports - AI Assistant</title>
            <style>
                body { font-family: 'Inter', sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; }
                .container { max-width: 1000px; margin: 0 auto; }
                .nav { display: flex; gap: 20px; margin-bottom: 20px; }
                .nav a { color: #94a3b8; text-decoration: none; font-weight: 500; padding: 5px 10px; border-radius: 5px; }
                .nav a:hover { color: #38bdf8; background: #1e293b; }
                h1 { color: #38bdf8; margin-bottom: 30px; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 25px; }
                h2 { color: #38bdf8; font-size: 1.25em; margin-bottom: 20px; border-bottom: 1px solid #334155; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; }
                th { text-align: left; color: #94a3b8; padding: 10px; border-bottom: 1px solid #334155; }
                td { padding: 10px; border-bottom: 1px solid #1e293b; }
                .amount { color: #22c55e; font-weight: 600; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="nav">
                    <a href="/logs">Live Logs</a>
                    <a href="/admin">Admin Dashboard</a>
                    <a href="/reports" style="color: #38bdf8;">Revenue Reports</a>
                </div>
                <h1>Business Intelligence Report</h1>
                <div class="grid">
                    <div class="card">
                        <h2>Daily Revenue (Last 30 Days)</h2>
                        <table>
                            <tr><th>Date</th><th>Total Revenue</th></tr>
                            \${daily.map(d => \`<tr><td>\${new Date(d.date).toLocaleDateString()}</td><td class="amount">₦\${parseFloat(d.total).toLocaleString()}</td></tr>\`).join('')}
                        </table>
                    </div>
                    <div class="card">
                        <h2>Monthly Overview</h2>
                        <table>
                            <tr><th>Month</th><th>Total Revenue</th></tr>
                            \${monthly.map(m => \`<tr><td>\${m.month}</td><td class="amount">₦\${parseFloat(m.total).toLocaleString()}</td></tr>\`).join('')}
                        </table>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `);
    } catch (err) {
        res.status(500).send('Error loading reports: ' + err.message);
    }
});

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
            <div style="margin-bottom: 20px;">
                <a href="/admin" style="color: #38bdf8; text-decoration: none; margin-right: 20px;">Home</a>
                <a href="/reports" style="color: #38bdf8; text-decoration: none;">Revenue Reports</a>
            </div>
            
            <h1>Admin Dashboard</h1>
            
            <div class="grid">
                <!-- Customer Management -->
                <div class="card" style="grid-column: span 2;">
                    <h2>Customer Management & Follow-up</h2>
                    <div id="customerList" style="overflow-x: auto;">
                        <p style="color: #64748b;">Loading customers...</p>
                    </div>
                </div>

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
                    <form id="productForm" enctype="multipart/form-data">
                        <label>Product Name</label>
                        <input type="text" id="pName" placeholder="e.g. Premium Hub" required>
                        <label>Description</label>
                        <textarea id="pDesc" placeholder="Bot features..." rows="3" required></textarea>
                        <label>Normal Price (Numbers Only)</label>
                        <input type="number" id="pPrice" placeholder="e.g. 5000" step="0.01" required>
                        <label>Cost Price (Hidden from customer)</label>
                        <input type="number" id="pCost" placeholder="e.g. 3000" step="0.01" required>
                        <label>Min Selling Price (Profit Guard)</label>
                        <input type="number" id="pMin" placeholder="e.g. 4500" step="0.01" required>
                        <label>Promo Active?</label>
                        <select id="pPromoActive" style="width:100%; background:#0f172a; color:white; border:1px solid #334155; padding:10px; border-radius:6px; margin-bottom:20px;">
                            <option value="0">No</option>
                            <option value="1">Yes</option>
                        </select>
                        <label>Promo Price (If active)</label>
                        <input type="number" id="pPromoPrice" placeholder="e.g. 4000" step="0.01">
                        <label>Initial Stock Quantity</label>
                        <input type="number" id="pStock" placeholder="e.g. 10" required>
                        <label>Features & Specs</label>
                        <textarea id="pFeatures" placeholder="e.g. 4GB RAM, 128GB Storage..." rows="3"></textarea>
                        <label>Product Image (Photo)</label>
                        <input type="file" id="pImage" accept="image/*" required>
                        <button type="submit">Add Product</button>
                    </form>
                    <div id="pStatus" class="status"></div>
                </div>

                <!-- Admin Training Chat -->
                <div class="card" style="grid-column: span 2; margin-top: 20px; border-color: #38bdf8;">
                    <h2>AI Training & Knowledge Verification</h2>
                    <p style="color: #94a3b8; font-size: 0.9em; margin-bottom: 20px;">Use this chat to "interview" the bot about its knowledge. If it misses something, you can feed it new info directly.</p>
                    <div id="adminChatBox" style="background: #0f172a; height: 300px; border-radius: 8px; overflow-y: auto; padding: 20px; margin-bottom: 20px; border: 1px solid #334155;">
                        <div style="color: #64748b; text-align: center;">Ask the bot what it knows...</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" id="adminChatInput" placeholder="e.g. What do you know about our shipping rules?" style="margin-bottom: 0;">
                        <button id="sendAdminChat" style="width: auto;">Ask AI</button>
                    </div>
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

            // Product Add (Updated for File Upload)
            document.getElementById('productForm').onsubmit = async (e) => {
                e.preventDefault();
                const status = document.getElementById('pStatus');
                status.className = 'status'; status.innerText = 'Adding...'; status.style.display = 'block';
                
                const formData = new FormData();
                formData.append('name', document.getElementById('pName').value);
                formData.append('description', document.getElementById('pDesc').value);
                formData.append('price', document.getElementById('pPrice').value);
                formData.append('costPrice', document.getElementById('pCost').value);
                formData.append('minSellingPrice', document.getElementById('pMin').value);
                formData.append('promoActive', document.getElementById('pPromoActive').value);
                formData.append('promoPrice', document.getElementById('pPromoPrice').value || 0);
                formData.append('stockQuantity', document.getElementById('pStock').value);
                formData.append('features', document.getElementById('pFeatures').value);
                formData.append('productImage', document.getElementById('pImage').files[0]);
                
                try {
                    const res = await fetch('/api/add-product', {
                        method: 'POST',
                        body: formData
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

            // Customer List & Follow-up
            const loadCustomers = async () => {
                const list = document.getElementById('customerList');
                try {
                    const res = await fetch('/api/customers');
                    const data = await res.json();
                    if (data.length === 0) { list.innerHTML = '<p>No customers yet.</p>'; return; }
                    
                    let html = '<table style="width:100%; border-collapse: collapse; margin-top:10px;">';
                    html += '<tr style="text-align:left; border-bottom:1px solid #334155; color:#94a3b8;">';
                    html += '<th style="padding:10px">Customer</th><th style="padding:10px">Intent</th><th style="padding:10px">Action</th></tr>';
                    
                    data.forEach(c => {
                        html += \`
                        <tr style="border-bottom:1px solid #334155;">
                            <td style="padding:10px">\${c.phone_number}<br><small style="color:#64748b">\${c.name || 'Unknown'}</small></td>
                            <td style="padding:10px"><span style="color:\${c.intent_level === 'HIGH_INTENT' ? '#22c55e' : '#38bdf8'}">\${c.intent_level}</span></td>
                            <td style="padding:10px">
                                <button onclick="sendFollowup(\${c.id})" style="padding:5px 10px; font-size:0.8em; width:auto;">AI Follow-up</button>
                            </td>
                        </tr>\`;
                    });
                    html += '</table>';
                    list.innerHTML = html;
                } catch (err) { list.innerHTML = '<p style="color:#ef4444">Failed to load customers.</p>'; }
            };

            window.sendFollowup = async (id) => {
                const btn = event.target;
                const originalText = btn.innerText;
                btn.innerText = 'Sending...'; btn.disabled = true;
                
                try {
                    const res = await fetch('/api/send-followup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ customerId: id })
                    });
                    if (res.ok) alert('AI Follow-up sent successfully!');
                    else throw new Error('Failed to send');
                } catch (err) { alert(err.message); }
                finally { btn.innerText = originalText; btn.disabled = false; }
            };

            // Admin Training Chat Logic
            const chatBox = document.getElementById('adminChatBox');
            const chatInput = document.getElementById('adminChatInput');
            const sendBtn = document.getElementById('sendAdminChat');

            const appendChat = (sender, text) => {
                const div = document.createElement('div');
                div.style.marginBottom = '15px';
                const isAI = sender !== 'Admin';
                div.innerHTML = \`
                    <div style="font-weight: bold; color: \${isAI ? '#22c55e' : '#38bdf8'}; font-size: 0.85em; margin-bottom: 4px;">\${sender}:</div>
                    <div style="background: \${isAI ? '#334155' : '#1e293b'}; padding: 10px; border-radius: 6px; position: relative;">
                        \${text}
                        \${isAI ? \`<button onclick="feedToAI(\\\`\${text.replace(/'/g, "\\\\'")}\\\`)" style="position: absolute; right: -80px; top: 0; font-size: 0.7em; background: #22c55e; color: white; width: auto; padding: 4px 8px;">Feed to AI</button>\` : ''}
                    </div>
                \`;
                chatBox.appendChild(div);
                chatBox.scrollTop = chatBox.scrollHeight;
            };

            sendBtn.onclick = async () => {
                const text = chatInput.value;
                if (!text) return;
                appendChat('Admin', text);
                chatInput.value = '';
                
                try {
                    const res = await fetch('/api/admin-chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    });
                    const data = await res.json();
                    appendChat('AI Assistant', data.response);
                } catch (err) {
                    appendChat('Error', 'Failed to reach AI.');
                }
            };

            window.feedToAI = async (text) => {
                if (!confirm("Are you sure you want to permanently add this to the bot's knowledge?")) return;
                try {
                    await fetch('/api/feed-knowledge', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text })
                    });
                    alert('AI brain updated! It will remember this in the next chat.');
                } catch (err) { alert('Failed to feed knowledge.'); }
            };

            loadCustomers();
        </script>
    </body>
    </html>
    `);
});

// Admin API Endpoints
app.post('/api/upload-manual', upload.single('manual'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
        const text = await parser.extractText(req.file.path, req.file.originalname);
        await db.saveKnowledge(text, { filename: req.file.originalname });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/add-product', upload.single('productImage'), async (req, res) => {
    const { name, description, price, costPrice, minSellingPrice, promoActive, promoPrice, stockQuantity, features } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Please upload an image' });

    const host = req.get('host');
    const protocol = req.protocol;
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    try {
        await db.addProduct({
            name, description, price, costPrice, minSellingPrice,
            promoActive: parseInt(promoActive),
            promoPrice, stockQuantity, features, imageUrl
        });
        res.json({ success: true, imageUrl });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const customers = await db.getAllCustomers();
        res.json(customers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/send-followup', async (req, res) => {
    const { customerId } = req.body;
    try {
        const [customers] = await db.pool.query('SELECT * FROM customers WHERE id = ?', [customerId]);
        if (customers.length === 0) return res.status(404).json({ error: 'Customer not found' });
        
        const customer = customers[0];
        const businessManual = await db.getAllKnowledge();
        const products = await db.getProducts();
        const productListString = products.map(p => `PRODUCT: ${p.name} | Price: ${p.price}`).join('\n');
        const history = await db.getRecentConversation(customer.id, 5);

        const aiResponse = await ai.processIncomingMessage(
            customer, 
            history, 
            "[System Trigger: Send a friendly follow-up to check if the customer needs anything or is ready to proceed]",
            businessManual,
            productListString
        );

        if (aiResponse.messageToUser) {
            await db.saveMessage(customer.id, 'assistant', aiResponse.messageToUser);
            await whatsapp.sendWhatsAppMessage(customer.phone_number, aiResponse.messageToUser);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Training API
app.post('/api/admin-chat', async (req, res) => {
    const { message } = req.body;
    try {
        const businessManual = await db.getAllKnowledge();
        const products = await db.getProducts();
        const productListString = products.map(p => `PRODUCT: ${p.name} | Price: ${p.price}`).join('\n');

        // Special Admin "Self-Reflection" Prompt
        const response = await ai.processAdminQuestion(message, businessManual, productListString);
        res.json({ response });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/feed-knowledge', async (req, res) => {
    const { text } = req.body;
    try {
        await db.saveKnowledge(text, { source: 'Admin Feed' });
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
        const productListString = products.map(p => `
PRODUCT: ${p.name}
- Price: ₦${parseFloat(p.price).toLocaleString()}
- Cost Price (Internal): ₦${parseFloat(p.cost_price).toLocaleString()}
- Min Selling Price: ₦${parseFloat(p.min_selling_price).toLocaleString()}
- Promo Active: ${p.promo_active ? 'YES' : 'NO'}
- Promo Price: ₦${parseFloat(p.promo_price || 0).toLocaleString()}
- Stock Left: ${p.stock_quantity}
- Features: ${p.features}
- Description: ${p.description}`).join('\n---\n');

        logger.sendEvent('Knowledge Hub Prepared', { 
            manual_preview: businessManual ? businessManual.substring(0, 100) + '...' : 'EMPTY (No manual uploaded)',
            product_count: products.length 
        }, 'info');

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

        // 8. Handle Payment Triggers (Paystack Integration)
        if (aiResponse.trigger_payment && aiResponse.amount) {
            try {
                logger.sendEvent('Generating Payment Link', { amount: aiResponse.amount }, 'info');
                const paymentData = await paystack.initializeTransaction(
                    `${phoneNumber}@whatsapp.bot`, 
                    aiResponse.amount, 
                    { 
                        customerId: customer.id, 
                        phone: phoneNumber,
                        host: req.get('host'),
                        protocol: req.protocol
                    }
                );
                
                await db.recordPaymentInitiation(customer.id, paymentData.reference, aiResponse.amount);
                
                // Append the payment link to the AI's message
                aiResponse.messageToUser += `\n\n💳 *Payment Link:* ${paymentData.authorization_url}`;
            } catch (pErr) {
                console.error('Payment Initialization Failed:', pErr.message);
            }
        }

        // 9. Save & Send Response
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

// Paystack Webhook for Payment Confirmation
app.post('/paystack-webhook', async (req, res) => {
    const event = req.body;
    logger.sendEvent('Paystack Webhook Received', event, 'info');

    if (event.event === 'charge.success') {
        const { reference, metadata, amount } = event.data;
        const customerId = metadata.customerId;
        const phone = metadata.phone;

        try {
            await db.updatePaymentStatus(reference, 'success');
            
            // Deduct stock if metadata has productId
            if (metadata.productId) {
                await db.updateStock(metadata.productId, -1);
            }
            
            const successMsg = `✅ *Payment Confirmed!*\nThank you for your payment of ₦\${(amount/100).toLocaleString()}. Your order is now being processed!`;
            await db.saveMessage(customerId, 'assistant', successMsg);
            await whatsapp.sendWhatsAppMessage(phone, successMsg);
            
            logger.sendEvent('Payment Processed Successfully', { reference, phone }, 'success');
        } catch (err) {
            console.error('Error processing Paystack webhook:', err);
        }
    }
    res.sendStatus(200);
});

// Autonomous Follow-up Engine (Runs every 15 minutes)
setInterval(async () => {
    console.log('--- Autonomous Follow-up Engine Running ---');
    try {
        // Find all customers who haven't been messaged in over 1 hour
        const [staleCustomers] = await db.pool.query(`
            SELECT c.* FROM customers c
            JOIN (
                SELECT customer_id, MAX(timestamp) as last_msg_time 
                FROM conversations 
                GROUP BY customer_id
            ) last_msgs ON c.id = last_msgs.customer_id
            WHERE last_msgs.last_msg_time < NOW() - INTERVAL 1 HOUR
            ORDER BY FIELD(c.intent_level, 'HIGH_INTENT', 'MEDIUM_INTENT', 'LOW_INTENT') ASC
            LIMIT 10
        `);

        for (const customer of staleCustomers) {
            logger.sendEvent('Auto-Follow-up Triggered', { customer: customer.phone_number, intent: customer.intent_level }, 'info');
            
            const businessManual = await db.getAllKnowledge();
            const products = await db.getProducts();
            const productListString = products.map(p => `PRODUCT: ${p.name} | Price: ${p.price}`).join('\n');
            const history = await db.getRecentConversation(customer.id, 5);

            const aiResponse = await ai.processIncomingMessage(
                customer, 
                history, 
                "[System: This customer has been waiting. Provide the information they requested or a helpful update from the manual/inventory. DO NOT stall. Respond NOW.]",
                businessManual,
                productListString
            );

            if (aiResponse.messageToUser) {
                await db.saveMessage(customer.id, 'assistant', aiResponse.messageToUser);
                await whatsapp.sendWhatsAppMessage(customer.phone_number, aiResponse.messageToUser);
            }
        }
    } catch (err) {
        console.error('Follow-up Engine Error:', err.message);
    }
}, 15 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
