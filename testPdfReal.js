const pdf = require('pdf-parse');
const fs = require('fs');

const run = async () => {
    try {
        console.log('Reading file...');
        const buffer = fs.readFileSync('uploads/3273e4f9f387759392737692af6117d6');
        console.log('Starting pdf-parse...');
        const data = await pdf(buffer);
        console.log('Extraction success! Length:', data.text.length);
        console.log('First 50 chars:', data.text.substring(0, 50));
        process.exit(0);
    } catch (err) {
        console.error('Extraction error:', err.message);
        process.exit(1);
    }
};

run();
