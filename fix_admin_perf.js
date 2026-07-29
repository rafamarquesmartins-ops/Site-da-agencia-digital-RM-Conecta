const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// replace the tbody.innerHTML += ... in renderRecentLeads
code = code.replace(/tbody\.innerHTML = '';\n    const toShow[\s\S]*?toShow\.forEach\(lead => {([\s\S]*?)tbody\.innerHTML \+= `([\s\S]*?)`;\n    }\);/g, 
    `tbody.innerHTML = '';\n    const toShow = dashboardLeadsLimit === Infinity ? recentLeadsData : recentLeadsData.slice(0, dashboardLeadsLimit);\n    let html = '';\n    toShow.forEach(lead => {$1html += \`$2\`;\n    });\n    tbody.innerHTML = html;`);

// replace renderCRMTable
code = code.replace(/tbodyAtivos\.innerHTML = '';\n    tbodyExcluidos\.innerHTML = '';\n\n    allLeads\.forEach\(lead => {([\s\S]*?)tbodyAtivos\.innerHTML \+= `([\s\S]*?)`;\n        } else {\n([\s\S]*?)tbodyExcluidos\.innerHTML \+= `([\s\S]*?)`;\n        }\n    }\);\n/g,
    `tbodyAtivos.innerHTML = '';\n    tbodyExcluidos.innerHTML = '';\n    let htmlAtivos = '';\n    let htmlExcluidos = '';\n\n    allLeads.forEach(lead => {$1htmlAtivos += \`$2\`;\n        } else {\n$3htmlExcluidos += \`$4\`;\n        }\n    });\n    tbodyAtivos.innerHTML = htmlAtivos;\n    tbodyExcluidos.innerHTML = htmlExcluidos;\n`);

// replace renderUsers
code = code.replace(/tbodyAtivos\.innerHTML = '';\n        tbodySuspensos\.innerHTML = '';\n\n        allUsers\.forEach\(user => {([\s\S]*?)tbodySuspensos\.innerHTML \+= `([\s\S]*?)`;\n            } else {\n([\s\S]*?)tbodyAtivos\.innerHTML \+= `([\s\S]*?)`;\n            }\n        }\);\n/g,
    `tbodyAtivos.innerHTML = '';\n        tbodySuspensos.innerHTML = '';\n        let htmlAtivos = '';\n        let htmlSuspensos = '';\n\n        allUsers.forEach(user => {$1htmlSuspensos += \`$2\`;\n            } else {\n$3htmlAtivos += \`$4\`;\n            }\n        });\n        tbodyAtivos.innerHTML = htmlAtivos;\n        tbodySuspensos.innerHTML = htmlSuspensos;\n`);

// replace renderDeletedUsers
code = code.replace(/tbodyExcluidos\.innerHTML = '';\n\n        allDeletedUsers\.forEach\(user => {([\s\S]*?)tbodyExcluidos\.innerHTML \+= `([\s\S]*?)`;\n        }\);/g,
    `tbodyExcluidos.innerHTML = '';\n        let htmlExcluidos = '';\n\n        allDeletedUsers.forEach(user => {$1htmlExcluidos += \`$2\`;\n        });\n        tbodyExcluidos.innerHTML = htmlExcluidos;`);

// replace loadProjetosData
code = code.replace(/grid\.innerHTML = '';\n        snap\.forEach\(doc => {([\s\S]*?)grid\.innerHTML \+= `([\s\S]*?)`;\n        }\);/g,
    `grid.innerHTML = '';\n        let htmlGrid = '';\n        snap.forEach(doc => {$1htmlGrid += \`$2\`;\n        });\n        grid.innerHTML = htmlGrid;`);

// replace loadRecursosData (recursos grid is identical to projetos)
code = code.replace(/grid\.innerHTML = '';\n        snap\.forEach\(doc => {([\s\S]*?)grid\.innerHTML \+= `([\s\S]*?)`;\n        }\);/g,
    `grid.innerHTML = '';\n        let htmlGrid = '';\n        snap.forEach(doc => {$1htmlGrid += \`$2\`;\n        });\n        grid.innerHTML = htmlGrid;`);

fs.writeFileSync('js/admin.js', code);
console.log('Fixed performance loops');
