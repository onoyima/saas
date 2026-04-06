# WhatsApp AI Revenue Intelligence Assistant (Scenario A)

A production-ready WhatsApp AI bot designed for sales closing, lead prioritization, and customer follow-ups. Powered by **Google Gemini AI** and **Node.js**.

## 🚀 Features
- **AI Sales Closer:** Advanced conversion logic to prioritize high-intent buyers.
- **Knowledge Hub (`/admin`):** Upload PDFs/DOCX manuals to train the AI on your specific business rules.
- **Product Marketing:** AI automatically sends product images on WhatsApp from your catalog.
- **Buyer Intelligence:** Automatically classifies customers by intent level in MySQL.
- **Live Monitoring (`/logs`):** Watch incoming webhooks and AI reasoning in real-time.
- **Admin Dashboard (`/admin`):** Manage your business knowledge and product inventory via a premium web UI.

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

## 🌐 Dashboards & URLs
- **Admin Dashboard:** `http://localhost:3000/admin` (Upload manuals, add products)
- **Live Logs:** `http://localhost:3000/logs` (Monitor real-time AI actions)

For a detailed walkthrough, see [MANUAL.md](MANUAL.md).

## Local Webhook Testing
1. Start the server: `npm start`
2. Start Ngrok: `ngrok http 3000`
3. Update your Meta Webhook URL in Developer Dashboard.
4. Watch live traffic at the URLs above.

## 📄 License
MIT
