const fs = require('fs');
const path = require('path');

const files = ['index.html', 'sites.html', 'servicos.html', 'portfolio.html', 'sobre.html', 'contactos.html', 'faq.html'];

const replacements = {
    'Ã¡': 'á',
    'Ã ': 'à',
    'Ã¢': 'â',
    'Ã£': 'ã',
    'Ã§': 'ç',
    'Ã©': 'é',
    'Ãª': 'ê',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ã´': 'ô',
    'Ãµ': 'õ',
    'Ãº': 'ú',
    'Ã ': 'Á',
    'Ã€': 'À',
    'Ã‚': 'Â',
    'Ãƒ': 'Ã',
    'Ã‡': 'Ç',
    'Ã‰': 'É',
    'ÃŠ': 'Ê',
    'Ã ': 'Í',
    'Ã“': 'Ó',
    'Ã”': 'Ô',
    'Ã•': 'Õ',
    'Ãš': 'Ú',
    'Âº': 'º',
    'Âª': 'ª',
    'â‚¬': '€',
    'â€“': '–',
    'â€”': '—',
    'â€™': '’',
    'â€œ': '“',
    'â€ ': '”'
};

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Fix mojibake
        for (const [bad, good] of Object.entries(replacements)) {
            content = content.split(bad).join(good);
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
