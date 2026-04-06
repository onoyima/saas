require('dotenv').config();
const db = require('./src/db');
const ai = require('./src/ai');
const whatsapp = require('./src/whatsapp');
const logger = require('./src/logger');

const run = async () => {
    try {
        console.log('Retrieving last active customer...');
        const [customers] = await db.pool.query('SELECT * FROM customers ORDER BY last_interaction DESC LIMIT 1');
        
        if (customers.length === 0) {
            console.log('No customers found in database.');
            process.exit(0);
        }

        const customer = customers[0];
        console.log(`Found customer: ${customer.phone_number} (ID: ${customer.id})`);

        // Get context
        const businessManual = await db.getAllKnowledge();
        const products = await db.getProducts();
        const productListString = products.map(p => `ID: ${p.id} | Name: ${p.name} | Price: ${p.price}`).join('\n');
        const history = await db.getRecentConversation(customer.id, 5);

        console.log('Generating AI Follow-up...');
        let aiResponse;
        try {
            aiResponse = await ai.processIncomingMessage(
                customer, 
                history, 
                "[System Trigger: Send a friendly follow-up to check if the customer needs anything or is ready to proceed]",
                businessManual,
                productListString
            );
        } catch (aiErr) {
            console.error('AI Processing crashed:', aiErr);
            throw aiErr;
        }

        console.log('AI Response Generated:', aiResponse.messageToUser);

        if (aiResponse.messageToUser) {
            console.log('Sending message via WhatsApp...');
            try {
                await db.saveMessage(customer.id, 'assistant', aiResponse.messageToUser);
                await whatsapp.sendWhatsAppMessage(customer.phone_number, aiResponse.messageToUser);
            } catch (waErr) {
                console.error('WhatsApp or DB Save failed:', waErr);
                throw waErr;
            }
            console.log('Successfully replied to customer!');
        }


        process.exit(0);
    } catch (err) {
        console.error('Follow-up failed:', err);
        process.exit(1);
    }
};

run();
