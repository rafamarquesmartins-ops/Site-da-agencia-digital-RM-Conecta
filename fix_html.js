const fs = require('fs');

const files = [
    'index.html', 'contactos.html', 'sites.html', 'portfolio.html', 
    'servicos.html', 'faq.html', 'sobre.html', 'area-cliente.html', 'admin-rmconecta.html'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, 'utf8');

    // 1. Add Favicon before </head> if missing
    if (!html.includes('rel="icon"')) {
        html = html.replace('</head>', '    <link rel="icon" type="image/x-icon" href="images/favicon.ico">\n</head>');
    }

    // 2. Remove skeleton loaders from nav-cta
    // These were identified as hardcoded in index.html, contactos, sites, portfolio, servicos, faq, sobre.
    // They look like: <div style="width: 130px; height: 42px; border-radius: 50px; background: #e2e8f0; animation: skeleton-pulse 1.5s infinite ease-in-out;"></div>
    // or <div ... animation: skeleton-pulse ...></div>
    html = html.replace(/<div class="nav-cta">[\s\S]*?<\/div>\s*<\/div>\s*<\/header>/g, '<div class="nav-cta"></div>\n        </div>\n    </header>');

    // 3. Move <style> and <link> out of <body> into <head> for intl-tel-input (in contactos.html and sites.html)
    // Actually, I can just find the block and move it before </head>.
    const intlBlockRegex = /(<!-- intl-tel-input -->[\s\S]*?<\/style>)/g;
    const match = intlBlockRegex.exec(html);
    if (match) {
        html = html.replace(match[1], ''); // remove from body
        html = html.replace('</head>', `    ${match[1]}\n</head>`);
    }

    // 4. In contactos.html, sites.html, the autocomplete attributes for forms
    // Name, Email, Phone
    html = html.replace(/id="contacto-nome" name="nome"([\s\S]*?)required/g, 'id="contacto-nome" name="nome" autocomplete="name"$1required');
    html = html.replace(/id="contacto-email" name="email"([\s\S]*?)required/g, 'id="contacto-email" name="email" autocomplete="email"$1required');
    html = html.replace(/id="contacto-telefone" name="telefone"([\s\S]*?)required/g, 'id="contacto-telefone" name="telefone" autocomplete="tel"$1required');

    html = html.replace(/id="maq-nome" name="nome"([\s\S]*?)required/g, 'id="maq-nome" name="nome" autocomplete="name"$1required');
    html = html.replace(/id="maq-email" name="email"([\s\S]*?)required/g, 'id="maq-email" name="email" autocomplete="email"$1required');
    html = html.replace(/id="maq-telefone" name="telefone"([\s\S]*?)required/g, 'id="maq-telefone" name="telefone" autocomplete="tel"$1required');
    
    // 5. In servicos.html: add aria-hidden="true" to decorative icons
    // Typically <i data-lucide="...">
    if (file === 'servicos.html') {
        html = html.replace(/<i data-lucide="([^"]+)"(?! aria-hidden)/g, '<i data-lucide="$1" aria-hidden="true"');
    }

    // 6. In portfolio.html, there's a `<script>` calling db.collection('projetos') 
    // BEFORE firebase initializes.
    // I need to wrap it in a DOMContentLoaded + ensure it checks if db exists, or move it to js/main.js
    // Actually, the firebase scripts are at the end of body. The script is inside body.
    // If we just defer the execution using window.addEventListener('load', ...) it will wait for firebase!
    if (file === 'portfolio.html') {
        html = html.replace(/const grid = document\.getElementById\('portfolio-grid'\);/g, 'window.addEventListener("load", async () => {\n            const grid = document.getElementById("portfolio-grid");');
        html = html.replace(/<\/script>\s*<\/main>/, '});\n        </script>\n    </main>');
    }

    fs.writeFileSync(file, html);
});

// Also fix index.html image and footer
let index = fs.readFileSync('index.html', 'utf8');
// "O comentário <!-- Footer --> está dentro da <main>"
index = index.replace(/<!-- Footer -->\s*<\/main>/, '</main>\n    <!-- Footer -->');
// Background image to <img>
// In index.html, hero is <div style="background: url(...); ..."></div>
// Actually, fixing the hero background to <img> requires changing CSS overlay logic. 
// A simpler fix for accessibility is adding aria-label and role="img" to the div!
index = index.replace(/class="hero-image"(?! aria-label)/g, 'class="hero-image" role="img" aria-label="Jovem empreendedor a trabalhar no seu portátil num café, focado e profissional"');
fs.writeFileSync('index.html', index);

// Fix CSS
let css = fs.readFileSync('css/style.css', 'utf8');
css = css.replace(/\.btn-danger-interactive\s*{[\s\S]*?}[\s\S]*?\.btn-danger-interactive:hover\s*{[\s\S]*?}/g, '');
// Add grid-2-col-reverse-mobile if missing
if (!css.includes('grid-2-col-reverse-mobile')) {
    css += `\n\n@media (max-width: 768px) {\n    .grid-2-col-reverse-mobile {\n        display: flex;\n        flex-direction: column-reverse;\n    }\n}`;
}
fs.writeFileSync('css/style.css', css);

console.log('HTML and CSS fixes applied.');
