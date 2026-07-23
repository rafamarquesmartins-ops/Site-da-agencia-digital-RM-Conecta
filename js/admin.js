// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    const ADMIN_EMAIL = 'conecta.rm01@gmail.com';
    
    // Auth Check
    auth.onAuthStateChanged(user => {
        if (!user || user.email !== ADMIN_EMAIL) {
            window.location.href = 'index.html';
        } else {
            document.getElementById('fullLoader').style.display = 'none';
            document.getElementById('appContent').style.display = 'block';
            initAdmin();
        }
    });

    // Date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('pt-PT', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut();
    });

    // Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    document.getElementById('openSidebar').addEventListener('click', () => sidebar.classList.add('open'));
    document.getElementById('closeSidebar').addEventListener('click', () => sidebar.classList.remove('open'));

    // Navigation
    document.querySelectorAll('.nav-links a[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(link.getAttribute('data-target')).classList.add('active');
            
            if(window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });
});

// Modals
function openModal(id) {
    document.getElementById(id).classList.add('active');
}
function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    // reset form inside if exists
    const form = document.querySelector(`#${id} form`);
    if(form) {
        form.reset();
        const hiddenId = form.querySelector('input[type="hidden"]');
        if(hiddenId) hiddenId.value = '';
    }
}

// Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// Global data references for filters
let allLeads = [];
let recentLeadsData = [];
let dashboardLeadsLimit = Infinity;
let currentUsersTab = 'ativos';
let usersUnsubscribe = null;
let deletedUsersUnsubscribe = null;

function initAdmin() {
    loadDashboardStats();
    loadCRM();
    loadUsers();
    loadPortfolio();
    loadRecursos();
    
    // CRM Filter
    document.getElementById('filterEstado').addEventListener('change', renderCRMTable);
    
    // Forms
    document.getElementById('portfolioForm').addEventListener('submit', handlePortfolioSubmit);
    document.getElementById('recursoForm').addEventListener('submit', handleRecursoSubmit);
}

