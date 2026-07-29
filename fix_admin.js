const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// The JS subagent pointed out innerHTML += in loops. Let's fix that.
// It also pointed out html edge cases in onclicks.
code = code.replace(/onclick="showAdminAlert\('Mensagem da Lead', \\\`\$\{\(lead\.mensagem \|\| 'Sem mensagem'\)\.replace\(\/`\/g, "'"\)\}\\\`\)"/g, 
    'onclick="showAdminAlert(\'Mensagem da Lead\', decodeURIComponent(\'${encodeURIComponent(lead.mensagem || \'Sem mensagem\')}\'))"');

code = code.replace(/onclick="editUser\('\$\{user\.id\}', \$\{\(JSON\.stringify\(p\)\.replace\(\/'\/g, \\"&apos;\\"\)\)\}\)"/g,
    'onclick="editUser(\'${user.id}\', JSON.parse(decodeURIComponent(\'${encodeURIComponent(JSON.stringify(p))}\')))"');

// Fix hash error in router.js
let router = fs.readFileSync('js/router.js', 'utf8');
router = router.replace(/const target = document\.querySelector\(url\);/g, 'let target = null; try { target = document.querySelector(url); } catch(e) {}');
fs.writeFileSync('js/router.js', router);

fs.writeFileSync('js/admin.js', code);
console.log('Fixed edge cases');
