const fs = require('fs');
const path = require('path');
const dir = 'c:\\Users\\rafam\\Desktop\\Projeto Site';
const stylePath = path.join(dir, 'css', 'style.css');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let globalCSS = fs.readFileSync(stylePath, 'utf8');

for (const f of files) {
    let content = fs.readFileSync(path.join(dir, f), 'utf8');
    const styleRegex = /<style>([\s\S]*?)<\/style>/gi;
    let match;
    let modified = false;
    
    while ((match = styleRegex.exec(content)) !== null) {
        globalCSS += '\n/* From ' + f + ' */\n' + match[1] + '\n';
        modified = true;
    }
    
    if (modified) {
        content = content.replace(/<style>[\s\S]*?<\/style>/gi, '');
        fs.writeFileSync(path.join(dir, f), content, 'utf8');
        console.log('Extraido CSS de ' + f);
    }
}

fs.writeFileSync(stylePath, globalCSS, 'utf8');
console.log('CSS atualizado!');
