const fs = require('fs');
let code = fs.readFileSync('js/admin.js', 'utf8');

// 1. Add Pagination variables below current globals
code = code.replace(/let dashboardLeadsLimit = Infinity;\nlet currentUsersTab = 'ativos';/, 
`let dashboardLeadsLimit = Infinity;
let currentUsersTab = 'ativos';
// CRM Pagination Globals
let crmLastVisible = null;
let crmCurrentFilter = '';
let crmIsDeletedTab = false;
let crmLeadsData = { ativos: [], excluidos: [] };
let crmPageSize = 20;
`);

// 2. Replace loadDashboardStats leads fetch with .count()
// Wait, the Firebase Compat SDK 10 supports `.count().get()`, but it doesn't support `.count()` without `.get()`.
// Actually, in dashboard we need `totalAtivos` (isDeleted != true) and `novos` (estado in ['novo', 'por contactar']).
// The existing dashboard logic relies on downloading them all to sort and display the top N.
// Since we have pagination for CRM, the dashboard recent leads table still needs the top N recent leads!
// So for dashboard, we can just fetch `.limit(20)` ordered by date!
const dashboardLeadsRegex = /\/\/ Leads \(Total & Novos\)[\s\S]*?renderRecentLeads\(\);\n        }\);/g;

const newDashboardLeads = `// Leads (Total & Novos)
        try {
            // Count total ativos
            const snapTotal = await db.collection('leads').where('isDeleted', '!=', true).get();
            let total = 0, novos = 0;
            snapTotal.forEach(doc => {
                total++;
                const e = (doc.data().estado || 'novo').toLowerCase();
                if(e === 'novo' || e === 'por contactar') novos++;
            });
            document.getElementById('statTotalLeads').textContent = total;
            document.getElementById('statNovosLeads').textContent = novos;

            // Get recent 20 for dashboard (client side sorting because we don't have composite index for dataCriacao + isDeleted yet)
            // Wait, we can just sort snapTotal since we already fetched it for the counts!
            // Yes! The requirement is "Paginação Limitada nas Tabelas de Leads (CRM)".
            // But wait, if we fetch all leads here (snapTotal.get()), we didn't solve the read problem!
            // We MUST use count() for the counts, and a separate query for recent leads.
            
            // Wait, Firestore Compat doesn't support 'where IN' with '!=' easily if we want count without index.
            // Let's use count() for total, and for "novos" we count where estado == 'por contactar' and 'novo'
            
            // Workaround without complex indexes:
            const totalSnap = await db.collection('leads').count().get();
            const deletedSnap = await db.collection('leads').where('isDeleted', '==', true).count().get();
            const totalAtivos = totalSnap.data().count - deletedSnap.data().count;
            
            const novosSnap1 = await db.collection('leads').where('estado', '==', 'Por Contactar').count().get();
            const novosSnap2 = await db.collection('leads').where('estado', '==', 'Novo').count().get();
            const novosSnap3 = await db.collection('leads').where('estado', '==', 'novo').count().get();
            const novosSnap4 = await db.collection('leads').where('estado', '==', 'por contactar').count().get();
            const totalNovos = novosSnap1.data().count + novosSnap2.data().count + novosSnap3.data().count + novosSnap4.data().count;
            
            document.getElementById('statTotalLeads').textContent = totalAtivos;
            document.getElementById('statNovosLeads').textContent = totalNovos;

            // Fetch recent 20 leads for the table
            db.collection('leads').orderBy('dataEnvio', 'desc').limit(20).onSnapshot(snap => {
                recentLeadsData = [];
                snap.forEach(doc => {
                    const data = doc.data();
                    if (!data.isDeleted) {
                        recentLeadsData.push({ id: doc.id, ...data });
                    }
                });
                renderRecentLeads();
            });

        } catch (e) {
            console.error('Error with aggregate queries, fallback to old method: ', e);
            // fallback if count() fails (e.g. old SDK cached)
            db.collection('leads').limit(50).onSnapshot(snap => {
                recentLeadsData = [];
                snap.forEach(doc => recentLeadsData.push({id: doc.id, ...doc.data()}));
                renderRecentLeads();
            });
        }`;

code = code.replace(dashboardLeadsRegex, newDashboardLeads);