// 1. Dashboard Module
async function loadDashboardStats() {
    try {
        // Dropdown limit
        if (!document.getElementById('dashboardLeadsLimitContainer')) {
            const container = document.createElement('div');
            container.id = 'dashboardLeadsLimitContainer';
            container.style.marginBottom = '15px';
            container.innerHTML = `
                <label for="dashboardLeadsLimit" style="margin-right: 10px; font-weight: 500;">Mostrar Leads:</label>
                <select id="dashboardLeadsLimit" class="form-control" style="width: auto; display: inline-block;">
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="Todos" selected>Todos</option>
                </select>
            `;
            const table = document.getElementById('recentLeadsTable').closest('table');
            if (table) {
                table.parentNode.insertBefore(container, table);
            }
            
            document.getElementById('dashboardLeadsLimit').addEventListener('change', (e) => {
                const val = parseInt(e.target.value);
                dashboardLeadsLimit = val === 0 || isNaN(val) ? Infinity : val;
                renderRecentLeads();
            });
        }

        // Users
        db.collection('users').onSnapshot(snap => {
            document.getElementById('statUsers').textContent = snap.size;
        });
        
        // Projects
        db.collection('projetos').onSnapshot(snap => {
            document.getElementById('statProjects').textContent = snap.size;
        });

        // Leads (Total & Novos)
        db.collection('leads').onSnapshot(snap => {
            document.getElementById('statTotalLeads').textContent = snap.size;
            let novos = 0;
            recentLeadsData = [];
            snap.forEach(doc => {
                const data = doc.data();
                const estado = (data.estado || 'novo').toLowerCase();
                if(estado === 'novo') novos++;
                recentLeadsData.push({ id: doc.id, ...data });
            });
            document.getElementById('statNovosLeads').textContent = novos;
            
            // Sort by date desc
            recentLeadsData.sort((a, b) => {
                const tA = (a.dataEnvio || a.dataCriacao) ? (a.dataEnvio || a.dataCriacao).toMillis() : 0;
                const tB = (b.dataEnvio || b.dataCriacao) ? (b.dataEnvio || b.dataCriacao).toMillis() : 0;
                return tB - tA;
            });
            
            renderRecentLeads();
        });
    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

function renderRecentLeads() {
    const tbody = document.getElementById('recentLeadsTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    const toShow = dashboardLeadsLimit === Infinity ? recentLeadsData : recentLeadsData.slice(0, dashboardLeadsLimit);
    
    toShow.forEach(lead => {
        const dateField = lead.dataEnvio || lead.dataCriacao;
        const dateObj = dateField ? new Date(dateField.toDate()) : null;
        const date = dateObj ? `${dateObj.toLocaleDateString('pt-PT')} <span style="color: #64748b; font-size: 0.85rem; margin-left: 5px;">${dateObj.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>` : 'N/A';
        const estado = lead.estado ? lead.estado.charAt(0).toUpperCase() + lead.estado.slice(1).toLowerCase() : 'Novo';
        tbody.innerHTML += `
            <tr>
                <td>${lead.nome || 'N/A'}</td>
                <td>${lead.email || 'N/A'}</td>
                <td>${lead.origem || 'Website'}</td>
                <td><span class="badge badge-${estado.toLowerCase().replace(' ', '-')}">${estado}</span></td>
                <td>${date}</td>
            </tr>
        `;
    });
}

// 2. CRM Module
function loadCRM() {
    db.collection('leads').onSnapshot(snap => {
        allLeads = [];
        snap.forEach(doc => allLeads.push({ id: doc.id, ...doc.data() }));
        
        // Sort by date desc client-side
        allLeads.sort((a, b) => {
            const tA = (a.dataEnvio || a.dataCriacao) ? (a.dataEnvio || a.dataCriacao).toMillis() : 0;
            const tB = (b.dataEnvio || b.dataCriacao) ? (b.dataEnvio || b.dataCriacao).toMillis() : 0;
            return tB - tA;
        });

        renderCRMTable();
    }, err => console.error("Error loading leads:", err));
}

function renderCRMTable() {
    const filter = document.getElementById('filterEstado').value;
    const tbody = document.getElementById('crmTable');
    tbody.innerHTML = '';
    
    let filtered = allLeads;
    if(filter) {
        filtered = allLeads.filter(l => (l.estado || 'novo').toLowerCase() === filter.toLowerCase());
    }
    
    filtered.forEach(lead => {
        const dateField = lead.dataEnvio || lead.dataCriacao;
        const dateObj = dateField ? new Date(dateField.toDate()) : null;
        const date = dateObj ? `${dateObj.toLocaleDateString('pt-PT')} <span style="color: #64748b; font-size: 0.85rem; margin-left: 5px;">${dateObj.toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'})}</span>` : 'N/A';
        // Capitalize for display
        const estado = lead.estado ? lead.estado.charAt(0).toUpperCase() + lead.estado.slice(1).toLowerCase() : 'Novo';
        const rawEstado = (lead.estado || 'novo').toLowerCase();
        
        tbody.innerHTML += `
            <tr>
                <td>${lead.nome || 'N/A'}</td>
                <td>${lead.email || 'N/A'}</td>
                <td>${lead.telefone || 'N/A'}</td>
                <td>${lead.origem || 'Website'}</td>
                <td>
                    <select class="form-control" style="width: auto; padding: 4px;" onchange="updateLeadEstado('${lead.id}', this.value)">
                        <option value="novo" ${rawEstado === 'novo' ? 'selected' : ''}>Novo</option>
                        <option value="em contacto" ${rawEstado === 'em contacto' ? 'selected' : ''}>Em Contacto</option>
                        <option value="fechado" ${rawEstado === 'fechado' ? 'selected' : ''}>Fechado</option>
                    </select>
                </td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="showAdminAlert('Mensagem da Lead', \`${(lead.mensagem || 'Sem mensagem').replace(/`/g, "'")}\`)" title="Ver Mensagem">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteLead('${lead.id}')" title="Apagar">
                        <i data-lucide="trash-2" style="color: var(--danger)"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

async function updateLeadEstado(id, newEstado) {
    try {
        await db.collection('leads').doc(id).update({ estado: newEstado });
        showToast('Estado atualizado com sucesso.');
    } catch(err) {
        console.error(err);
        showToast('Erro ao atualizar estado.', 'error');
    }
}

async function deleteLead(id) {
    showAdminConfirm('Apagar Lead', 'Tem a certeza que deseja apagar esta lead? Esta ação não pode ser desfeita.', async () => {
        try {
            await db.collection('leads').doc(id).delete();
            showToast('Lead apagada.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao apagar.', 'error');
        }
    });
}

// 3. Utilizadores Module
function initUsersTabs() {
    if (document.getElementById('usersTabsContainer')) return;
    
    const container = document.createElement('div');
    container.id = 'usersTabsContainer';
    container.style.display = 'flex';
    container.style.gap = '10px';
    container.style.marginBottom = '20px';
    
    container.innerHTML = `
        <button id="tabUsersAtivos" class="btn btn-primary" style="border-radius: 50px;">Ativos</button>
        <button id="tabUsersExcluidos" class="btn btn-outline" style="border-radius: 50px;">Contas Excluídas</button>
    `;
    
    const table = document.getElementById('usersTable').closest('table');
    table.parentNode.insertBefore(container, table);
    
    document.getElementById('tabUsersAtivos').addEventListener('click', () => {
        currentUsersTab = 'ativos';
        updateUsersTabsUI();
        loadUsersData();
    });
    
    document.getElementById('tabUsersExcluidos').addEventListener('click', () => {
        currentUsersTab = 'excluidos';
        updateUsersTabsUI();
        loadDeletedUsersData();
    });
}

function updateUsersTabsUI() {
    const btnAtivos = document.getElementById('tabUsersAtivos');
    const btnExcluidos = document.getElementById('tabUsersExcluidos');
    if (currentUsersTab === 'ativos') {
        btnAtivos.className = 'btn btn-primary';
        btnExcluidos.className = 'btn btn-outline';
    } else {
        btnAtivos.className = 'btn btn-outline';
        btnExcluidos.className = 'btn btn-primary';
    }
}

function loadUsers() {
    initUsersTabs();
    loadUsersData();
}

function loadUsersData() {
    if (deletedUsersUnsubscribe) { deletedUsersUnsubscribe(); deletedUsersUnsubscribe = null; }
    
    const thead = document.getElementById('usersTable').closest('table').querySelector('thead tr');
    thead.innerHTML = `
        <th>Nome</th>
        <th>Email</th>
        <th>Plano</th>
        <th>Data Registo</th>
        <th>Ações</th>
    `;
    
    usersUnsubscribe = db.collection('users').onSnapshot(snap => {
        if (currentUsersTab !== 'ativos') return;
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';
        snap.forEach(doc => {
            const user = doc.data();
            const dateField = user.dataRegisto || user.dataCriacao;
            const date = dateField ? new Date(dateField.toDate()).toLocaleDateString('pt-PT') : 'N/A';
            const plano = user.plano || 'Sem Plano';
            tbody.innerHTML += `
                <tr>
                    <td>${user.nome || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>
                        <select class="form-control" style="width: auto; padding: 4px;" onchange="updateUserPlan('${doc.id}', this.value)">
                            <option value="Sem Plano" ${plano === 'Sem Plano' ? 'selected' : ''}>Sem Plano</option>
                            <option value="Básico" ${plano === 'Básico' ? 'selected' : ''}>Básico</option>
                            <option value="Intermédio" ${plano === 'Intermédio' ? 'selected' : ''}>Intermédio</option>
                            <option value="VIP" ${plano === 'VIP' ? 'selected' : ''}>VIP</option>
                        </select>
                    </td>
                    <td>${date}</td>
                    <td>
                        <button class="btn-icon" onclick="encerrarConta('${doc.id}')" title="Encerrar Conta">
                            <i data-lucide="user-x" style="color: var(--danger)"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteUserDoc('${doc.id}')" title="Remover Registo (Sem Arquivar)">
                            <i data-lucide="trash-2" style="color: var(--text-light)"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        lucide.createIcons();
    }, err => console.error(err));
}

function loadDeletedUsersData() {
    if (usersUnsubscribe) { usersUnsubscribe(); usersUnsubscribe = null; }
    
    const thead = document.getElementById('usersTable').closest('table').querySelector('thead tr');
    thead.innerHTML = `
        <th>Nome</th>
        <th>Email</th>
        <th>Plano (que tinha)</th>
        <th>Data Registo</th>
        <th>Data Exclusão</th>
    `;
    
    deletedUsersUnsubscribe = db.collection('users_deleted').onSnapshot(snap => {
        if (currentUsersTab !== 'excluidos') return;
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = '';
        const deletedUsers = [];
        snap.forEach(doc => deletedUsers.push(doc.data()));
        
        deletedUsers.sort((a, b) => {
            const tA = a.dataExclusao ? a.dataExclusao.toMillis() : 0;
            const tB = b.dataExclusao ? b.dataExclusao.toMillis() : 0;
            return tB - tA;
        });

        deletedUsers.forEach(user => {
            const dateFieldReg = user.dataRegisto || user.dataCriacao;
            const dateReg = dateFieldReg ? new Date(dateFieldReg.toDate()).toLocaleDateString('pt-PT') : 'N/A';
            const dateFieldExcl = user.dataExclusao;
            const dateExcl = dateFieldExcl ? new Date(dateFieldExcl.toDate()).toLocaleDateString('pt-PT') : 'N/A';
            const plano = user.plano || 'Sem Plano';
            tbody.innerHTML += `
                <tr>
                    <td>${user.nome || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${plano}</td>
                    <td>${dateReg}</td>
                    <td>${dateExcl}</td>
                </tr>
            `;
        });
        lucide.createIcons();
    }, err => console.error(err));
}

async function updateUserPlan(id, newPlano) {
    try {
        await db.collection('users').doc(id).update({ plano: newPlano });
        showToast('Plano de utilizador atualizado.');
    } catch(err) {
        console.error(err);
        showToast('Erro ao atualizar plano.', 'error');
    }
}

async function deleteUserAccountPermanently(id, userEmail) {
    showAdminConfirm('Encerrar Conta', 'Tem a certeza que deseja encerrar esta conta permanentemente? (Arquiva o registo e remove dos ativos)', async () => {
        try {
            const userDoc = await db.collection('users').doc(id).get();
            if(userDoc.exists) {
                const data = userDoc.data();
                data.dataExclusao = firebase.firestore.FieldValue.serverTimestamp();
                data.motivoExclusao = 'Encerrada pelo Admin';
                await db.collection('users_deleted').doc(id).set(data);
                await db.collection('users').doc(id).delete();
                showToast('Conta encerrada e arquivada.');
            }
        } catch(err) {
            console.error(err);
            showToast('Erro ao encerrar conta.', 'error');
        }
    });
}

async function deleteUserDoc(id) {
    showAdminConfirm('Remover Registo', 'Atenção: Isto remove apenas o documento do Firestore, não a conta de Auth nem arquiva. Continuar?', async () => {
        try {
            await db.collection('users').doc(id).delete();
            showToast('Utilizador apagado.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao apagar.', 'error');
        }
    });
}

// 4. Portfolio Module
function loadPortfolio() {
    db.collection('projetos').orderBy('ordem', 'asc').onSnapshot(snap => {
        const grid = document.getElementById('portfolioGrid');
        grid.innerHTML = '';
        snap.forEach(doc => {
            const p = doc.data();
            const imgUrl = p.imagemUrl || p.imagem;
            grid.innerHTML += `
                <div class="item-card">
                    <img src="${imgUrl}" alt="${p.nome}">
                    <div class="item-card-body">
                        <h3 style="margin-bottom: 8px;">${p.nome}</h3>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 8px;">${p.tipo}</p>
                        <p style="font-size: 0.875rem; color: var(--text-light)">Ordem: ${p.ordem || 0}</p>
                        <div class="item-card-actions">
                            <button class="btn btn-primary" style="flex:1; justify-content:center; padding:6px;" onclick='editPortfolio("${doc.id}", ${JSON.stringify(p).replace(/'/g, "&apos;")})'>Editar</button>
                            <button class="btn btn-danger" style="padding:6px;" onclick="deletePortfolio('${doc.id}')"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        lucide.createIcons();
    });
}

async function handlePortfolioSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('projId').value;
    const data = {
        nome: document.getElementById('projNome').value,
        tipo: document.getElementById('projTipo').value,
        imagemUrl: document.getElementById('projImg').value,
        ordem: parseInt(document.getElementById('projOrdem').value),
        desafio: document.getElementById('projDesafio').value,
        resultado: document.getElementById('projResultado').value,
    };

    try {
        if(id) {
            await db.collection('projetos').doc(id).update(data);
            showToast('Projeto atualizado!');
        } else {
            data.dataCriacao = firebase.firestore.FieldValue.serverTimestamp();
            data.ativo = true;
            await db.collection('projetos').add(data);
            showToast('Projeto adicionado!');
        }
        closeModal('portfolioModal');
    } catch(err) {
        console.error(err);
        showToast('Erro ao guardar projeto.', 'error');
    }
}

window.editPortfolio = function(id, data) {
    document.getElementById('portfolioModalTitle').textContent = 'Editar Projeto';
    document.getElementById('projId').value = id;
    document.getElementById('projNome').value = data.nome;
    document.getElementById('projTipo').value = data.tipo;
    document.getElementById('projImg').value = data.imagemUrl || data.imagem || '';
    document.getElementById('projOrdem').value = data.ordem || 0;
    document.getElementById('projDesafio').value = data.desafio;
    document.getElementById('projResultado').value = data.resultado;
    openModal('portfolioModal');
}

async function deletePortfolio(id) {
    showAdminConfirm('Apagar Projeto', 'Tem a certeza que deseja apagar este projeto do portfólio?', async () => {
        try {
            await db.collection('projetos').doc(id).delete();
            showToast('Projeto apagado.');
        } catch(err) {
            showToast('Erro ao apagar.', 'error');
        }
    });
}

// 5. Recursos Module
function loadRecursos() {
    db.collection('recursos').onSnapshot(snap => {
        const grid = document.getElementById('recursosGrid');
        grid.innerHTML = '';
        snap.forEach(doc => {
            const r = doc.data();
            const nivel = r.nivelMinimo || r.nivel || 'N/A';
            grid.innerHTML += `
                <div class="item-card">
                    <div class="item-card-body">
                        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                            <h3>${r.titulo}</h3>
                            <span class="badge" style="background:var(--bg-secondary); border:1px solid var(--border);">${nivel}</span>
                        </div>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 16px;">${r.descricao}</p>
                        <a href="${r.url}" target="_blank" style="color: var(--primary); text-decoration: none; font-size: 0.875rem; display: flex; align-items: center; gap: 4px;">
                            <i data-lucide="external-link" style="width:14px; height:14px;"></i> Ver Ficheiro
                        </a>
                        <div class="item-card-actions">
                            <button class="btn btn-primary" style="flex:1; justify-content:center; padding:6px;" onclick='editRecurso("${doc.id}", ${JSON.stringify(r).replace(/'/g, "&apos;")})'>Editar</button>
                            <button class="btn btn-danger" style="padding:6px;" onclick="deleteRecurso('${doc.id}')"><i data-lucide="trash-2"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        lucide.createIcons();
    });
}

async function handleRecursoSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('recId').value;
    const data = {
        titulo: document.getElementById('recTitulo').value,
        descricao: document.getElementById('recDesc').value,
        url: document.getElementById('recUrl').value,
        nivelMinimo: document.getElementById('recNivel').value,
    };

    try {
        if(id) {
            await db.collection('recursos').doc(id).update(data);
            showToast('Recurso atualizado!');
        } else {
            data.dataCriacao = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('recursos').add(data);
            showToast('Recurso adicionado!');
        }
        closeModal('recursoModal');
    } catch(err) {
        console.error(err);
        showToast('Erro ao guardar recurso.', 'error');
    }
}

