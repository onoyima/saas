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

## 📸 Product Marketing (Photo Uploads)

1. Go to the **Admin Dashboard** (`/admin`).
2. Under "Add Product," enter the name, description, and price.
3. Click **"Choose File"** under "Product Image (Photo)" and select an image from your computer.
4. Click **"Add Product."**
5. **Testing:** Send a WhatsApp message like *"Show me your Premium package."* The bot will automatically reply with the text **AND the actual photo you uploaded!**

> [!NOTE]
> The bot uses your current Ngrok URL to serve these images. If you restart Ngrok, the images uploaded during the previous session might not be visible to Meta unless you update the catalog.

---

## 💰 Automated Payments (Paystack)

1. Get your **Secret Key** from the Paystack Dashboard.
2. Add it to your `.env` file: `PAYSTACK_SECRET_KEY=sk_test_...`
3. **Webhook Setup:** In Paystack, set your Webhook URL to `https://your-ngrok-url.ngrok-free.app/paystack-webhook`.
4. **How it works:** When a customer asks "How much?" or "I want to buy," the AI will automatically generate and send a secure Paystack checkout link!

## 📊 Business Intelligence (Reports)

1. Access your revenue reports at `http://localhost:3000/reports`.
2. See **Daily Revenue** and **Monthly Overviews**.
3. All successful Paystack transactions are automatically recorded here.

## 📦 Inventory Guardian

- When adding a product in `/admin`, set the **Stock Quantity**.
- The AI will automatically see if an item is out of stock.
- Every successful sale **automatically deducts 1** from your stock!

---

## 🚀 Advanced Command Line Tools

If you prefer using the terminal, you can still use these scripts:

- **Upload Manual:** `node uploadManual.js <path_to_file>`
- **Add Product:** `node addProduct.js "Name" "Desc" "Price" "ImageURL"`

## 🧠 Interviewing & Training Your AI

You can now directly "talk" to your bot's brain from the Admin Dashboard!

1. Go to the **Admin Dashboard** (`/admin`).
2. Look for the **"AI Training & Knowledge Verification"** box at the bottom.
3. **Ask a question:** *"What do you understand about our discount rules?"* or *"Summarize my last uploaded manual."*
4. **Feed New Knowledge:** If the AI's answer is missing something, you can type the correct rule yourself and click the **"Feed to AI"** button next to your message! The bot will instantly be updated for all future customers.

---