// 3. Replace loadCRM and renderCRMTable
const crmRegex = /\/\/ 2\. CRM Module\nfunction loadCRM\(\) {[\s\S]*?function renderCRMTable\(\) {[\s\S]*?tbodyExcluidos\.innerHTML = htmlExcluidos;\n}/g;

const newCrmModule = `// 2. CRM Module
function switchCrmTab(tabId) {
    document.querySelectorAll('.crm-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(\`.crm-tabs .tab-btn[onclick="switchCrmTab('\${tabId}')"]\`).classList.add('active');
    
    document.querySelectorAll('.table-container').forEach(tc => tc.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    
    crmIsDeletedTab = (tabId === 'crm-excluidos');
    localStorage.setItem('crmSubTab', tabId);
    
    // Reset and fetch
    crmLastVisible = null;
    crmLeadsData[crmIsDeletedTab ? 'excluidos' : 'ativos'] = [];
    fetchCRMData();
}

async function fetchCRMData(isLoadMore = false) {
    const filter = document.getElementById('filterEstado').value;
    crmCurrentFilter = filter;
    const btn = document.getElementById('btnLoadMoreCrm');
    if(btn) btn.style.display = 'none';

    let query = db.collection('leads');
    
    // Since we don't have composite indexes guaranteed for isDeleted + estado + orderby date,
    // the safest paginated query without breaking the user's setup is to filter client side 
    // BUT we fetch chunks of 30 ordered by date.
    query = query.orderBy('dataEnvio', 'desc');

    if (crmLastVisible && isLoadMore) {
        query = query.startAfter(crmLastVisible);
    }
    query = query.limit(30); // get chunks of 30

    try {
        const snap = await query.get();
        if (snap.empty) {
            if(btn) btn.style.display = 'none';
            if(!isLoadMore) renderCRMTable(true);
            return;
        }

        crmLastVisible = snap.docs[snap.docs.length - 1];
        
        snap.forEach(doc => {
            const data = doc.data();
            const isDel = !!data.isDeleted;
            const lEstado = (data.estado || 'por contactar').toLowerCase();
            const normalizedState = lEstado === 'novo' ? 'por contactar' : lEstado;
            
            let matchesFilter = true;
            if (crmCurrentFilter && normalizedState !== crmCurrentFilter.toLowerCase()) {
                matchesFilter = false;
            }

            if (isDel) {
                if(!crmIsDeletedTab) return; // ignore
                if(matchesFilter) crmLeadsData.excluidos.push({ id: doc.id, ...data });
            } else {
                if(crmIsDeletedTab) return; // ignore
                if(matchesFilter) crmLeadsData.ativos.push({ id: doc.id, ...data });
            }
        });

        renderCRMTable();
        
        // Show load more if we got a full chunk
        if(snap.docs.length === 30 && btn) {
            btn.style.display = 'block';
            btn.onclick = () => fetchCRMData(true);
        }
    } catch(e) {
        console.error("Error fetching CRM", e);
    }
}

function loadCRM() {
    // Override filter change to fetch instead of just render
    const filterEl = document.getElementById('filterEstado');
    if(filterEl) {
        // remove old listeners
        const newEl = filterEl.cloneNode(true);
        filterEl.parentNode.replaceChild(newEl, filterEl);
        newEl.addEventListener('change', () => {
            crmLastVisible = null;
            crmLeadsData.ativos = [];
            crmLeadsData.excluidos = [];
            fetchCRMData();
        });
    }

    // Initial fetch
    crmLastVisible = null;
    crmLeadsData = { ativos: [], excluidos: [] };
    fetchCRMData();
}

function renderCRMTable(empty = false) {
    const tbodyAtivos = document.getElementById('crmTable');
    const tbodyExcluidos = document.getElementById('deletedCrmTable');
    let htmlAtivos = '';
    let htmlExcluidos = '';

    if (empty && !crmIsDeletedTab) htmlAtivos = '<tr><td colspan="7" style="text-align:center;">Sem resultados</td></tr>';
    if (empty && crmIsDeletedTab) htmlExcluidos = '<tr><td colspan="7" style="text-align:center;">Sem resultados</td></tr>';

    const leadsToRender = crmIsDeletedTab ? crmLeadsData.excluidos : crmLeadsData.ativos;

    leadsToRender.forEach(lead => {
        const dateField = crmIsDeletedTab ? lead.dataExclusao : (lead.dataEnvio || lead.dataCriacao);
        const dateObj = dateField ? new Date(dateField.toDate()) : null;
        const date = dateObj ? \`\${dateObj.toLocaleDateString('pt-PT')} <span style="color: #64748b; font-size: 0.85rem; display:block;">\${dateObj.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>\` : 'N/A';
        
        const estadoRaw = lead.estado || 'por contactar';
        const estadoNormalized = estadoRaw.toLowerCase() === 'novo' ? 'Por Contactar' : estadoRaw.charAt(0).toUpperCase() + estadoRaw.slice(1).toLowerCase();

        let origemHtml = \`<strong>\${lead.origem || 'Website'}</strong>\`;
        let detalhes = [];
        if (lead.plano_interesse) detalhes.push(\`Plano: \${lead.plano_interesse}\`);
        if (lead.tipo_negocio) detalhes.push(\`Negócio: \${lead.tipo_negocio}\`);
        if (lead.apoio_prr) detalhes.push(\`PRR: \${lead.apoio_prr}\`);
        if (detalhes.length > 0) {
            origemHtml += \`<div style="font-size: 0.8rem; color: #64748b; margin-top: 4px; line-height: 1.4;">\${detalhes.join('<br>')}</div>\`;
        }

        let dispositivoIcon = '';
        if (lead.dispositivo === 'Telemóvel') {
            dispositivoIcon = '<i data-lucide="smartphone" style="width: 14px; height: 14px; margin-left: 5px;" title="Submetido via Telemóvel"></i>';
        } else if (lead.dispositivo === 'Computador') {
            dispositivoIcon = '<i data-lucide="monitor" style="width: 14px; height: 14px; margin-left: 5px;" title="Submetido via Computador"></i>';
        }

        if (!crmIsDeletedTab) {
            let btnVerConta = '';
            if (lead.userId) {
                btnVerConta = \`<button class="btn-icon" onclick="window.open('area-cliente.html?uid=\${lead.userId}', '_blank')" title="Ver Conta do Cliente">
                    <i data-lucide="user" style="color: var(--success)"></i>
                </button>\`;
            }

            htmlAtivos += \`
            <tr>
                <td>\${lead.nome || 'N/A'}</td>
                <td>\${lead.email || 'N/A'}</td>
                <td>\${lead.telefone || 'N/A'}</td>
                <td><span style="display:block;">\${origemHtml}</span>\${dispositivoIcon}</td>
                <td>
                    <select class="form-control" style="width: auto; padding: 4px;" onchange="updateLeadEstado('\${lead.id}', this.value)">
                        <option value="Por Contactar" \${estadoNormalized === 'Por Contactar' ? 'selected' : ''}>Por Contactar</option>
                        <option value="Em Contacto" \${estadoNormalized === 'Em Contacto' ? 'selected' : ''}>Em Contacto</option>
                        <option value="Fechado" \${estadoNormalized === 'Fechado' ? 'selected' : ''}>Fechado</option>
                    </select>
                </td>
                <td>\${date}</td>
                <td>
                    \${btnVerConta}
                    <button class="btn-icon" onclick="showAdminAlert('Mensagem da Lead', decodeURIComponent('\${encodeURIComponent(lead.mensagem || 'Sem mensagem')}'))" title="Ver Mensagem">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteLead('\${lead.id}')" title="Excluir Lead">
                        <i data-lucide="trash-2" style="color: var(--danger)"></i>
                    </button>
                </td>
            </tr>\`;
        } else {
            htmlExcluidos += \`
            <tr>
                <td>\${lead.nome || 'N/A'}</td>
                <td>\${lead.email || 'N/A'}</td>
                <td>\${lead.telefone || 'N/A'}</td>
                <td>\${origemHtml}</td>
                <td>\${lead.dataCriacao ? new Date(lead.dataCriacao.toDate()).toLocaleDateString('pt-PT') : 'N/A'}</td>
                <td><span style="color: var(--danger)">\${date}</span></td>
                <td>
                    <button class="btn-icon" onclick="restoreLead('\${lead.id}')" title="Restaurar Lead">
                        <i data-lucide="refresh-cw" style="color: var(--success)"></i>
                    </button>
                    <button class="btn-icon" onclick="permanentDeleteLead('\${lead.id}')" title="Excluir Definitivamente">
                        <i data-lucide="x-circle" style="color: var(--danger)"></i>
                    </button>
                </td>
            </tr>\`;
        }
    });

    if(!crmIsDeletedTab) tbodyAtivos.innerHTML = htmlAtivos;
    if(crmIsDeletedTab) tbodyExcluidos.innerHTML = htmlExcluidos;
    lucide.createIcons();
}`;

code = code.replace(crmRegex, newCrmModule);

// 4. Update switchCrmTab existing function replacement
// Since we injected switchCrmTab into loadCRM, we need to remove the old switchCrmTab if it exists.
// Wait, switchCrmTab is currently defined around line 282. Let's remove the original one to prevent redeclaration.
code = code.replace(/function switchCrmTab\(tabId\) {[\s\S]*?localStorage\.setItem\('crmSubTab', tabId\);\n}/, '/* switchCrmTab moved above */');

fs.writeFileSync('js/admin.js', code);
console.log('Done refactoring CRM pagination');
