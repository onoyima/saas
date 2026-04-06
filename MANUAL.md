# 📖 Developer Manual: WhatsApp AI Revenue Intelligence Assistant

This guide explains how to use the intelligent features of your WhatsApp bot, including knowledge ingestion and the product catalogue.

---

## 🛠️ Management Dashboards

You have two powerful interfaces to manage your assistant:

### 1. Live Activity Logs (`/logs`)
- **URL:** `http://localhost:3000/logs`
- **Purpose:** Monitor every incoming message, AI reasoning step, and WhatsApp response in real-time. 
- **Usage:** Open this in your browser while testing on your phone to see how the AI "thinks."

### 2. Admin Dashboard (`/admin`)
- **URL:** `http://localhost:3000/admin`
- **Purpose:** The "Management Center" for your business intelligence.
- **Features:**
  - **Knowledge Ingestion:** Upload your PDF business manuals or price lists. The AI instantly reads them.
  - **Product Catalog:** Add products with descriptions and image URLs.

---

## 🧠 Training the AI (Knowledge Ingestion)

1. Go to the **Admin Dashboard** (`/admin`).
2. Under "Knowledge Ingestion," click "Choose File."
3. Select a **PDF**, **DOCX**, or **TXT** file containing your business rules, pricing, or FAQ.
4. Click **"Train AI Brain."**
5. **Testing:** Send a WhatsApp message asking a specific question from that document (e.g., "What is your refund policy?"). The AI will now answer based on your file.

---

## 📸 Product Marketing (Images)

1. Go to the **Admin Dashboard** (`/admin`).
2. Under "Add Product," enter the name, description, and price.
3. Provide a **direct URL** to the product image (Hosted on Unsplash, Google Drive, or your website).
4. Click **"Add Product."**
5. **Testing:** Send a WhatsApp message like *"Show me your Premium package."* The bot will automatically reply with the text **AND the actual product photo.**

---

## 🚀 Advanced Command Line Tools

If you prefer using the terminal, you can still use these scripts:

- **Upload Manual:** `node uploadManual.js <path_to_file>`
- **Add Product:** `node addProduct.js "Name" "Desc" "Price" "ImageURL"`

---

## 🛡️ Security Note
Ensure your `.env` file is never shared. Your `GEMINI_API_KEY` and `WHATSAPP_TOKEN` are private credentials that keep your bot running.
