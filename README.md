# WhatsApp AI Revenue Intelligence Assistant (Scenario A)

A production-ready WhatsApp AI bot designed for sales closing, lead prioritization, and customer follow-ups. Powered by **Google Gemini AI** and **Node.js**.

## 🚀 Features
- **AI Sales Closer:** Uses a high-performance system prompt to qualify leads and guide customers to purchase.
- **Buyer Intelligence:** Automatically classifies customers by intent level (LOW, MEDIUM, HIGH) in the database.
- **Auto-Follow-up:** Maintains full conversation history to provide contextual responses.
- **Live Monitoring:** Includes a real-time log dashboard at `/logs` to watch messages and AI reasoning live.
- **MySQL Persistence:** Robust data storage for professional business scaling.

## 🛠️ Prerequisites
- [XAMPP](https://www.apachefriends.org/) (for MySQL)
- [Node.js](https://nodejs.org/) (v18+)
- [Ngrok](https://ngrok.com/) (for local testing)
- Meta Developer Account (WhatsApp Cloud API)
- Google AI Studio API Key (Free)

## 📦 Installation

1. **Clone and Install:**
   ```bash
   git clone https://github.com/onoyima/saas.git
   cd saas
   npm install
   ```

2. **Database Setup:**
   - Start the Apache and MySQL modules in your XAMPP Control Panel.
   - Run the automatic setup script:
     ```bash
     node createDb.js
     ```

3. **Configuration:**
   - Copy `.env.example` to `.env`
   - Fill in your `WHATSAPP_TOKEN`, `GEMINI_API_KEY`, and `PHONE_NUMBER_ID`.

4. **Run the App:**
   ```bash
   npm start
   ```

## 🌐 Local Webhook Testing
1. Start the server: `npm start`
2. Start Ngrok: `ngrok http 3000`
3. Update your Meta Webhook URL to: `https://your-ngrok-url.ngrok-free.app/webhook`
4. Use `dummy_verify` as the Verification Token.
5. Watch live traffic at: `http://localhost:3000/logs`

## 📄 License
MIT
