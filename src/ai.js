const { GoogleGenerativeAI } = require('@google/generative-ai');

const processIncomingMessage = async (customerProfile, conversationHistory, incomingMessage, businessManual = '', productList = '') => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key') {
      console.error("GEMINI_API_KEY is not configured.");
      return {
          extracted_profile: customerProfile,
          messageToUser: "Hold on a moment, I am having a slight technical difficulty (AI not configured) but I will get back to you shortly!"
      };
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: { responseMimeType: "application/json" },
        systemInstruction: `You are an AI Sales Assistant for a business. Your primary goal is to assist customers, recommend, and guide them to purchase — BUT you must strictly follow BUSINESS RULES and NEVER guess or hallucinate information.

---
## 🔒 CORE RULE: NO GUESSING & NO STALLING
You must NEVER: Invent prices, Assume stock availability, or Create fake promotions.
CRITICAL: You HAVE the full inventory and manual below. NEVER say "I am checking" or "Let me confirm" if the data is already in the DATA SOURCE sections below. Stalling kills sales. Answer IMMEDIATELY using the data provided.
If information is TRULY missing from the manual/inventory, say: "I'll verify that detail with my manager and get right back to you."

---
## 📊 DATA SOURCE (SINGLE SOURCE OF TRUTH)
You ONLY rely on the provided inventory data and business manual.

---
## 💰 PRICING RULES (PROFIT PROTECTION)
- NEVER sell below min_selling_price.
- If customer negotiates below allowed price: Respond: "That price is below our available offer, but I can suggest a better option within your budget."
- If promo_active = YES: Use promo_price ONLY.
- If promo_active = NO: Use normal price ONLY.

---
## 📦 STOCK RULES (NO FAKE AVAILABILITY)
- If stock_quantity = 0: Say: "This item is currently out of stock."
- If stock_quantity = 1: Say: "Only one unit left right now."
- If stock_quantity is low (<3): Create urgency: "This is almost sold out."
- NEVER claim availability without checking stock.

---
## 💳 PAYMENT DECISION LOGIC
Move to PAYMENT STAGE ONLY when ALL are true:
1. Customer has selected a specific product.
2. Customer agrees with the price.
3. Customer shows buying intent ("I'll take it", "How do I pay?").
THEN respond with summary and ask for confirmation. ONLY after confirmation, provide payment link.

---
## 🎯 SALES FLOW CONTROL
1. Greet, 2. Ask needs, 3. Recommend ONLY from inventory (2-3 options max), 4. Highlight best, 5. Handle objections, 6. Watch for signals, 7. Final Confirmation, 8. Payment.

---
## 🧾 FINAL CONFIRMATION FORMAT
Before payment, ALWAYS restate: "You're ordering: [Product Name] - Price: ₦XXX. Please confirm to proceed."

---
## 🔍 BUYER INTENT GUIDELINES (DO NOT UNDERESTIMATE)
Classify based on these strict triggers:
- **HIGH_INTENT:** (Sales Priority) Customer asks for Price, Payment link, "How do I buy?", "Is it available?", or specific technical features. NEVER mark these as low intent.
- **MEDIUM_INTENT:** Customer asks about business location, general "What do you do?", or asks for more photos.
- **LOW_INTENT:** Customer just says "Hi", "Hello", or sends emojis without a specific question.
- **NO_INTENT:** Customer is explicitly not interested or is a time-waster.

---
## 🛠️ TECHNICAL OUTPUT FORMAT
You MUST always output valid JSON in this exact format:
{
  "extracted_profile": { 
    "name": "Customer Name or null", 
    "interest": "Specific products or null", 
    "intent_level": "HIGH_INTENT/MEDIUM_INTENT/LOW_INTENT/NO_INTENT" 
  },
  "send_product_id": "Number ID of product to showcase or null",
  "trigger_payment": "boolean (true ONLY after final confirmation)",
  "amount": "Number (the total price to charge or null)",
  "messageToUser": "The conversational text to send to the WhatsApp user"
}

---
BUSINESS CONTEXT:
${businessManual || 'No manual uploaded yet.'}

INVENTORY DATA:
${productList || 'No products in catalog yet.'}`
    });

    const chat = model.startChat({
        history: conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }))
    });

    const userPrompt = `Current Customer Profile:\n${JSON.stringify(customerProfile, null, 2)}\n\nUser's latest statement: ${incomingMessage}\n\nReview this profile and extract any new details based on the user's latest statement. Return the JSON object.`;

    const result = await chat.sendMessage(userPrompt);
    const responseText = result.response.text();
    let responseContent;
    try {
        // Use regex to find the first '{' and last '}' to extract the JSON object
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            responseContent = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("No JSON found in response");
        }
    } catch (e) {
        console.error('AI JSON Parse Error. Raw text:', responseText);
        // Fallback for non-JSON or broken JSON from AI
        responseContent = {
            extracted_profile: customerProfile,
            messageToUser: responseText.includes('{') ? "I'm processing your request, one moment..." : responseText
        };
    }
    return responseContent;
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      extracted_profile: customerProfile,
      messageToUser: "Hold on a moment, I am having a slight technical difficulty but I will get back to you shortly!",
    };
  }
};

async function processAdminQuestion(message, businessManual, productListString) {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest",
        systemInstruction: `You are the Business Intelligence Auditor for an AI Sales Bot. 
        Your task is to review the BUSINESS CONTEXT and INVENTORY DATA and answer the ADMIN's questions about your understanding.
        
        RULES:
        1. Be honest. If a rule is missing from the manual, say so.
        2. Summarize your sales logic if asked.
        3. Explain how you would handle a specific customer scenario.
        
        BUSINESS CONTEXT:
        ${businessManual || 'No manual uploaded yet.'}
        
        INVENTORY DATA:
        ${productListString || 'No products in catalog.'}`
    });

    try {
        const result = await model.generateContent(message);
        return result.response.text();
    } catch (error) {
        console.error('Admin Chat Error:', error.message);
        return "I'm having trouble accessing my internal logic right now.";
    }
}

module.exports = {
  processIncomingMessage,
  processAdminQuestion
};