window.editRecurso = function(id, data) {
    document.getElementById('recursoModalTitle').textContent = 'Editar Recurso';
    document.getElementById('recId').value = id;
    document.getElementById('recTitulo').value = data.titulo;
    document.getElementById('recDesc').value = data.descricao;
    document.getElementById('recUrl').value = data.url;
    document.getElementById('recNivel').value = data.nivelMinimo || data.nivel || '';
    openModal('recursoModal');
}

async function deleteRecurso(id) {
    showAdminConfirm('Apagar Recurso', 'Tem a certeza que deseja apagar este recurso?', async () => {
        try {
            await db.collection('recursos').doc(id).delete();
            showToast('Recurso apagado.');
        } catch(err) {
            showToast('Erro ao apagar.', 'error');
        }
    });
}

// -----------------------------------------------------------------
// CUSTOM MODAL ALERTS & CONFIRMS
// -----------------------------------------------------------------

function createAdminModalOverlay() {
    let overlay = document.getElementById('admin-custom-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'admin-custom-modal';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:none;align-items:center;justify-content:center;z-index:9999;opacity:0;transition:opacity 0.2s ease;';
        
        const modalBox = document.createElement('div');
        modalBox.id = 'admin-custom-modal-box';
        modalBox.style.cssText = 'background:white;padding:24px;border-radius:12px;width:90%;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.1);transform:translateY(20px);transition:transform 0.2s ease;';
        
        overlay.appendChild(modalBox);
        document.body.appendChild(overlay);
    }
    return overlay;
}

