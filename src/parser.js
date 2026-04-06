const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const extractText = async (filePath, originalName = '') => {
    const ext = (path.extname(originalName) || path.extname(filePath)).toLowerCase();
    const dataBuffer = fs.readFileSync(filePath);

    if (ext === '.pdf') {
        const data = await pdf(dataBuffer);
        return data.text;
    } else if (ext === '.docx') {
        const data = await mammoth.extractRawText({ buffer: dataBuffer });
        return data.value;
    } else if (ext === '.txt') {
        return dataBuffer.toString();
    } else {
        throw new Error(`Unsupported file format: ${ext}`);
    }
};

module.exports = { extractText };
