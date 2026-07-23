const fs = require('fs');
const files = ['portfolio.html', 'sites.html', 'contactos.html', 'faq.html'];
for (const f of files) {
    let c = fs.readFileSync(f, 'utf8');
    const scriptRegex = /<script>([\s\S]*?)<\/script>/gi;
    let match;
    let scripts = '';
    while ((match = scriptRegex.exec(c)) !== null) {
        if (!match[1].includes('lucide.createIcons')) {
            scripts += '\n<script>\n' + match[1] + '\n</script>\n';
        }
    }
    if (scripts) {
        // remove inline scripts
        c = c.replace(/<script>[\s\S]*?<\/script>/gi, (m) => m.includes('lucide.createIcons') ? m : '');
        // inject before </main>
        c = c.replace('</main>', scripts + '\n</main>');
        fs.writeFileSync(f, c, 'utf8');
        console.log('Scripts movidos em ' + f);
    }
}
