// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    const ADMIN_EMAIL = 'conecta.rm01@gmail.com';
    
    // Auth Check
    auth.onAuthStateChanged(user => {
        if (!user || user.email !== ADMIN_EMAIL) {
            alert('Acesso Restrito: Por favor inicie sessão na sua Área de Cliente com o e-mail de Administrador para aceder ao Painel.');
            window.location.href = 'area-cliente.html';
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
            const targetId = link.getAttribute('data-target');
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            link.parentElement.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            
            localStorage.setItem('adminActiveTab', targetId);
            if(window.innerWidth <= 768) sidebar.classList.remove('open');
        });
    });

    const activeTab = localStorage.getItem('adminActiveTab');
    if (activeTab) {
        const targetLink = document.querySelector(`.nav-links a[data-target="${activeTab}"]`);
        if (targetLink) targetLink.click();
    }
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
    const savedCrmTab = localStorage.getItem('crmSubTab');
    if (savedCrmTab) switchCrmTab(savedCrmTab);
    const savedUsersTab = localStorage.getItem('usersSubTab');
    if (savedUsersTab) switchUsersTab(savedUsersTab);
    
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
        const limitDropdown = document.getElementById('dashboardLeadsLimit');
        if (limitDropdown) {
            limitDropdown.addEventListener('change', (e) => {
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
        const estadoRaw = lead.estado || 'por contactar';
        const estadoNormalized = estadoRaw.toLowerCase() === 'novo' ? 'Por Contactar' : estadoRaw.charAt(0).toUpperCase() + estadoRaw.slice(1).toLowerCase();
        
        let origemHtml = lead.origem || 'Website';
        let detalhes = [];
        if (lead.plano_interesse) detalhes.push(`Plano: ${lead.plano_interesse}`);
        if (lead.tipo_negocio) detalhes.push(`Negócio: ${lead.tipo_negocio}`);
        if (lead.apoio_prr) detalhes.push(`PRR: ${lead.apoio_prr}`);
        if (detalhes.length > 0) {
            const detalheText = detalhes.join('<br>').replace(/'/g, "&apos;");
            origemHtml += `<br><span class="badge" style="background: var(--primary-light); color: var(--primary); font-size: 0.75rem; cursor: pointer; margin-top: 5px; display: inline-block;" onclick="showAdminAlert('Detalhes do Pedido', '${detalheText}')">+ Detalhes</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>${lead.nome || 'N/A'}</td>
                <td>${lead.email || 'N/A'}</td>
                <td>${origemHtml}</td>
                <td><span class="badge badge-${estadoNormalized.toLowerCase().replace(' ', '-')}">${estadoNormalized}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn-icon" onclick="deleteLead('${lead.id}')" title="Apagar">
                        <i data-lucide="trash-2" style="color: var(--danger)"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

let currentCrmTab = 'ativos';

function switchCrmTab(tab) {
    currentCrmTab = tab;
    localStorage.setItem('crmSubTab', tab);
    document.getElementById('crm-ativos').style.display = tab === 'ativos' ? 'block' : 'none';
    document.getElementById('crm-excluidos').style.display = tab === 'excluidos' ? 'block' : 'none';
    
    document.getElementById('tab-crm-ativos').classList.toggle('active-tab-btn', tab === 'ativos');
    document.getElementById('tab-crm-ativos').style.borderColor = tab === 'ativos' ? 'var(--primary)' : '';
    document.getElementById('tab-crm-ativos').style.color = tab === 'ativos' ? 'var(--primary)' : '';
    
    document.getElementById('tab-crm-excluidos').classList.toggle('active-tab-btn', tab === 'excluidos');
    document.getElementById('tab-crm-excluidos').style.borderColor = tab === 'excluidos' ? 'var(--primary)' : '';
    document.getElementById('tab-crm-excluidos').style.color = tab === 'excluidos' ? 'var(--primary)' : '';
    
    renderCRMTable();
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
    const tbodyAtivos = document.getElementById('crmTable');
    const tbodyExcluidos = document.getElementById('deletedCrmTable');
    tbodyAtivos.innerHTML = '';
    tbodyExcluidos.innerHTML = '';
    
    let filteredAtivos = allLeads.filter(l => !l.isDeleted);
    let filteredExcluidos = allLeads.filter(l => l.isDeleted);
    
    if(filter) {
        filteredAtivos = filteredAtivos.filter(l => {
            const lEstado = (l.estado || 'por contactar').toLowerCase();
            const normalizedState = lEstado === 'novo' ? 'por contactar' : lEstado;
            return normalizedState === filter.toLowerCase();
        });
        filteredExcluidos = filteredExcluidos.filter(l => {
            const lEstado = (l.estado || 'por contactar').toLowerCase();
            const normalizedState = lEstado === 'novo' ? 'por contactar' : lEstado;
            return normalizedState === filter.toLowerCase();
        });
    }
    
    filteredAtivos.forEach(lead => {
        const dateField = lead.dataEnvio || lead.dataCriacao;
        const date = dateField ? new Date(dateField.toDate()).toLocaleDateString('pt-PT') : 'N/A';
        const estadoOriginal = lead.estado || 'Novo';
        let estadoNormalized = estadoOriginal;
        if(estadoOriginal.toLowerCase() === 'novo') estadoNormalized = 'Por Contactar';
        
        let btnVerConta = `
            <button class="btn-icon" onclick="showAdminAlert('Informação da Conta', 'Este utilizador não tem conta criada.')" title="Sem Registo" style="opacity: 0.5;">
                <i data-lucide="user"></i>
            </button>`;
            
        if (lead.email && window.adminUsersByEmail && window.adminUsersByEmail[lead.email.toLowerCase()]) {
            const u = window.adminUsersByEmail[lead.email.toLowerCase()];
            const plano = u.plano || 'Sem Plano';
            const dateField = u.dataRegisto || u.dataCriacao;
            const uDate = dateField ? new Date(dateField.toDate()).toLocaleDateString('pt-PT') : 'N/A';
            const alertText = `Utilizador: ${u.nome || 'N/A'}<br>Plano Atual: ${plano}<br>Membro desde: ${uDate}`;
            btnVerConta = `
                <button class="btn-icon" data-info="${encodeURIComponent(alertText)}" onclick="showAdminAlert('Informação da Conta', decodeURIComponent(this.dataset.info))" title="Ver Conta">
                    <i data-lucide="user" style="color: var(--success)"></i>
                </button>`;
        }
        
        let dispositivoIcon = '';
        if (lead.dispositivo === 'Telemóvel') {
            dispositivoIcon = '<i data-lucide="smartphone" style="width: 14px; height: 14px; margin-left: 5px;" title="Submetido via Telemóvel"></i>';
        } else if (lead.dispositivo === 'Computador') {
            dispositivoIcon = '<i data-lucide="monitor" style="width: 14px; height: 14px; margin-left: 5px;" title="Submetido via Computador"></i>';
        }

        tbodyAtivos.innerHTML += `
            <tr>
                <td>${lead.nome || 'N/A'}</td>
                <td>${lead.email || 'N/A'}</td>
                <td>${lead.telefone || 'N/A'}</td>
                <td><span class="badge badge-primary" style="display:inline-flex;align-items:center;">${lead.origem || 'Site'} ${dispositivoIcon}</span></td>
                <td>
                    <select class="form-control" style="width: auto; padding: 4px;" onchange="updateLeadEstado('${lead.id}', this.value)">
                        <option value="Por Contactar" ${estadoNormalized === 'Por Contactar' ? 'selected' : ''}>Por Contactar</option>
                        <option value="Em Contacto" ${estadoNormalized === 'Em Contacto' ? 'selected' : ''}>Em Contacto</option>
                        <option value="Fechado" ${estadoNormalized === 'Fechado' ? 'selected' : ''}>Fechado</option>
                    </select>
                </td>
                <td>${date}</td>
                <td>
                    ${btnVerConta}
                    <button class="btn-icon" onclick="showAdminAlert('Mensagem da Lead', \`${(lead.mensagem || 'Sem mensagem').replace(/`/g, "'")}\`)" title="Ver Mensagem">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteLead('${lead.id}')" title="Excluir Lead">
                        <i data-lucide="trash-2" style="color: var(--danger)"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    filteredExcluidos.forEach(lead => {
        const dateFieldReg = lead.dataEnvio || lead.dataCriacao;
        const dateReg = dateFieldReg ? new Date(dateFieldReg.toDate()).toLocaleDateString('pt-PT') : 'N/A';
        const dateFieldExcl = lead.dataExclusao;
        const dateExcl = dateFieldExcl ? new Date(dateFieldExcl.toDate()).toLocaleDateString('pt-PT') : 'N/A';
        
        let dispositivoIconEx = '';
        if (lead.dispositivo === 'Telemóvel') {
            dispositivoIconEx = '<i data-lucide="smartphone" style="width: 14px; height: 14px; margin-left: 5px;" title="Submetido via Telemóvel"></i>';
        } else if (lead.dispositivo === 'Computador') {
            dispositivoIconEx = '<i data-lucide="monitor" style="width: 14px; height: 14px; margin-left: 5px;" title="Submetido via Computador"></i>';
        }

        tbodyExcluidos.innerHTML += `
            <tr>
                <td>${lead.nome || 'N/A'}</td>
                <td>${lead.email || 'N/A'}</td>
                <td>${lead.telefone || 'N/A'}</td>
                <td><span class="badge badge-primary" style="display:inline-flex;align-items:center;">${lead.origem || 'Site'} ${dispositivoIconEx}</span></td>
                <td>${dateReg}</td>
                <td>${dateExcl}</td>
                <td>
                    <button class="btn-icon" onclick="showAdminAlert('Mensagem da Lead', \`${(lead.mensagem || 'Sem mensagem').replace(/`/g, "'")}\`)" title="Ver Mensagem">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn-icon" onclick="restaurarLead('${lead.id}')" title="Restaurar Lead">
                        <i data-lucide="refresh-cw" style="color: var(--success)"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteLeadPermanently('${lead.id}')" title="Excluir Definitivamente">
                        <i data-lucide="x-circle" style="color: var(--danger)"></i>
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
    showAdminConfirm('Mover para Excluídos', 'Esta lead será movida para a aba de Excluídos. Continuar?', async () => {
        try {
            await db.collection('leads').doc(id).update({ isDeleted: true, dataExclusao: firebase.firestore.FieldValue.serverTimestamp() });
            showToast('Lead movida para excluídos.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao excluir.', 'error');
        }
    });
}

async function restaurarLead(id) {
    try {
        await db.collection('leads').doc(id).update({ isDeleted: firebase.firestore.FieldValue.delete(), dataExclusao: firebase.firestore.FieldValue.delete() });
        showToast('Lead restaurada.');
    } catch(err) {
        console.error(err);
        showToast('Erro ao restaurar lead.', 'error');
    }
}

async function deleteLeadPermanently(id) {
    showAdminConfirm('Excluir Definitivamente', 'Tem a certeza que deseja apagar permanentemente esta lead? Esta ação não pode ser desfeita.', async () => {
        try {
            await db.collection('leads').doc(id).delete();
            showToast('Lead apagada definitivamente.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao apagar definitivamente.', 'error');
        }
    });
}

// 3. Utilizadores Module
function switchUsersTab(tab) {
    localStorage.setItem('usersSubTab', tab);
    document.getElementById('users-ativos').style.display = tab === 'ativos' ? 'block' : 'none';
    document.getElementById('users-suspensos').style.display = tab === 'suspensos' ? 'block' : 'none';
    document.getElementById('users-excluidos').style.display = tab === 'excluidos' ? 'block' : 'none';
    
    document.getElementById('tab-users-ativos').classList.toggle('active-tab-btn', tab === 'ativos');
    document.getElementById('tab-users-ativos').style.borderColor = tab === 'ativos' ? 'var(--primary)' : '';
    document.getElementById('tab-users-ativos').style.color = tab === 'ativos' ? 'var(--primary)' : '';
    
    document.getElementById('tab-users-suspensos').classList.toggle('active-tab-btn', tab === 'suspensos');
    document.getElementById('tab-users-suspensos').style.borderColor = tab === 'suspensos' ? 'var(--primary)' : '';
    document.getElementById('tab-users-suspensos').style.color = tab === 'suspensos' ? 'var(--primary)' : '';
    
    document.getElementById('tab-users-excluidos').classList.toggle('active-tab-btn', tab === 'excluidos');
    document.getElementById('tab-users-excluidos').style.borderColor = tab === 'excluidos' ? 'var(--primary)' : '';
    document.getElementById('tab-users-excluidos').style.color = tab === 'excluidos' ? 'var(--primary)' : '';
    
    loadUsersData();
}

function loadUsers() {
    loadUsersData();
}

function loadUsersData() {
    if (usersUnsubscribe) { usersUnsubscribe(); usersUnsubscribe = null; }
    if (deletedUsersUnsubscribe) { deletedUsersUnsubscribe(); deletedUsersUnsubscribe = null; }
    
    usersUnsubscribe = db.collection('users').onSnapshot(snap => {
        window.adminUsersByEmail = {};
        const tbodyAtivos = document.getElementById('usersTable');
        const tbodySuspensos = document.getElementById('suspendedUsersTable');
        tbodyAtivos.innerHTML = '';
        tbodySuspensos.innerHTML = '';
        
        snap.forEach(doc => {
            const user = doc.data();
            if (user.email) window.adminUsersByEmail[user.email.toLowerCase()] = { id: doc.id, ...user };
            const dateField = user.dataRegisto || user.dataCriacao;
            const date = dateField ? new Date(dateField.toDate()).toLocaleDateString('pt-PT') : 'N/A';
            const plano = user.plano || 'Sem Plano';
            
            if (user.disabled || user.status === 'suspenso') {
                tbodySuspensos.innerHTML += `
                    <tr>
                        <td>${user.nome || 'N/A'}</td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${plano}</td>
                        <td>${date}</td>
                        <td>
                            <button class="btn-icon" onclick="restaurarConta('${doc.id}')" title="Reativar Conta">
                                <i data-lucide="user-check" style="color: var(--success)"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                tbodyAtivos.innerHTML += `
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
                            <button class="btn-icon" onclick="terminarSessao('${doc.id}')" title="Terminar Sessão (Forçar Logout)">
                                <i data-lucide="log-out"></i>
                            </button>
                            <button class="btn-icon" onclick="suspenderConta('${doc.id}')" title="Suspender Conta (Bloqueio Temporário)">
                                <i data-lucide="pause-circle" style="color: var(--warning)"></i>
                            </button>
                            <button class="btn-icon" onclick="encerrarConta('${doc.id}')" title="Encerrar Conta Permanentemente">
                                <i data-lucide="user-x" style="color: var(--danger)"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }
        });
        lucide.createIcons();
    });

    deletedUsersUnsubscribe = db.collection('users_deleted').onSnapshot(snap => {
        const tbodyExcluidos = document.getElementById('deletedUsersTable');
        tbodyExcluidos.innerHTML = '';
        const deletedUsers = [];
        snap.forEach(doc => deletedUsers.push({ id: doc.id, ...doc.data() }));
        
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
            tbodyExcluidos.innerHTML += `
                <tr>
                    <td>${user.nome || 'N/A'}</td>
                    <td>${user.email || 'N/A'}</td>
                    <td>${plano}</td>
                    <td>${dateReg}</td>
                    <td>${dateExcl}</td>
                    <td>
                        <button class="btn-icon" onclick="recuperarRegistoExcluido('${user.id}')" title="Recuperar Conta">
                            <i data-lucide="refresh-cw" style="color: var(--success)"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        lucide.createIcons();
    });
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

async function terminarSessao(id) {
    showAdminConfirm('Terminar Sessão', 'Deseja forçar o término da sessão ativa deste utilizador? Ele poderá voltar a entrar depois.', async () => {
        try {
            await db.collection('users').doc(id).update({ forceLogout: Date.now() });
            showToast('Sessão terminada com sucesso.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao terminar sessão.', 'error');
        }
    });
}

async function suspenderConta(id) {
    showAdminConfirm('Suspender Conta', 'Deseja suspender temporariamente esta conta?', async () => {
        try {
            await db.collection('users').doc(id).update({ status: 'suspenso' });
            showToast('Conta suspensa com sucesso.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao suspender conta.', 'error');
        }
    });
}

async function restaurarConta(id) {
    showAdminConfirm('Reativar Conta', 'Deseja restaurar esta conta para o estado ativo?', async () => {
        try {
            await db.collection('users').doc(id).update({ status: 'ativo', disabled: firebase.firestore.FieldValue.delete() });
            showToast('Conta reativada com sucesso.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao reativar conta.', 'error');
        }
    });
}

async function encerrarConta(id) {
    showAdminConfirm('Encerrar Conta', 'Tem a certeza? A conta será movida para as contas excluídas e o acesso permanentemente bloqueado.', async () => {
        try {
            const userDoc = await db.collection('users').doc(id).get();
            if(userDoc.exists) {
                const data = userDoc.data();
                data.dataExclusao = firebase.firestore.FieldValue.serverTimestamp();
                data.motivoExclusao = 'Encerrado pelo Admin';
                data.disabled = true;
                data.status = 'excluido';
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

async function recuperarRegistoExcluido(id) {
    showAdminConfirm('Recuperar Conta Excluída', 'Deseja recuperar esta conta para os utilizadores ativos?', async () => {
        try {
            const doc = await db.collection('users_deleted').doc(id).get();
            if (doc.exists) {
                const data = doc.data();
                delete data.dataExclusao;
                delete data.motivoExclusao;
                delete data.disabled;
                data.status = 'ativo';
                await db.collection('users').doc(id).set(data);
                await db.collection('users_deleted').doc(id).delete();
                showToast('Conta recuperada com sucesso.');
            }
        } catch(err) {
            console.error(err);
            showToast('Erro ao recuperar conta.', 'error');
        }
    });
}

async function deleteUserPermanently(id) {
    showAdminConfirm('Excluir Definitivamente', 'Tem a certeza absoluta? Isto removerá a conta permanentemente e não pode ser desfeito.', async () => {
        try {
            await db.collection('users_deleted').doc(id).delete();
            showToast('Conta excluída definitivamente.');
        } catch(err) {
            console.error(err);
            showToast('Erro ao excluir conta definitivamente.', 'error');
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
