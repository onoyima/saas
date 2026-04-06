require('dotenv').config();
const { addProduct } = require('./src/db');

const run = async () => {
    const args = process.argv.slice(2);
    if (args.length < 4) {
        console.log('Usage: node addProduct.js "<name>" "<description>" "<price>" "<image_url>"');
        process.exit(1);
    }

    const [name, description, price, imageUrl] = args;
    try {
        console.log(`Adding product: ${name}...`);
        await addProduct(name, description, price, imageUrl);
        console.log('Product added successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Failed to add product:', err.message);
        process.exit(1);
    }
};

run();
