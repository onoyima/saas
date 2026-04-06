const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'whatsapp_bot',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize Tables
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(50) UNIQUE,
        name VARCHAR(255),
        interest TEXT,
        budget_signals TEXT,
        urgency_level VARCHAR(50),
        intent_level VARCHAR(50),
        last_interaction DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        role VARCHAR(50),
        content TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
    console.log('MySQL Database tables initialized');
  } catch (err) {
    console.error('MySQL Init Error:', err.message);
  }
};

initDB();

const getCustomer = async (phoneNumber) => {
  const [rows] = await pool.query('SELECT * FROM customers WHERE phone_number = ?', [phoneNumber]);
  return rows.length > 0 ? rows[0] : null;
};

const createCustomer = async (phoneNumber, name = 'Unknown') => {
  const [result] = await pool.query(
    'INSERT INTO customers (phone_number, name) VALUES (?, ?)',
    [phoneNumber, name]
  );
  return result.insertId;
};

const updateCustomerProfile = async (id, profile) => {
  const { name, interest, budget_signals, urgency_level, intent_level } = profile;
  await pool.query(
    `UPDATE customers 
     SET name = COALESCE(?, name),
         interest = COALESCE(?, interest),
         budget_signals = COALESCE(?, budget_signals),
         urgency_level = COALESCE(?, urgency_level),
         intent_level = COALESCE(?, intent_level)
     WHERE id = ?`,
    [name, interest, budget_signals, urgency_level, intent_level, id]
  );
};

const saveMessage = async (customerId, role, content) => {
  await pool.query(
    'INSERT INTO conversations (customer_id, role, content) VALUES (?, ?, ?)',
    [customerId, role, content]
  );
};

const getRecentConversation = async (customerId, limit = 10) => {
  const [rows] = await pool.query(
    'SELECT role, content FROM conversations WHERE customer_id = ? ORDER BY timestamp DESC LIMIT ?',
    [customerId, limit]
  );
  return rows.reverse();
};

module.exports = {
  pool,
  getCustomer,
  createCustomer,
  updateCustomerProfile,
  saveMessage,
  getRecentConversation,
};
