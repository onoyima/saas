const axios = require('axios');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const initializeTransaction = async (email, amount, metadata = {}) => {
    if (!PAYSTACK_SECRET_KEY) {
        throw new Error('PAYSTACK_SECRET_KEY is not configured in .env');
    }

    try {
        // Automatically determine callback URL
        const callbackUrl = metadata.host ? `${metadata.protocol}://${metadata.host}/payment-success` : null;

        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            {
                email,
                amount: amount * 100, 
                callback_url: callbackUrl,
                metadata
            },
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.data; // { authorization_url, access_code, reference }
    } catch (error) {
        console.error('Paystack Initialization Error:', error.response?.data || error.message);
        throw new Error('Could not initialize payment with Paystack');
    }
};

const verifyTransaction = async (reference) => {
    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
                }
            }
        );

        return response.data.data;
    } catch (error) {
        console.error('Paystack Verification Error:', error.response?.data || error.message);
        return null;
    }
};

module.exports = {
    initializeTransaction,
    verifyTransaction
};
