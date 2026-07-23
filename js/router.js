// Router PJAX - Transições Fluídas (SPA)
// Criado por Antigravity

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar router
    initRouter();
    
    // Atualiza links ativos iniciais
    updateActiveLinks(window.location.pathname);
});

function initRouter() {
    document.body.addEventListener('click', (e) => {
        // Encontra a tag A mais próxima do clique
        const link = e.target.closest('a');
        
        if (!link) return;
        
        const url = link.getAttribute('href');
        
        // Ignora se não houver href, ou se for link externo, ou ancora (#)
        if (!url || url.startsWith('http') || url.startsWith('mailto') || url.startsWith('tel') || url.startsWith('#')) return;
        
        // Ignora a Área de Cliente e o Admin (segurança e Firebase integrity)
        if (url.includes('area-cliente') || url.includes('admin')) return;

        // Se for um link interno público, interceta a navegação
        e.preventDefault();
        navigateTo(url);
    });
    let currentPath = window.location.pathname;

    // Lida com o botão "Voltar" do browser
    window.addEventListener('popstate', (e) => {
        // Ignora se for apenas uma mudança de âncora (#hash)
        if (window.location.pathname === currentPath) return;
        currentPath = window.location.pathname;

        if (e.state && e.state.url) {
            navigateTo(e.state.url, false);
        } else {
            navigateTo(window.location.pathname, false);
        }
    });
    
    // Guarda o estado inicial
    history.replaceState({ url: window.location.pathname }, '', window.location.pathname);
}

async function navigateTo(url, push = true) {
    const contentDiv = document.getElementById('app-content');
    if (!contentDiv) return window.location.href = url; // Fallback se algo falhar

    // 1. Iniciar animação de saída (fade out)
    contentDiv.classList.add('page-fade-out');

    try {
        // 2. Fazer o download da página seguinte em background
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao carregar página');
        
        // Forçar descodificação em UTF-8 para evitar problemas de charset via AJAX
        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('utf-8');
        const htmlString = decoder.decode(buffer);
        
        // 3. Converter HTML de texto para DOM
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        const newContent = doc.getElementById('app-content');
        
        if (!newContent) throw new Error('Estrutura <main id="app-content"> não encontrada');

        // Aguarda a animação de saída terminar (0.3s definido no CSS)
        setTimeout(() => {
            // 4. Substituir conteúdo
            contentDiv.innerHTML = newContent.innerHTML;
            
            // 4.5 Executar scripts inline injetados
            const scripts = contentDiv.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.appendChild(document.createTextNode(oldScript.innerHTML));
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            
            // 5. Atualizar Título da página
            if (doc.title) document.title = doc.title;
            
            // 6. Remover classe de saída para iniciar animação de entrada
            contentDiv.classList.remove('page-fade-out');
            
            // 7. Atualizar URL na barra de navegação (se não for "Voltar")
            if (push) {
                history.pushState({ url }, '', url);
                currentPath = window.location.pathname;
            }
            
            // 8. Re-inicializar componentes dinâmicos da nova página
            reinitScripts(url);
            updateActiveLinks(url);
            
            // 9. Resetar scroll e estado do menu mobile
            document.body.style.overflow = '';
            const navLinks = document.querySelector('.nav-links');
            const hamburger = document.querySelector('.hamburger');
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                if (hamburger) hamburger.classList.remove('active');
            }
            
            // Scroll para o topo suave
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        }, 300); // 300ms = 0.3s de transição

    } catch (error) {
        console.error('Erro na transição fluída:', error);
        // Fallback: carregar página normalmente se houver erro
        window.location.href = url;
    }
}

function reinitScripts(url) {
    // Recarregar os ícones (Lucide)
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Re-iniciar animações de scroll
    if (typeof window.initReveal === 'function') {
        window.initReveal();
    }
    
    // Se precisarmos de reiniciar listeners que estavam dentro do escopo anterior
    setTimeout(() => {
        // Este tempo extra garante que os scripts inline inseridos e o DOM estão 100% prontos.
    }, 50);
}

function updateActiveLinks(url) {
    const links = document.querySelectorAll('.nav-links a');
    links.forEach(link => {
        // Obter apenas o nome do ficheiro, ignorando a barra inicial
        const linkHref = link.getAttribute('href');
        const currentPath = url.split('/').pop() || 'index.html';
        
        if (linkHref === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
