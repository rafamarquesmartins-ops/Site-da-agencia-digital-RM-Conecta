const fs = require('fs');
const path = require('path');
const dir = 'c:\\Users\\rafam\\Desktop\\Projeto Site';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
for (const f of files) {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    if (!content.includes('<main id="app-content"')) {
        content = content.replace(/(<\/header>)/i, '$1\n\n    <main id="app-content" class="page-transition">');
        content = content.replace(/(<footer)/i, '    </main>\n\n$1');
        fs.writeFileSync(path.join(dir, f), content, 'utf8');
        console.log('Injetado em ' + f);
    }
}
