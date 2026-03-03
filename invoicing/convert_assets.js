const fs = require('fs');
const path = require('path');

// List of assets to convert
const assets = [
    { src: 'invoice_bg.png', varName: 'christmasBgBase64' },
    { src: 'invoice_bg_hanniel.png', varName: 'hannielBgBase64' },
    { src: 'invoice_bg_chinese.jpeg', varName: 'cnyBgBase64' },
    { src: 'invoice_bg_chinese_hp.jpeg', varName: 'cnyhpBgBase64' },
    { src: 'invoice_bg_eid.png', varName: 'eidBgBase64' },
    { src: 'invoice_bg_eidhp.jpg', varName: 'eidhpBgBase64' }
];

const outputPath = path.join(__dirname, 'assets.js');
let fileContent = '';

assets.forEach(asset => {
    const filePath = path.join(__dirname, asset.src);
    if (fs.existsSync(filePath)) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            const base64 = fileBuffer.toString('base64');
            const ext = path.extname(asset.src).toLowerCase();
            const mimeType = (ext === '.jpeg' || ext === '.jpg') ? 'image/jpeg' : 'image/png';
            fileContent += `const ${asset.varName} = "data:${mimeType};base64,${base64}";\n`;
            console.log(`Converted ${asset.src}...`);
        } catch (e) {
            console.error(`Error processing ${asset.src}:`, e);
        }
    } else {
        console.warn(`Warning: ${asset.src} not found.`);
    }
});

try {
    fs.writeFileSync(outputPath, fileContent);
    console.log('Successfully created assets.js');
} catch (e) {
    console.error('Error writing output file:', e);
    process.exit(1);
}
