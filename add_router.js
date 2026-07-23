const fs = require('fs');
const path = require('path');
const dir = 'c:\\Users\\rafam\\Desktop\\Projeto Site';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
for (const f of files) {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!content.includes('router.js')) {
        content = content.replace(/(<\/body>)/i, '    <script src="js/router.js"></script>\n$1');
        fs.writeFileSync(path.join(dir, f), content, 'utf8');
        console.log('Router.js adicionado a ' + f);
    }
}
