require('dotenv').config();
const { saveKnowledge } = require('./src/db');
const { extractText } = require('./src/parser');
const path = require('path');

const upload = async () => {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log('Usage: node uploadManual.js <path_to_file>');
        process.exit(1);
    }

    const filePath = path.resolve(args[0]);
    try {
        console.log(`Parsing file: ${filePath}...`);
        const text = await extractText(filePath, filePath);
        
        console.log('Saving to database...');
        await saveKnowledge(text, { filename: path.basename(filePath) });
        
        console.log('Success! Business manual has been ingested into the AI brain.');
        process.exit(0);
    } catch (err) {
        console.error('Upload failed:', err.message);
        process.exit(1);
    }
};

upload();