window.showAdminAlert = function(title, message) {
    const overlay = createAdminModalOverlay();
    const box = overlay.querySelector('#admin-custom-modal-box');
    
    box.innerHTML = `
        <h3 style="margin-bottom:10px;color:var(--text-main);display:flex;align-items:center;gap:8px;">
            <i data-lucide="info" style="color:var(--primary);"></i> ${title}
        </h3>
        <p style="margin-bottom:20px;color:var(--text-secondary);font-size:0.95rem;line-height:1.5;">${message}</p>
        <button class="btn btn-primary" style="width:100%;justify-content:center;" onclick="closeAdminModal()">OK</button>
    `;
    lucide.createIcons();
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'translateY(0)';
    }, 10);
};

window.showAdminConfirm = function(title, message, onConfirmCallback) {
    const overlay = createAdminModalOverlay();
    const box = overlay.querySelector('#admin-custom-modal-box');
    
    box.innerHTML = `
        <h3 style="margin-bottom:10px;color:var(--text-main);display:flex;align-items:center;gap:8px;">
            <i data-lucide="help-circle" style="color:var(--warning);"></i> ${title}
        </h3>
        <p style="margin-bottom:20px;color:var(--text-secondary);font-size:0.95rem;line-height:1.5;">${message}</p>
        <div style="display:flex;gap:10px;">
            <button class="btn btn-outline" style="flex:1;justify-content:center;" onclick="closeAdminModal()">Cancelar</button>
            <button class="btn btn-danger" style="flex:1;justify-content:center;" id="btn-admin-confirm">Confirmar</button>
        </div>
    `;
    lucide.createIcons();
    
    document.getElementById('btn-admin-confirm').addEventListener('click', () => {
        closeAdminModal();
        if (typeof onConfirmCallback === 'function') onConfirmCallback();
    });
    
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'translateY(0)';
    }, 10);
};

window.closeAdminModal = function() {
    const overlay = document.getElementById('admin-custom-modal');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.querySelector('#admin-custom-modal-box').style.transform = 'translateY(20px)';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 200);
    }
};
