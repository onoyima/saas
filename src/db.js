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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT,
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        price DECIMAL(10, 2),
        cost_price DECIMAL(10, 2),
        min_selling_price DECIMAL(10, 2),
        promo_active BOOLEAN DEFAULT FALSE,
        promo_price DECIMAL(10, 2),
        stock_quantity INT DEFAULT 10,
        features TEXT,
        image_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        reference VARCHAR(100) UNIQUE,
        amount DECIMAL(10, 2),
        status VARCHAR(50) DEFAULT 'pending',
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME,
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

const saveKnowledge = async (content, metadata = {}) => {
  await pool.query('INSERT INTO knowledge (content, metadata) VALUES (?, ?)', [content, JSON.stringify(metadata)]);
};

const getAllKnowledge = async () => {
  const [rows] = await pool.query('SELECT content FROM knowledge');
  return rows.map(r => r.content).join('\n\n');
};

const addProduct = async (productData) => {
  const { name, description, price, costPrice, minSellingPrice, promoActive, promoPrice, imageUrl, stockQuantity, features } = productData;
  await pool.query(
    'INSERT INTO products (name, description, price, cost_price, min_selling_price, promo_active, promo_price, image_url, stock_quantity, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    [name, description, price, costPrice, minSellingPrice, promoActive, promoPrice, imageUrl, stockQuantity, features]
  );
};

const updateStock = async (productId, difference) => {
    await pool.query('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [difference, productId]);
};

const getProducts = async () => {
    const [rows] = await pool.query('SELECT * FROM products');
    return rows;
};

const getProductById = async (id) => {
  const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  return rows.length > 0 ? rows[0] : null;
};

const getAllCustomers = async () => {
    const [rows] = await pool.query('SELECT * FROM customers ORDER BY last_interaction DESC');
    return rows;
};

const recordPaymentInitiation = async (customerId, reference, amount, metadata = {}) => {
    await pool.query(
        'INSERT INTO payments (customer_id, reference, amount, metadata) VALUES (?, ?, ?, ?)',
        [customerId, reference, amount, JSON.stringify(metadata)]
    );
};

const updatePaymentStatus = async (reference, status) => {
    const paidAt = status === 'success' ? new Date() : null;
    await pool.query(
        'UPDATE payments SET status = ?, paid_at = COALESCE(?, paid_at) WHERE reference = ?',
        [status, paidAt, reference]
    );
};

const getRevenueReports = async () => {
    const [daily] = await pool.query(`
        SELECT DATE(paid_at) as date, SUM(amount) as total 
        FROM payments WHERE status = 'success' 
        GROUP BY DATE(paid_at) ORDER BY date DESC LIMIT 30
    `);
    const [monthly] = await pool.query(`
        SELECT DATE_FORMAT(paid_at, '%Y-%m') as month, SUM(amount) as total 
        FROM payments WHERE status = 'success' 
        GROUP BY month ORDER BY month DESC
    `);
    return { daily, monthly };
};

module.exports = {
  pool,
  getCustomer,
  createCustomer,
  updateCustomerProfile,
  saveMessage,
  getRecentConversation,
  saveKnowledge,
  getAllKnowledge,
  addProduct,
  getProducts,
  getProductById,
  getAllCustomers,
  recordPaymentInitiation,
  updatePaymentStatus,
  getRevenueReports
};
