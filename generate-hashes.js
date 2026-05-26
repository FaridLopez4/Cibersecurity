const bcrypt = require('bcryptjs');

async function generateHashes() {
    const adminPassword = 'admin123';
    const clientePassword = 'cliente123';
    
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const clienteHash = await bcrypt.hash(clientePassword, 10);
    
    console.log('Hash para admin123:', adminHash);
    console.log('Hash para cliente123:', clienteHash);
}

generateHashes();
