const fs = require('fs');
const path = require('path');

const files = ['index.html', 'sites.html', 'servicos.html', 'portfolio.html', 'sobre.html', 'contactos.html', 'faq.html'];

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        if (!content.includes('<main id="app-content"')) {
            content = content.replace(/(<\/header>)/i, '$1\n\n    <main id="app-content" class="page-transition">');
            content = content.replace(/(<footer class="footer">)/i, '    </main>\n\n    $1');
            content = content.replace(/(<\/body>)/i, '    <script src="js/router.js"></script>\n$1');
            
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Processed ${file}`);
        }
    }
});
