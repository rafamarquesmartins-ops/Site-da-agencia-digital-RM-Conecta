const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = __dirname;
const htmlFiles = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let globalCss = '';
let adminCss = '';
const styleMap = new Map();

htmlFiles.forEach(file => {
    const isAdmin = file.includes('admin') || file.includes('area-cliente');
    let content = fs.readFileSync(path.join(dir, file), 'utf8');
    
    // Simple regex to match style="..."
    // Note: this doesn't handle nested quotes perfectly, but for simple styles it works.
    let count = 0;
    const newContent = content.replace(/style="([^"]+)"/g, (match, styleContent) => {
        const trimmed = styleContent.trim();
        if (!trimmed) return '';
        
        let hash = styleMap.get(trimmed);
        if (!hash) {
            hash = 'u-' + crypto.createHash('md5').update(trimmed).digest('hex').substring(0, 6);
            styleMap.set(trimmed, hash);
            const cssRule = `.${hash} { ${trimmed} }\n`;
            if (isAdmin) {
                adminCss += cssRule;
            } else {
                globalCss += cssRule;
            }
        }
        count++;
        // We will insert the new class. 
        // We replace style="..." with a special marker to add the class later, 
        // or just rely on another regex to inject the class. 
        // Actually, it's easier to return `class="${hash}"` and if it already has a class, merge them later?
        // No, if it has a class, replacing style=".." with class="u-.." will create duplicate class attributes!
        return `data-util-class="${hash}"`;
    });

    if (count > 0) {
        // Now merge data-util-class into existing class="", or add class=""
        let finalContent = newContent.replace(/class="([^"]*)"\s*data-util-class="([^"]+)"/g, 'class="$1 $2"');
        finalContent = finalContent.replace(/data-util-class="([^"]+)"\s*class="([^"]*)"/g, 'class="$2 $1"');
        finalContent = finalContent.replace(/data-util-class="([^"]+)"/g, 'class="$1"');
        
        fs.writeFileSync(path.join(dir, file), finalContent);
        console.log(`Updated ${file} (${count} styles extracted)`);
    }
});

if (globalCss) {
    fs.appendFileSync(path.join(dir, 'css', 'style.css'), '\n/* Auto-extracted utility classes */\n' + globalCss);
    console.log('Appended to css/style.css');
}
if (adminCss) {
    fs.appendFileSync(path.join(dir, 'css', 'admin.css'), '\n/* Auto-extracted utility classes */\n' + adminCss);
    console.log('Appended to css/admin.css');
}
