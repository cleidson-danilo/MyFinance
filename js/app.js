document.addEventListener('DOMContentLoaded', () => {
    // --- GERENCIAMENTO DE ESTADO ---
    const LOCAL_STORAGE_KEY = 'myFinanceState';

    const getInitialState = () => {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        const defaultState = {
            transactions: [],
            cards: [],
            goals: [] // Mudança de 'budgets' para 'goals' (metas)
        };
        
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                return {
                    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
                    cards: Array.isArray(parsed.cards) ? parsed.cards : [],
                    goals: Array.isArray(parsed.goals) ? parsed.goals : Array.isArray(parsed.budgets) ? parsed.budgets : [] // Compatibilidade com dados antigos
                };
            } catch {
                return defaultState;
            }
        }
        return defaultState;
    };

    let state = getInitialState();

    const saveState = () => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    };

    // --- FUNÇÕES UTILITÁRIAS ---
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Função para verificar se uma transação é do mês/ano especificado
    const isTransactionInMonth = (transaction, month, year) => {
        const transactionDate = new Date(transaction.date + 'T00:00:00');
        return transactionDate.getMonth() === month && transactionDate.getFullYear() === year;
    };

    // Função para obter transações do mês atual
    const getCurrentMonthTransactions = () => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return state.transactions.filter(t => isTransactionInMonth(t, currentMonth, currentYear));
    };

    // Função para obter transações filtradas por mês/ano (para página de transações)
    const getFilteredTransactions = (month, year) => {
        if (month === 'all') {
            return state.transactions;
        }
        return state.transactions.filter(t => isTransactionInMonth(t, month, year));
    };

    // Função para obter transações baseado nos filtros da página de transações
    const getTransactionsForFilter = () => {
        const monthFilter = document.getElementById('filter-month');
        const yearFilter = document.getElementById('filter-year');
        const searchInput = document.getElementById('search-input');
        const filterType = document.getElementById('filter-type');
        const filterCategory = document.getElementById('filter-category');
        
        let filtered = state.transactions;
        
        // Filtro de mês e ano
        if (monthFilter && yearFilter) {
            const selectedMonth = monthFilter.value;
            const selectedYear = yearFilter.value;
            
            // Se o mês não for "all", filtrar pelo mês e ano selecionados
            if (selectedMonth !== 'all') {
                filtered = filtered.filter(t => {
                    const date = new Date(t.date + 'T00:00:00');
                    return date.getMonth() === parseInt(selectedMonth) && 
                           date.getFullYear() === parseInt(selectedYear);
                });
            } else if (selectedYear !== 'all') {
                // Se mês for "all" mas ano não, filtrar só pelo ano
                filtered = filtered.filter(t => {
                    const date = new Date(t.date + 'T00:00:00');
                    return date.getFullYear() === parseInt(selectedYear);
                });
            }
        }
        
        // Filtro de busca por nome
        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.trim().toLowerCase();
            filtered = filtered.filter(t => t.name.toLowerCase().includes(searchTerm));
        }
        
        // Filtro de tipo (entrada/saída)
        if (filterType && filterType.value !== 'all') {
            filtered = filtered.filter(t => t.type === filterType.value);
        }
        
        // Filtro de categoria
        if (filterCategory && filterCategory.value !== 'all') {
            filtered = filtered.filter(t => t.category === filterCategory.value);
        }
        
        return filtered;
    };

    // Gerar lista de meses disponíveis baseado nas transações existentes
    const getAvailableMonths = () => {
        const months = new Set();
        const now = new Date();
        
        // Sempre incluir o mês atual
        months.add(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
        
        // Adicionar meses das transações existentes
        state.transactions.forEach(t => {
            const date = new Date(t.date + 'T00:00:00');
            months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        });
        
        // Converter para array e ordenar (mais recente primeiro)
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    };

    // Formatar mês para exibição
    const formatMonthLabel = (monthStr) => {
        const [year, month] = monthStr.split('-');
        const date = new Date(year, month - 1);
        const monthName = date.toLocaleString('pt-BR', { month: 'long' });
        return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    };

    // --- MODAL DE CONFIRMAÇÃO ---
    const showConfirmModal = (title, message, onConfirm, onCancel) => {
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.className = 'fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 animate-bounce-in">
                <div class="text-center">
                    <div class="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <i class="fa-solid fa-exclamation-triangle text-3xl text-red-600"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-dark mb-2">${title}</h3>
                    <p class="text-gray-600 mb-8">${message}</p>
                </div>
                <div class="flex gap-3 justify-center">
                    <button id="confirm-cancel" class="px-6 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                    <button id="confirm-action" class="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors">
                        Excluir
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        const confirmBtn = document.getElementById('confirm-action');
        const cancelBtn = document.getElementById('confirm-cancel');

        confirmBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            if (onCancel) onCancel();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                if (onCancel) onCancel();
            }
        });
    };

    // --- NAVEGAÇÃO ---
    const setActiveNav = () => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const navLinks = document.querySelectorAll('nav a');
        
        navLinks.forEach(link => {
            const linkPage = link.getAttribute('href');
            const isActive = linkPage === currentPage;
            
            if (isActive) {
                link.classList.add('bg-secondary', 'text-primary', 'font-semibold');
                link.classList.remove('text-gray-600');
            } else {
                link.classList.remove('bg-secondary', 'text-primary', 'font-semibold');
                link.classList.add('text-gray-600');
            }
        });
    };

    // --- MENU MOBILE ---
    const closeMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.add('hidden', '-translate-x-full');
        sidebar.classList.remove('mobile-open', 'flex', 'fixed', 'top-0', 'left-0', 'h-full', 'z-40', 'shadow-2xl');
    };

    const openMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        sidebar.classList.remove('hidden', '-translate-x-full');
        sidebar.classList.add('flex', 'mobile-open', 'fixed', 'top-0', 'left-0', 'h-full', 'z-40', 'shadow-2xl');
    };

    const toggleMobileMenu = () => {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        if (sidebar.classList.contains('mobile-open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    };

    // --- FUNÇÕES DO DASHBOARD ---
    const renderSummary = () => {
        // Usar apenas transações do mês atual para o Dashboard
        const currentMonthTransactions = getCurrentMonthTransactions();
        
        const totalIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const totalOutcomeTransactions = currentMonthTransactions
            .filter(t => t.type === 'outcome')
            .reduce((acc, t) => acc + t.amount, 0);
            
        const totalCardUsed = state.cards
            .reduce((acc, card) => acc + (card.used || 0), 0);
            
        const totalOutcome = totalOutcomeTransactions + totalCardUsed;
        const balance = totalIncome - totalOutcome;
        const outcomePercentage = totalIncome > 0 ? (totalOutcome / totalIncome) * 100 : 0;

        // Atualiza elementos do DOM
        const elements = {
            'total-income': formatCurrency(totalIncome),
            'total-outcome': formatCurrency(totalOutcome),
            'balance': formatCurrency(balance),
            'outcome-percentage': `${Math.round(outcomePercentage)}% da renda comprometida`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Barra de progresso
        const progressBar = document.getElementById('outcome-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${Math.min(outcomePercentage, 100)}%`;
        }

        // Mês atual
        const monthElement = document.getElementById('current-month');
        if (monthElement) {
            const date = new Date();
            const monthName = date.toLocaleString('pt-BR', { month: 'long' });
            const year = date.getFullYear();
            monthElement.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        }
    };

    // --- FUNÇÕES DE TRANSAÇÕES ---
    // Variável para armazenar o filtro de mês selecionado na página de transações
    let selectedMonthFilter = 'current';

    const renderTransactions = () => {
        // Verificar se estamos no Dashboard ou na página de Transações
        const isDashboard = document.getElementById('transaction-list') !== null;
        const isTransactionsPage = document.getElementById('full-transaction-list') !== null;
        
        const transactionList = document.getElementById('transaction-list') || 
                               document.getElementById('full-transaction-list');
        const transactionListMobile = document.getElementById('transaction-list-mobile') ||
                                     document.getElementById('full-transaction-list-mobile');
        
        if (!transactionList && !transactionListMobile) return;

        // Limpar ambas as listas
        if (transactionList) transactionList.innerHTML = '';
        if (transactionListMobile) transactionListMobile.innerHTML = '';

        // Determinar quais transações mostrar
        let transactionsToShow;
        if (isDashboard) {
            // No Dashboard: mostrar apenas transações do mês atual
            transactionsToShow = getCurrentMonthTransactions();
        } else if (isTransactionsPage) {
            // Na página de Transações: usar o filtro selecionado
            transactionsToShow = getTransactionsForFilter();
        } else {
            transactionsToShow = state.transactions;
        }

        if (transactionsToShow.length === 0) {
            const message = isDashboard 
                ? 'Nenhuma transação neste mês. Comece adicionando uma!'
                : 'Nenhuma transação encontrada para o período selecionado.';
            
            if (transactionList) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="6" class="text-center py-10 text-gray-500">
                        ${message}
                    </td>
                `;
                transactionList.appendChild(row);
            }
            if (transactionListMobile) {
                transactionListMobile.innerHTML = `
                    <div class="text-center py-10 text-gray-500">
                        ${message}
                    </div>
                `;
            }
            return;
        }

        const categoryColors = {
            'Alimentação': 'bg-green-100 text-green-700',
            'Transporte': 'bg-blue-100 text-blue-700',
            'Saúde': 'bg-red-100 text-red-700',
            'Lazer': 'bg-purple-100 text-purple-700',
            'Moradia': 'bg-indigo-100 text-indigo-700',
            'Educação': 'bg-yellow-100 text-yellow-700',
            'Cartão de Crédito': 'bg-pink-100 text-pink-700',
            'Salário': 'bg-teal-100 text-teal-700',
            'Investimento': 'bg-orange-100 text-orange-700',
            'Beleza': 'bg-fuchsia-100 text-fuchsia-700',
            'Outros': 'bg-gray-100 text-gray-700'
        };

        const statusInfo = {
            'paid': { text: 'Pago', icon: 'fa-solid fa-check-circle', color: 'text-green-600' },
            'received': { text: 'Recebido', icon: 'fa-solid fa-check-circle', color: 'text-green-600' },
            'pending': { text: 'Pendente', icon: 'fa-regular fa-circle', color: 'text-gray-400' }
        };

        transactionsToShow
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .forEach(transaction => {
                const status = statusInfo[transaction.status] || statusInfo.pending;
                const categoryColor = categoryColors[transaction.category] || categoryColors['Outros'];
                
                // Renderizar para Desktop (tabela)
                if (transactionList) {
                    const row = document.createElement('tr');
                    row.className = 'border-b border-gray-50 hover:bg-gray-50 transition-colors';
                    
                    row.innerHTML = `
                        <td class="py-4 font-medium text-dark">${transaction.name}</td>
                        <td class="py-4">
                            <span class="px-2 py-1 rounded-full text-xs ${categoryColor}">
                                ${transaction.category}
                            </span>
                        </td>
                        <td class="py-4 text-gray-500">${formatDate(transaction.date)}</td>
                        <td class="py-4 ${status.color}">
                            <i class="${status.icon} mr-2"></i>${status.text}
                        </td>
                        <td class="py-4 text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-500'}">
                            ${transaction.type === 'outcome' ? '-' : '+'} ${formatCurrency(transaction.amount)}
                        </td>
                        <td class="py-4 text-right">
                            <button class="edit-transaction-btn text-blue-600 mr-2" data-id="${transaction.id}">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="delete-transaction-btn text-red-600" data-id="${transaction.id}">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    `;
                    transactionList.appendChild(row);
                }

                // Renderizar para Mobile (cards)
                if (transactionListMobile) {
                    const card = document.createElement('div');
                    card.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm';
                    
                    card.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <h4 class="font-semibold text-dark text-sm">${transaction.name}</h4>
                                <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${categoryColor}">
                                    ${transaction.category}
                                </span>
                            </div>
                            <span class="text-base font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-500'}">
                                ${transaction.type === 'outcome' ? '-' : '+'} ${formatCurrency(transaction.amount)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                            <div class="flex items-center gap-3 text-gray-500" style="font-size: 0.7rem;">
                                <span><i class="fa-regular fa-calendar mr-1"></i>${formatDate(transaction.date)}</span>
                                <span class="${status.color}"><i class="${status.icon} mr-1"></i>${status.text}</span>
                            </div>
                            <div class="flex gap-2">
                                <button class="edit-transaction-btn text-blue-600 p-1" data-id="${transaction.id}">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button class="delete-transaction-btn text-red-600 p-1" data-id="${transaction.id}">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                    transactionListMobile.appendChild(card);
                }
            });

        // Event listeners para edit e delete (ambas as versões)
        document.querySelectorAll('.edit-transaction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                openEditTransactionModal(id);
            });
        });

        document.querySelectorAll('.delete-transaction-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                const transaction = state.transactions.find(t => t.id === id);
                showConfirmModal(
                    'Excluir Transação?',
                    `Tem certeza que deseja excluir <strong>${transaction?.name || 'desconhecido'}</strong> de ${formatCurrency(transaction?.amount || 0)}? Esta ação não pode ser desfeita.`,
                    () => {
                        state.transactions = state.transactions.filter(t => t.id !== id);
                        renderAll();
                    }
                );
            });
        });
    };

    // --- FUNÇÕES DE GRÁFICOS ---
    const renderCategoryChart = () => {
        const chartCanvas = document.getElementById('category-chart');
        if (!chartCanvas) return;

        // Destruir gráfico existente se houver
        if (window.categoryChart) {
            window.categoryChart.destroy();
        }

        // Usar apenas transações do mês atual para o gráfico do Dashboard
        const currentMonthTransactions = getCurrentMonthTransactions();

        // Calcular gastos por categoria (apenas do mês atual)
        const categoryExpenses = {};
        currentMonthTransactions
            .filter(t => t.type === 'outcome')
            .forEach(transaction => {
                if (!categoryExpenses[transaction.category]) {
                    categoryExpenses[transaction.category] = 0;
                }
                categoryExpenses[transaction.category] += transaction.amount;
            });

        // Incluir gastos dos cartões
        state.cards.forEach(card => {
            if (card.used > 0) {
                if (!categoryExpenses['Cartão de Crédito']) {
                    categoryExpenses['Cartão de Crédito'] = 0;
                }
                categoryExpenses['Cartão de Crédito'] += card.used;
            }
        });

        const labels = Object.keys(categoryExpenses);
        const data = Object.values(categoryExpenses);
        const total = data.reduce((acc, value) => acc + value, 0);

        if (total === 0) {
            chartCanvas.style.display = 'none';
            const noDataMsg = chartCanvas.parentNode.querySelector('.no-data-message');
            if (!noDataMsg) {
                const message = document.createElement('div');
                message.className = 'no-data-message text-center text-gray-400 py-10';
                message.textContent = 'Nenhum gasto registrado ainda';
                chartCanvas.parentNode.appendChild(message);
            }
            return;
        }

        chartCanvas.style.display = 'block';
        const noDataMsg = chartCanvas.parentNode.querySelector('.no-data-message');
        if (noDataMsg) noDataMsg.remove();

        const colors = [
            '#db2777', '#f97316', '#eab308', '#22c55e', '#3b82f6',
            '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f59e0b'
        ];

        const ctx = chartCanvas.getContext('2d');
        window.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0,
                    cutout: '60%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    };

    // --- FUNÇÕES DE CARTÕES ---
    const renderCards = () => {
        const cardList = document.getElementById('card-list');
        const dashboardCardList = document.getElementById('dashboard-card-list');
        
        // Renderizar na página de cartões
        if (cardList) {
            cardList.innerHTML = '';

            if (state.cards.length === 0) {
                cardList.innerHTML = `
                    <div class="col-span-3 text-center text-gray-400 py-10">
                        Nenhum cartão cadastrado ainda.
                    </div>
                `;
                return;
            }
        }
        
        // Renderizar no dashboard
        if (dashboardCardList) {
            dashboardCardList.innerHTML = '';

            if (state.cards.length === 0) {
                dashboardCardList.innerHTML = `
                    <div class="col-span-3 text-center text-gray-400 py-10">
                        <i class="fa-solid fa-credit-card text-4xl mb-4"></i>
                        <p>Nenhum cartão cadastrado ainda.</p>
                        <a href="paginas/cartoes.html" class="text-primary hover:underline">Adicionar primeiro cartão</a>
                    </div>
                `;
            } else {
                // Mostrar apenas os 3 primeiros cartões no dashboard
                state.cards.slice(0, 3).forEach(card => {
                    const cardElement = createCardElement(card);
                    dashboardCardList.appendChild(cardElement);
                });
            }
        }
        
        // Renderizar todos os cartões na página específica
        if (cardList && state.cards.length > 0) {
            state.cards.forEach(card => {
                const cardElement = createCardElement(card);
                cardList.appendChild(cardElement);
            });
        }
    };
    
    const createCardElement = (card) => {
        const used = card.used || 0;
        const limit = card.limit || 0;
        const available = limit - used;
        const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
        const closing = card.closingDay ?? '-';
        const due = card.dueDay ?? '-';
        
        const cardElement = document.createElement('div');
        cardElement.className = 'bg-gradient-to-br from-pink-100 via-white to-blue-100 p-4 sm:p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-col gap-2 relative transition-transform hover:scale-105';
        
        cardElement.innerHTML = `
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                <span class="inline-block bg-primary text-white px-3 py-1 rounded-full text-xs font-bold w-fit">
                    <i class="fa-solid fa-credit-card mr-1"></i>
                    ${card.brand.charAt(0).toUpperCase() + card.brand.slice(1)}
                </span>
                <span class="text-base sm:text-lg font-bold text-primary">${formatCurrency(card.limit)}</span>
            </div>
            <h3 class="font-bold text-lg sm:text-xl text-dark mb-1 break-words">${card.name}</h3>
            <div class="flex flex-col sm:flex-row gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                <span class="flex items-center">
                    <i class="fa-regular fa-calendar-days mr-1"></i> 
                    Fechamento: <span class="font-semibold">${closing}</span>
                </span>
                <span class="flex items-center">
                    <i class="fa-regular fa-calendar-check mr-1"></i> 
                    Vencimento: <span class="font-semibold">${due}</span>
                </span>
            </div>
            <div class="flex flex-col gap-1 mb-2">
                <span class="text-xs sm:text-sm text-gray-700">
                    <i class="fa-solid fa-coins mr-1"></i> 
                    Usado: <span class="font-semibold ${used > card.limit * 0.8 ? 'text-red-600' : 'text-red-500'}">${formatCurrency(used)}</span>
                </span>
                <span class="text-xs sm:text-sm text-gray-700">
                    <i class="fa-solid fa-wallet mr-1"></i> 
                    Disponível: <span class="font-semibold text-green-600">${formatCurrency(available)}</span>
                </span>
                <div class="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div class="${percent > 80 ? 'bg-red-500' : 'bg-primary'} h-2 rounded-full transition-all duration-500" style="width: ${percent}%"></div>
                </div>
                <p class="text-right text-xs ${percent > 80 ? 'text-red-500' : 'text-gray-400'} mt-1">${percent}% usado</p>
                ${percent > 80 ? '<p class="text-xs text-red-500 mt-1"><i class="fa-solid fa-exclamation-triangle"></i> Limite alto!</p>' : ''}
            </div>
            <div class="flex justify-end gap-2 mt-2">
                <button class="edit-card-btn bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1 rounded-lg shadow-sm text-xs sm:text-sm font-medium flex items-center gap-1" data-id="${card.id}">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button class="delete-card-btn bg-red-500 hover:bg-red-600 text-white px-2 sm:px-3 py-1 rounded-lg shadow-sm text-xs sm:text-sm font-medium flex items-center gap-1" data-id="${card.id}">
                    <i class="fa-solid fa-trash"></i> Excluir
                </button>
            </div>
        `;
        
        return cardElement;
    };
    
    const addCardEventListeners = () => {
        // Event listeners para edit e delete na página de cartões
        const cardList = document.getElementById('card-list');
        if (cardList) {
            cardList.querySelectorAll('.edit-card-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-id'));
                    openEditCardModal(id);
                });
            });

            cardList.querySelectorAll('.delete-card-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-id'));
                    const card = state.cards.find(c => c.id === id);
                    showConfirmModal(
                        'Excluir Cartão?',
                        `Tem certeza que deseja excluir o cartão <strong>${card?.name || 'desconhecido'}</strong>? Esta ação não pode ser desfeita.`,
                        () => {
                            state.cards = state.cards.filter(c => c.id !== id);
                            renderAll();
                        }
                    );
                });
            });
        }
        
        // Event listeners para dashboard
        const dashboardCardList = document.getElementById('dashboard-card-list');
        if (dashboardCardList) {
            dashboardCardList.querySelectorAll('.edit-card-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-id'));
                    openEditCardModal(id);
                });
            });

            dashboardCardList.querySelectorAll('.delete-card-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-id'));
                    const card = state.cards.find(c => c.id === id);
                    showConfirmModal(
                        'Excluir Cartão?',
                        `Tem certeza que deseja excluir o cartão <strong>${card?.name || 'desconhecido'}</strong>? Esta ação não pode ser desfeita.`,
                        () => {
                            state.cards = state.cards.filter(c => c.id !== id);
                            renderAll();
                        }
                    );
                });
            });
        }
    };

    // --- FUNÇÕES DE METAS ---
    const renderGoals = () => {
        const goalList = document.getElementById('budget-list'); // Mantendo o ID por compatibilidade
        if (!goalList) return;

        goalList.innerHTML = '';

        if (state.goals.length === 0) {
            goalList.innerHTML = `
                <div class="col-span-3 text-center text-gray-400 py-10">
                    <i class="fa-solid fa-bullseye text-4xl mb-4"></i>
                    <p>Nenhuma meta criada ainda.</p>
                    <p class="text-sm">Crie metas para controlar gastos, economizar ou quitar dívidas!</p>
                </div>
            `;
            return;
        }

        state.goals.forEach(goal => {
            const progress = calculateGoalProgress(goal);
            const { current, target, percent, status, message, icon, colorClass, showAddButton } = progress;

            const goalElement = document.createElement('div');
            goalElement.className = 'bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col';
            
            goalElement.innerHTML = `
                <div class="flex justify-between items-start mb-3">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <i class="${icon} ${colorClass}"></i>
                            <h3 class="font-bold text-lg text-dark">${goal.name}</h3>
                        </div>
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            ${goal.type === 'expense_limit' ? 'Limite de Gasto' : goal.type === 'savings' ? 'Economia' : goal.type === 'investment' ? 'Investimento' : 'Pagamento'}
                        </span>
                        <div class="text-xs text-gray-500 mt-1">
                            ${goal.category}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-medium text-gray-500">Meta: ${formatCurrency(target)}</div>
                        <div class="text-sm font-semibold ${colorClass}">
                            ${formatCurrency(current)}
                        </div>
                    </div>
                </div>
                
                <div class="flex-grow">
                    <div class="flex justify-between text-sm mb-2">
                        <span class="font-medium text-gray-700">${status}</span>
                        <span class="font-semibold ${percent >= 100 ? 'text-green-600' : 'text-gray-600'}">
                            ${Math.round(percent)}%
                        </span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div class="h-3 rounded-full transition-all duration-500 ${percent >= 100 ? 'bg-green-500' : percent > 80 ? 'bg-yellow-500' : 'bg-primary'}" 
                             style="width: ${Math.min(percent, 100)}%"></div>
                    </div>
                    <p class="text-sm ${percent >= 100 ? 'text-green-600 font-semibold' : 'text-gray-600'}">
                        ${message}
                    </p>
                </div>
                
                <div class="flex flex-wrap justify-end gap-2 mt-4">
                    ${showAddButton ? `
                        <button class="add-value-btn bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg shadow-sm text-sm font-medium flex items-center gap-1" data-id="${goal.id}">
                            <i class="fa-solid fa-plus"></i> Adicionar Valor
                        </button>
                    ` : ''}
                    <button class="edit-goal-btn bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg shadow-sm text-sm font-medium flex items-center gap-1" data-id="${goal.id}">
                        <i class="fa-solid fa-pen"></i> Editar
                    </button>
                    <button class="delete-goal-btn bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg shadow-sm text-sm font-medium flex items-center gap-1" data-id="${goal.id}">
                        <i class="fa-solid fa-trash"></i> Excluir
                    </button>
                </div>
            `;

            goalList.appendChild(goalElement);
        });

        // Event listeners
        goalList.querySelectorAll('.edit-goal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                openEditGoalModal(id);
            });
        });

        goalList.querySelectorAll('.add-value-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                openAddValueModal(id);
            });
        });

        goalList.querySelectorAll('.delete-goal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = Number(btn.getAttribute('data-id'));
                const goal = state.goals.find(g => g.id === id);
                showConfirmModal(
                    'Excluir Meta?',
                    `Tem certeza que deseja excluir a meta <strong>${goal?.name || 'desconhecida'}</strong>? Esta ação não pode ser desfeita.`,
                    () => {
                        state.goals = state.goals.filter(g => g.id !== id);
                        renderAll();
                    }
                );
            });
        });
    };

    // Função para calcular o progresso das metas
    const calculateGoalProgress = (goal) => {
        let current = 0;
        let target = goal.amount;
        let percent = 0;
        let status = '';
        let message = '';
        let icon = 'fa-solid fa-target';
        let colorClass = 'text-blue-600';
        let showAddButton = false; // Mostrar botão de adicionar valor

        // Se não tiver tipo definido, assume economia
        const goalType = goal.type || 'savings';

        // Calcular progresso baseado no tipo da meta
        switch (goalType) {
            case 'expense_limit': {
                // Limite de gastos - quanto foi gasto na categoria (calculado das transações)
                current = getCurrentMonthTransactions()
                    .filter(t => t.category === goal.category && t.type === 'outcome')
                    .reduce((acc, t) => acc + t.amount, 0);
                
                // Incluir gastos dos cartões se categoria for "Cartão de Crédito"
                if (goal.category === 'Cartão de Crédito') {
                    current += state.cards.reduce((acc, card) => acc + (card.used || 0), 0);
                }
                
                percent = target > 0 ? (current / target) * 100 : 0;
                
                if (percent >= 100) {
                    status = 'Limite ultrapassado!';
                    message = `Você gastou ${formatCurrency(current - target)} a mais que o planejado`;
                    icon = 'fa-solid fa-exclamation-triangle';
                    colorClass = 'text-red-600';
                } else {
                    status = 'Dentro do limite';
                    message = `Ainda pode gastar ${formatCurrency(target - current)}`;
                    icon = 'fa-solid fa-shield-check';
                    colorClass = 'text-green-600';
                }
                // Não mostra botão de adicionar para limite de gasto
                showAddButton = false;
                break;
            }
            
            case 'savings': {
                // Meta de economia - usa o valor guardado manualmente
                current = goal.saved || 0;
                showAddButton = true;
                
                percent = target > 0 ? (current / target) * 100 : 0;
                
                if (percent >= 100) {
                    status = 'Meta atingida! 🎉';
                    message = `Parabéns! Você economizou ${formatCurrency(current)}`;
                    icon = 'fa-solid fa-trophy';
                    colorClass = 'text-green-600';
                } else {
                    status = 'Economizando...';
                    message = `Faltam ${formatCurrency(target - current)} para atingir a meta`;
                    icon = 'fa-solid fa-piggy-bank';
                    colorClass = 'text-blue-600';
                }
                break;
            }
            
            case 'investment': {
                // Meta de investimento - usa o valor guardado manualmente
                current = goal.saved || 0;
                showAddButton = true;
                
                percent = target > 0 ? (current / target) * 100 : 0;
                
                if (percent >= 100) {
                    status = 'Meta de investimento atingida! 🚀';
                    message = `Você já guardou ${formatCurrency(current)} para ${goal.name}`;
                    icon = 'fa-solid fa-chart-line';
                    colorClass = 'text-green-600';
                } else {
                    status = 'Guardando...';
                    message = `Faltam ${formatCurrency(target - current)} para completar`;
                    icon = 'fa-solid fa-chart-line';
                    colorClass = 'text-blue-600';
                }
                break;
            }
            
            case 'debt_payment': {
                // Pagamento de dívida - usa o valor pago manualmente
                current = goal.saved || 0;
                showAddButton = true;
                
                percent = target > 0 ? (current / target) * 100 : 0;
                
                if (percent >= 100) {
                    status = 'Dívida quitada! 🎊';
                    message = `Parabéns! Você pagou toda a dívida`;
                    icon = 'fa-solid fa-check-circle';
                    colorClass = 'text-green-600';
                } else {
                    status = 'Pagando dívida...';
                    message = `Faltam ${formatCurrency(target - current)} para quitar`;
                    icon = 'fa-solid fa-credit-card';
                    colorClass = 'text-orange-600';
                }
                break;
            }
            
            default: {
                // Para qualquer outro tipo não reconhecido, permitir adicionar valor manualmente
                current = goal.saved || 0;
                showAddButton = true;
                
                percent = target > 0 ? (current / target) * 100 : 0;
                
                if (percent >= 100) {
                    status = 'Meta atingida! 🎉';
                    message = `Parabéns! Você completou a meta`;
                    icon = 'fa-solid fa-trophy';
                    colorClass = 'text-green-600';
                } else {
                    status = 'Em progresso...';
                    message = `Faltam ${formatCurrency(target - current)} para completar`;
                    icon = 'fa-solid fa-bullseye';
                    colorClass = 'text-blue-600';
                }
                break;
            }
        }

        return { current, target, percent, status, message, icon, colorClass, showAddButton };
    };

    // --- MODAL FUNCTIONS ---
    const createModal = (id, title, formContent, onSubmit) => {
        let modal = document.getElementById(id);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = id;
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 hidden';
            modal.innerHTML = `
                <div class="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-dark">${title}</h3>
                        <button class="close-modal-btn text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                    </div>
                    <form class="modal-form">
                        ${formContent}
                        <div class="mt-8 flex justify-end">
                            <button type="submit" class="bg-primary hover:bg-pink-700 text-white px-6 py-2 rounded-lg shadow-sm font-medium">
                                Salvar
                            </button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            // Event listeners
            modal.querySelector('.close-modal-btn').addEventListener('click', () => {
                modal.classList.add('hidden');
            });

            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });

            modal.querySelector('.modal-form').addEventListener('submit', onSubmit);
        }
        return modal;
    };

    const openEditTransactionModal = (id) => {
        const transaction = state.transactions.find(t => t.id === id);
        if (!transaction) return;

        const formContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                    <input type="text" name="name" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                    <input type="number" name="amount" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select name="type" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option value="outcome">Saída</option>
                        <option value="income">Entrada</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select name="category" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                        <option value="Alimentação">Alimentação</option>
                        <option value="Transporte">Transporte</option>
                        <option value="Saúde">Saúde</option>
                        <option value="Lazer">Lazer</option>
                        <option value="Moradia">Moradia</option>
                        <option value="Educação">Educação</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Salário">Salário</option>
                        <option value="Investimento">Investimento</option>
                        <option value="Beleza">Beleza</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Data</label>
                    <input type="date" name="date" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                </div>
            </div>
        `;

        const modal = createModal('edit-transaction-modal', 'Editar Transação', formContent, (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            transaction.name = formData.get('name');
            transaction.amount = parseFloat(formData.get('amount'));
            transaction.type = formData.get('type');
            transaction.category = formData.get('category');
            transaction.date = formData.get('date');
            transaction.status = transaction.type === 'income' ? 'received' : 'pending';
            
            modal.classList.add('hidden');
            renderAll();
        });

        // Preenche o formulário
        const form = modal.querySelector('.modal-form');
        form.name.value = transaction.name;
        form.amount.value = transaction.amount;
        form.type.value = transaction.type;
        form.category.value = transaction.category;
        form.date.value = transaction.date;

        modal.classList.remove('hidden');
    };

    const openEditCardModal = (id) => {
        const card = state.cards.find(c => c.id === id);
        if (!card) return;

        const formContent = `
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Nome do Cartão</label>
                    <input type="text" name="name" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Limite</label>
                    <input type="number" name="limit" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Usado do Limite</label>
                    <input type="number" name="used" step="0.01" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Bandeira</label>
                    <select name="brand" class="w-full border border-gray-300 rounded-lg px-3 py-2">
                        <option value="mastercard">Mastercard</option>
                        <option value="visa">Visa</option>
                        <option value="elo">Elo</option>
                        <option value="amex">American Express</option>
                        <option value="other">Outra</option>
                    </select>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Fechamento</label>
                        <input type="number" name="closingDay" min="1" max="31" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                        <input type="number" name="dueDay" min="1" max="31" class="w-full border border-gray-300 rounded-lg px-3 py-2" required>
                    </div>
                </div>
            </div>
        `;

        const modal = createModal('edit-card-modal', 'Editar Cartão', formContent, (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            card.name = formData.get('name');
            card.limit = parseFloat(formData.get('limit'));
            card.used = parseFloat(formData.get('used'));
            card.brand = formData.get('brand');
            card.closingDay = Number(formData.get('closingDay'));
            card.dueDay = Number(formData.get('dueDay'));
            
            modal.classList.add('hidden');
            renderAll();
        });

        // Preenche o formulário
        const form = modal.querySelector('.modal-form');
        form.name.value = card.name;
        form.limit.value = card.limit;
        form.used.value = card.used || 0;
        form.brand.value = card.brand;
        form.closingDay.value = card.closingDay;
        form.dueDay.value = card.dueDay;

        modal.classList.remove('hidden');
    };

    const openEditGoalModal = (id) => {
        const goal = state.goals.find(g => g.id === id);
        if (!goal) return;

        const modal = document.getElementById('edit-budget-modal');
        const form = document.getElementById('edit-budget-form');
        
        if (!modal || !form) return;

        // Função para fechar o modal
        const closeModal = () => modal.classList.add('hidden');

        // Event listener para o botão X
        const closeBtn = document.getElementById('close-edit-budget-modal-btn');
        if (closeBtn) {
            // Remover listeners anteriores clonando o botão
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', closeModal);
        }

        // Fechar ao clicar fora do modal
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };

        // Remove event listeners anteriores do form
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Preencher os valores DEPOIS de clonar o formulário
        newForm.name.value = goal.name;
        newForm.amount.value = goal.amount;
        
        // Para selects, precisamos definir o valor depois de clonar
        if (newForm.category) {
            newForm.category.value = goal.category || 'Outros';
        }
        if (newForm.type) {
            newForm.type.value = goal.type || 'savings';
        }

        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            goal.name = newForm.name.value;
            goal.amount = parseFloat(newForm.amount.value);
            goal.category = newForm.category.value;
            if (newForm.type) goal.type = newForm.type.value;
            
            closeModal();
            renderAll();
        });

        // Mostrar o modal depois de tudo configurado
        modal.classList.remove('hidden');
    };

    // Modal para adicionar valor a uma meta
    const openAddValueModal = (id) => {
        const goal = state.goals.find(g => g.id === id);
        if (!goal) return;

        const currentSaved = goal.saved || 0;
        const remaining = goal.amount - currentSaved;
        const percent = goal.amount > 0 ? Math.round((currentSaved / goal.amount) * 100) : 0;

        // Criar modal dinamicamente se não existir
        let modal = document.getElementById('add-value-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'add-value-modal';
            modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 hidden';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-dark">Atualizar Progresso</h3>
                    <button type="button" id="close-add-value-btn" class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full text-xl">×</button>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-3 mb-4">
                    <h4 class="font-semibold text-dark text-sm mb-2">${goal.name}</h4>
                    
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-600">Progresso</span>
                        <span class="font-semibold ${percent >= 100 ? 'text-green-600' : 'text-blue-600'}">${percent}%</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div class="h-2 rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-primary'}" 
                             style="width: ${Math.min(percent, 100)}%"></div>
                    </div>
                    
                    <div class="flex justify-between text-xs">
                        <span><span class="text-gray-500">Guardado:</span> <span class="font-bold text-green-600">${formatCurrency(currentSaved)}</span></span>
                        <span><span class="text-gray-500">Meta:</span> <span class="font-bold">${formatCurrency(goal.amount)}</span></span>
                    </div>
                </div>
                
                <form id="add-value-form">
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                        <input type="number" id="add-value-amount" step="0.01" min="0.01" placeholder="0,00" 
                               class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary" required>
                    </div>
                    
                    <div class="grid grid-cols-4 gap-2 mb-4">
                        <button type="button" class="quick-value-btn py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50" data-value="50">+50</button>
                        <button type="button" class="quick-value-btn py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50" data-value="100">+100</button>
                        <button type="button" class="quick-value-btn py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50" data-value="200">+200</button>
                        <button type="button" class="quick-value-btn py-1.5 border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50" data-value="500">+500</button>
                    </div>
                    
                    <div class="flex gap-2 mb-3">
                        <button type="button" id="subtract-value-btn" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium">
                            <i class="fa-solid fa-minus mr-1"></i>Subtrair
                        </button>
                        <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium">
                            <i class="fa-solid fa-plus mr-1"></i>Adicionar
                        </button>
                    </div>
                    
                    <button type="button" id="reset-value-btn" class="w-full text-xs text-gray-400 hover:text-red-600">
                        <i class="fa-solid fa-rotate-left mr-1"></i>Zerar progresso
                    </button>
                </form>
            </div>
        `;

        modal.classList.remove('hidden');

        // Event listeners
        const closeBtn = document.getElementById('close-add-value-btn');
        const form = document.getElementById('add-value-form');
        const amountInput = document.getElementById('add-value-amount');
        const subtractBtn = document.getElementById('subtract-value-btn');
        const resetBtn = document.getElementById('reset-value-btn');

        const closeModal = () => modal.classList.add('hidden');

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        // Botões de valor rápido
        document.querySelectorAll('.quick-value-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const value = parseFloat(btn.getAttribute('data-value'));
                const currentValue = parseFloat(amountInput.value) || 0;
                amountInput.value = (currentValue + value).toFixed(2);
            });
        });

        // Botão de subtrair
        subtractBtn.addEventListener('click', () => {
            const valueToSubtract = parseFloat(amountInput.value);
            if (valueToSubtract > 0) {
                goal.saved = Math.max(0, (goal.saved || 0) - valueToSubtract);
                closeModal();
                renderAll();
            }
        });

        // Botão de zerar
        resetBtn.addEventListener('click', () => {
            showConfirmModal(
                'Zerar Progresso?',
                `Tem certeza que deseja zerar o progresso de <strong>${goal.name}</strong>?`,
                () => {
                    goal.saved = 0;
                    closeModal();
                    renderAll();
                }
            );
        });

        // Submit do formulário (adicionar)
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const valueToAdd = parseFloat(amountInput.value);
            
            if (valueToAdd > 0) {
                goal.saved = (goal.saved || 0) + valueToAdd;
                closeModal();
                renderAll();
            }
        });
    };

    // --- MANIPULADORES DE FORMULÁRIOS ---
    const setupFormHandlers = () => {
        // Transaction form
        const transactionForm = document.getElementById('transaction-form');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const newTransaction = {
                    id: Date.now(),
                    name: document.getElementById('transaction-name').value,
                    amount: parseFloat(document.getElementById('transaction-amount').value),
                    type: document.getElementById('transaction-type').value,
                    category: document.getElementById('transaction-category').value,
                    date: document.getElementById('transaction-date').value,
                    status: document.getElementById('transaction-type').value === 'income' ? 'received' : 'paid'
                };
                
                state.transactions.push(newTransaction);
                transactionForm.reset();
                
                const modal = document.getElementById('add-transaction-modal');
                if (modal) modal.classList.add('hidden');
                
                renderAll();
            });
        }

        // Card form
        const cardForm = document.getElementById('card-form');
        if (cardForm) {
            cardForm.addEventListener('submit', (e) => {
                e.preventDefault();

                const limit = parseFloat(document.getElementById('card-limit').value) || 0;
                const closingDay = parseInt(document.getElementById('card-closing-day').value, 10);
                const dueDay = parseInt(document.getElementById('card-due-day').value, 10);

                const newCard = {
                    id: Date.now(),
                    name: document.getElementById('card-name').value.trim() || 'Cartão',
                    limit: isFinite(limit) ? limit : 0,
                    used: 0,
                    brand: document.getElementById('card-brand').value,
                    closingDay: isFinite(closingDay) ? closingDay : null,
                    dueDay: isFinite(dueDay) ? dueDay : null
                };

                state.cards.push(newCard);
                cardForm.reset();

                const modal = document.getElementById('add-card-modal');
                if (modal) modal.classList.add('hidden');

                renderAll();
            });
        }

        // Goal form (metas)
        const goalForm = document.getElementById('budget-form'); // Mantendo ID por compatibilidade
        if (goalForm) {
            goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const newGoal = {
                    id: Date.now(),
                    name: document.getElementById('budget-name').value,
                    amount: parseFloat(document.getElementById('budget-amount').value),
                    category: document.getElementById('budget-category').value,
                    type: document.getElementById('budget-type') ? document.getElementById('budget-type').value : 'expense_limit'
                };
                
                state.goals.push(newGoal);
                goalForm.reset();
                
                const modal = document.getElementById('add-budget-modal');
                if (modal) modal.classList.add('hidden');
                
                renderAll();
            });
        }
    };

    // --- MANIPULADORES DE MODAIS ---
    const setupModalHandlers = () => {
        // Generic modal handlers
        const modalButtons = [
            { btn: 'add-transaction-btn', modal: 'add-transaction-modal' },
            { btn: 'add-card-btn', modal: 'add-card-modal' },
            { btn: 'add-budget-btn', modal: 'add-budget-modal' }
        ];

        modalButtons.forEach(({ btn, modal }) => {
            const button = document.getElementById(btn);
            const modalElement = document.getElementById(modal);
            
            if (button && modalElement) {
                button.addEventListener('click', () => {
                    modalElement.classList.remove('hidden');
                });
            }
        });

        // Close modal handlers
        const closeButtons = document.querySelectorAll('[id*="close-"][id*="modal"], [id*="close-"][id*="btn"]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.fixed');
                if (modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        // Close modal on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('fixed') && e.target.classList.contains('bg-gray-900')) {
                e.target.classList.add('hidden');
            }
        });

        // Edit budget modal close
        const editBudgetCloseBtn = document.getElementById('close-edit-budget-btn');
        const editBudgetModal = document.getElementById('edit-budget-modal');
        
        if (editBudgetCloseBtn && editBudgetModal) {
            editBudgetCloseBtn.addEventListener('click', () => {
                editBudgetModal.classList.add('hidden');
            });
        }
    };

    // --- SETUP DO FILTRO DE MÊS E ANO (Página de Transações) ---
    const setupMonthFilter = () => {
        const monthFilter = document.getElementById('filter-month');
        const yearFilter = document.getElementById('filter-year');
        if (!monthFilter || !yearFilter) return; // Não estamos na página de transações
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Preencher o select de anos (2024 até 2035)
        yearFilter.innerHTML = '';
        for (let year = 2024; year <= 2035; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) {
                option.selected = true;
            }
            yearFilter.appendChild(option);
        }
        
        // Selecionar o mês atual por padrão
        monthFilter.value = currentMonth.toString();
        
        // Event listeners para mudança de filtros
        monthFilter.addEventListener('change', () => renderTransactions());
        yearFilter.addEventListener('change', () => renderTransactions());
        
        // Outros filtros
        const searchInput = document.getElementById('search-input');
        const filterType = document.getElementById('filter-type');
        const filterCategory = document.getElementById('filter-category');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        
        // Popular categorias no filtro
        if (filterCategory) {
            const categories = [
                'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Moradia',
                'Educação', 'Cartão de Crédito', 'Salário', 'Investimento',
                'Beleza', 'Seguro', 'Outros'
            ];
            
            filterCategory.innerHTML = '<option value="all">Todas as Categorias</option>';
            categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                filterCategory.appendChild(option);
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', () => renderTransactions());
        }
        if (filterType) {
            filterType.addEventListener('change', () => renderTransactions());
        }
        if (filterCategory) {
            filterCategory.addEventListener('change', () => renderTransactions());
        }
        
        // Botão de limpar filtros
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                // Resetar para o mês e ano atual
                monthFilter.value = currentMonth.toString();
                yearFilter.value = currentYear.toString();
                if (searchInput) searchInput.value = '';
                if (filterType) filterType.value = 'all';
                if (filterCategory) filterCategory.value = 'all';
                renderTransactions();
            });
        }
    };

    // --- FUNÇÃO PRINCIPAL DE RENDERIZAÇÃO ---
    const renderAll = () => {
        renderSummary();
        renderTransactions();
        renderCards();
        addCardEventListeners(); // Adicionar event listeners após renderizar
        renderGoals(); // Mudança de renderBudgets para renderGoals
        renderCategoryChart(); // Adicionar renderização do gráfico
        saveState();
    };

    // --- INICIALIZAÇÃO ---
    const init = () => {
        setActiveNav();
        setupFormHandlers();
        setupModalHandlers();
        setupMonthFilter(); // Inicializar filtro de mês na página de transações
        
        // Mobile menu toggle
        const menuToggleBtn = document.getElementById('menu-toggle-btn');
        if (menuToggleBtn) {
            menuToggleBtn.addEventListener('click', toggleMobileMenu);
        }

        // Fechar menu ao clicar em links no mobile
        const navLinks = document.querySelectorAll('#sidebar nav a');
        if (navLinks.length) {
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    if (window.matchMedia('(max-width: 767px)').matches) {
                        closeMobileMenu();
                    }
                });
            });
        }
        
        // Botão de adicionar transação
        const addExpenseBtn = document.getElementById('add-expense-btn');
        if (addExpenseBtn) {
            addExpenseBtn.addEventListener('click', () => {
                const modal = document.getElementById('add-transaction-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    // Definir data atual como padrão
                    const dateInput = document.getElementById('transaction-date');
                    if (dateInput && !dateInput.value) {
                        dateInput.value = new Date().toISOString().split('T')[0];
                    }
                }
            });
        }
        
        renderAll();
        
        // Esconde o loading screen após carregar
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => loadingScreen.remove(), 200);
        }
    };

    // Inicializar o app
    init();
});