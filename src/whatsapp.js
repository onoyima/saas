const axios = require('axios');
const logger = require('./logger');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

const sendWhatsAppMessage = async (to, text) => {
  logger.sendEvent('Sending WhatsApp Message', { to, text }, 'info');
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text },
      },
    });
    logger.sendEvent('WhatsApp Message Sent', response.data, 'success');
    return response.data;
  } catch (error) {
    logger.sendEvent('WhatsApp Send Failed', error.response?.data || error.message, 'error');
    console.error('Error sending WhatsApp message:', error.response?.data || error.message);
    return null;
  }
};

const markMessageAsRead = async (messageId) => {
  try {
    await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      },
    });
  } catch (error) {
    console.error('Error marking message as read:', error.response?.data || error.message);
  }
};

const sendWhatsAppImage = async (to, imageUrl, caption = '') => {
  logger.sendEvent('Sending WhatsApp Image', { to, imageUrl, caption }, 'info');
  try {
    const response = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        to: to,
        type: 'image',
        image: {
          link: imageUrl,
          caption: caption
        },
      },
    });
    logger.sendEvent('WhatsApp Image Sent', response.data, 'success');
    return response.data;
  } catch (error) {
    logger.sendEvent('WhatsApp Image Send Failed', error.response?.data || error.message, 'error');
    console.error('Error sending WhatsApp image:', error.response?.data || error.message);
    return null;
  }
};

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppImage,
  markMessageAsRead,
};
