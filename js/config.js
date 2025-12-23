// Gerenciamento de Configurações Globais
// Aplicar configurações imediatamente antes do DOM carregar
const CONFIG_STORAGE_KEY = 'appConfig';
const DEFAULT_CONFIG = {
    userName: 'Usuário',
    primaryColor: '#db2777',
    themeMode: 'light' // 'light' | 'dark'
};

// Função para obter configurações rapidamente
const getConfigSync = () => {
    try {
        const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
};

// Aplicar cores imediatamente
const applyColorsSync = (color) => {
    const style = document.createElement('style');
    style.id = 'instant-colors';
    style.innerHTML = `
        .text-primary { color: ${color} !important; }
        .bg-primary { background-color: ${color} !important; }
        .border-primary { border-color: ${color} !important; }
        .hover\\:bg-pink-700:hover,
        .hover\\:bg-primary:hover { background-color: ${color} !important; }
    `;
    document.head.appendChild(style);
};

// Aplicar tema imediatamente (evitar flash ao carregar)
const applyThemeSync = (mode) => {
    const root = document.documentElement;
    // limpar estilo anterior
    const old = document.getElementById('dark-theme-overrides');
    if (old) old.remove();

    if (mode === 'dark') {
        root.classList.add('dark');
        const style = document.createElement('style');
        style.id = 'dark-theme-overrides';
        style.innerHTML = `
            /* Fundo e texto geral */
            .dark body { background-color: #0b1220 !important; color: #e5e7eb !important; }
            .dark .bg-white { background-color: #0f172a !important; }
            .dark .bg-gray-50 { background-color: #0b1220 !important; }
            .dark .text-dark, .dark .text-gray-800 { color: #e5e7eb !important; }
            .dark .text-gray-700 { color: #d1d5db !important; }
            .dark .text-gray-600 { color: #b4bcc8 !important; }
            .dark .border-gray-100, .dark .border-gray-200 { border-color: #1f2937 !important; }
            .dark .hover\\:bg-gray-50:hover { background-color: #111827 !important; }
            .dark .bg-secondary { background-color: rgba(219, 39, 119, 0.15) !important; }

            /* Inputs, selects e textareas */
            .dark input[type="text"],
            .dark input[type="number"],
            .dark input[type="date"],
            .dark input[type="email"],
            .dark input[type="password"],
            .dark select,
            .dark textarea {
                background-color: #1f2937 !important;
                border-color: #374151 !important;
                color: #e5e7eb !important;
            }
            
            .dark input::placeholder,
            .dark textarea::placeholder {
                color: #9ca3af !important;
                opacity: 1 !important;
            }

            /* Labels em formulários */
            .dark label { color: #d1d5db !important; }
            .dark .block { color: inherit !important; }

            /* Modais */
            .dark .fixed.inset-0 { background-color: rgba(0, 0, 0, 0.7) !important; }
            .dark .bg-white.rounded-xl { background-color: #0f172a !important; border-color: #1f2937 !important; }

            /* Texto em focus/hover */
            .dark input:focus,
            .dark select:focus,
            .dark textarea:focus {
                background-color: #1f2937 !important;
                border-color: #4b5563 !important;
            }

            /* Buttons e elementos secundários */
            .dark .text-gray-500 { color: #9ca3af !important; }
            .dark .text-gray-400 { color: #9ca3af !important; }
        `;
        document.head.appendChild(style);
    } else {
        root.classList.remove('dark');
    }
};

// Aplicar configurações instantaneamente
const config = getConfigSync();
applyColorsSync(config.primaryColor);
applyThemeSync(config.themeMode || 'light');

// Aguardar DOM carregar para o resto
document.addEventListener('DOMContentLoaded', () => {
    
    // --- FUNÇÕES DE ARMAZENAMENTO ---
    const getConfig = () => getConfigSync();

    const saveConfig = (config) => {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
        applyConfig(config);
    };

    // --- APLICAR CONFIGURAÇÕES ---
    const applyConfig = (config) => {
        // Atualizar nome do usuário
        const userNameElements = document.querySelectorAll('#user-name, .user-name');
        userNameElements.forEach(el => {
            if (el) {
                if (el.tagName === 'INPUT') {
                    el.value = config.userName;
                } else {
                    el.textContent = config.userName;
                }
            }
        });

        // Atualizar cor primária
        updateTailwindColors(config.primaryColor);
        
        // Atualizar input de cor se existir
        const colorInput = document.getElementById('app-color');
        if (colorInput) {
            colorInput.value = config.primaryColor;
        }
        
        // Atualizar configuração do Tailwind
        if (window.tailwind) {
            window.tailwind.config = {
                ...window.tailwind.config,
                theme: {
                    ...window.tailwind.config?.theme,
                    extend: {
                        ...window.tailwind.config?.theme?.extend,
                        colors: {
                            ...window.tailwind.config?.theme?.extend?.colors,
                            primary: config.primaryColor,
                            secondary: '#fce7f3',
                            dark: '#1e293b',
                        }
                    }
                }
            };
        }

        // Aplicar tema (claro/escuro)
        applyThemeSync(config.themeMode || 'light');

        // Atualizar UI do tema se existir
        const themeLight = document.getElementById('theme-light');
        const themeDark = document.getElementById('theme-dark');
        if (themeLight && themeDark) {
            const mode = (config.themeMode || 'light');
            themeLight.checked = mode === 'light';
            themeDark.checked = mode === 'dark';
        }
    };

    // --- ATUALIZAR CORES DO TAILWIND ---
    const updateTailwindColors = (color) => {
        // Remover estilo anterior se existir
        const oldStyle = document.getElementById('instant-colors');
        if (oldStyle) oldStyle.remove();
        
        // Aplicar novas cores
        applyColorsSync(color);
        
        // Atualizar propriedade CSS customizada
        document.documentElement.style.setProperty('--color-primary', color);
    };

    // --- CONFIGURAR MODAL ---
    const setupConfigModal = () => {
        const configModal = document.getElementById('config-modal');
        const openConfigBtn = document.getElementById('open-config-btn');
        const closeConfigBtn = document.getElementById('close-config-btn');
        const configForm = document.getElementById('config-form');

        if (!configModal || !openConfigBtn) return;

        // Abrir modal
        openConfigBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const config = getConfig();
            
            // Preencher formulário com valores atuais
            const userNameInput = document.getElementById('user-name-input');
            const appColorSelect = document.getElementById('app-color');
            const themeLight = document.getElementById('theme-light');
            const themeDark = document.getElementById('theme-dark');
            
            if (userNameInput) userNameInput.value = config.userName;
            if (appColorSelect) appColorSelect.value = config.primaryColor;
            if (themeLight && themeDark) {
                const mode = config.themeMode || 'light';
                themeLight.checked = mode === 'light';
                themeDark.checked = mode === 'dark';
            }
            
            configModal.classList.remove('hidden');
        });

        // Fechar modal
        if (closeConfigBtn) {
            closeConfigBtn.addEventListener('click', () => {
                configModal.classList.add('hidden');
            });
        }

        // Fechar ao clicar fora
        configModal.addEventListener('click', (e) => {
            if (e.target === configModal) {
                configModal.classList.add('hidden');
            }
        });

        // Cancelar
        const cancelBtn = document.getElementById('cancel-config-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                configModal.classList.add('hidden');
            });
        }

        // Salvar configurações
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const userNameInput = document.getElementById('user-name-input');
                const appColorSelect = document.getElementById('app-color');
                const themeLight = document.getElementById('theme-light');
                
                const newConfig = {
                    userName: userNameInput ? userNameInput.value.trim() || 'Usuário' : 'Usuário',
                    primaryColor: appColorSelect ? appColorSelect.value : '#db2777',
                    themeMode: themeLight && themeLight.checked ? 'light' : 'dark'
                };
                
                saveConfig(newConfig);
                configModal.classList.add('hidden');
            });
        }
    };

    // --- INICIALIZAÇÃO ---
    const init = () => {
        // Reaplicar configurações do localStorage (já aplicadas sincronamente)
        const savedConfig = getConfig();
        applyConfig(savedConfig);
        setupConfigModal();
    };

    // Inicializar quando DOM estiver pronto
    init();
});