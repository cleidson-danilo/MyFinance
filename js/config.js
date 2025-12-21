// Gerenciamento de Configurações Globais
// Aplicar configurações imediatamente antes do DOM carregar
const CONFIG_STORAGE_KEY = 'appConfig';
const DEFAULT_CONFIG = {
    userName: 'Usuário',
    primaryColor: '#db2777'
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

// Aplicar configurações instantaneamente
const config = getConfigSync();
applyColorsSync(config.primaryColor);

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
            
            if (userNameInput) userNameInput.value = config.userName;
            if (appColorSelect) appColorSelect.value = config.primaryColor;
            
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
                
                const newConfig = {
                    userName: userNameInput ? userNameInput.value.trim() || 'Usuário' : 'Usuário',
                    primaryColor: appColorSelect ? appColorSelect.value : '#db2777'
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