document.addEventListener('DOMContentLoaded', () => {
    // FAQ Global Event Delegation (Funciona com SPA sem re-bind)
    document.body.addEventListener('click', (e) => {
        const faqItem = e.target.closest('.faq-question');
        if (faqItem) {
            const answer = faqItem.nextElementSibling;
            const icon = faqItem.querySelector('i');
            if (answer.style.display === 'block') {
                answer.style.display = 'none';
                if(icon) icon.style.transform = 'rotate(0deg)';
            } else {
                document.querySelectorAll('.faq-answer').forEach(a => a.style.display = 'none');
                document.querySelectorAll('.faq-question i').forEach(i => i.style.transform = 'rotate(0deg)');
                answer.style.display = 'block';
                if(icon) {
                    icon.style.transform = 'rotate(180deg)';
                    icon.style.transition = 'transform 0.3s ease';
                }
            }
        }
    });

    // 1. Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // 2. Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const header = document.querySelector('.header');
    let isMenuOpen = false;

    // --- Global Auth State for Header ---
    const navCta = document.querySelector('.nav-cta');
    if (navCta) {
        // Skeleton loader enquanto Firebase resolve o estado de auth
        navCta.innerHTML = '<div style="display:flex;gap:10px;justify-content:center;align-items:center;width:100%;"><div style="width:120px;height:40px;border-radius:50px;background:#e2e8f0;animation:skeleton-pulse 1.5s infinite ease-in-out;"></div><div style="width:120px;height:40px;border-radius:50px;background:#e2e8f0;animation:skeleton-pulse 1.5s infinite ease-in-out;"></div></div>';

        auth.onAuthStateChanged((user) => {
            if (user) {
                // Utilizador com sessão → Fale Connosco + Perfil + Sair
                navCta.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; animation: fade-in 0.3s ease; flex-wrap: wrap;">
                        <a href="contactos.html" class="btn btn-outline" style="padding: 8px 16px; font-size: 0.85rem;" aria-label="Fale connosco">Fale Connosco</a>
                        <a href="area-cliente.html" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.85rem;" aria-label="Aceder ao meu perfil">
                            <i data-lucide="user" style="width: 15px; height: 15px;"></i> ${user.displayName ? user.displayName.split(' ')[0] : 'Perfil'}
                        </a>
                        <button id="nav-global-logout" class="btn btn-outline" style="padding: 8px 12px; font-size: 0.85rem; color: #ef4444; border-color: #fca5a5;" aria-label="Terminar sessão">Sair</button>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                document.getElementById('nav-global-logout').addEventListener('click', () => {
                    auth.signOut().then(() => { window.location.reload(); });
                });
            } else {
                // Sem sessão → Fale Connosco + Área de Cliente
                navCta.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px; justify-content: center; width: 100%; animation: fade-in 0.3s ease;">
                        <a href="contactos.html" class="btn btn-outline" style="padding: 8px 16px; font-size: 0.9rem;" aria-label="Fale connosco">Fale Connosco</a>
                        <a href="area-cliente.html" class="btn btn-primary" style="padding: 8px 18px; font-size: 0.9rem;" aria-label="Aceder à área de cliente">Área de Cliente</a>
                    </div>
                `;
            }
        });
    }
    // ------------------------------------

    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            
            if (isMenuOpen) {
                // Open Menu
                navLinks.classList.add('nav-mobile-active');
                if(navCta) navLinks.appendChild(navCta.cloneNode(true)); // Move CTA to menu
                
                // Change icon to close (X)
                mobileMenuBtn.innerHTML = '<i data-lucide="x"></i>';
                lucide.createIcons();
                
                // Prevent body scroll
                document.body.style.overflow = 'hidden';
            } else {
                // Close Menu
                navLinks.classList.remove('nav-mobile-active');
                
                // Remove cloned CTA if exists
                const clonedCta = navLinks.querySelector('.nav-cta');
                if(clonedCta) clonedCta.remove();
                
                // Change icon back to menu
                mobileMenuBtn.innerHTML = '<i data-lucide="menu"></i>';
                lucide.createIcons();
                
                // Restore body scroll
                document.body.style.overflow = '';
            }
        });

        // Close menu when clicking a link
        const links = navLinks.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', () => {
                if (isMenuOpen) {
                    mobileMenuBtn.click();
                }
            });
        });
    }

    // 3. Scroll Reveal Animation (Intersection Observer)
    window.initReveal = function() {
        const revealElements = document.querySelectorAll('.reveal');
        
        const revealCallback = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        };

        const revealOptions = {
            threshold: 0.15, // 15% visible before triggering
            rootMargin: "0px 0px -50px 0px"
        };

        const revealObserver = new IntersectionObserver(revealCallback, revealOptions);
        
        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    };
    
    // Call it immediately on first load
    window.initReveal();

    // 4. Header Hide/Show on Scroll (Optimized with requestAnimationFrame)
    let lastScroll = 0;
    let ticking = false;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (currentScroll <= 0) {
                    header.classList.remove('scroll-up');
                } else if (currentScroll > lastScroll && !header.classList.contains('scroll-down')) {
                    // Scroll Down
                    if(!isMenuOpen) {
                        header.classList.remove('scroll-up');
                        header.classList.add('scroll-down');
                    }
                } else if (currentScroll < lastScroll && header.classList.contains('scroll-down')) {
                    // Scroll Up
                    header.classList.remove('scroll-down');
                    header.classList.add('scroll-up');
                }
                
                lastScroll = currentScroll;
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true }); // passive listener for smoother scrolling
});
