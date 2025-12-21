document.addEventListener('DOMContentLoaded', () => {
    const LOCAL_STORAGE_KEY = 'myFinanceState';

    // Filtro de período selecionado
    let currentPeriodFilter = 'all';

    // Obter estado
    const getState = () => {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            try {
                const data = JSON.parse(savedState);
                return {
                    transactions: Array.isArray(data.transactions) ? data.transactions : [],
                    cards: Array.isArray(data.cards) ? data.cards : [],
                    goals: Array.isArray(data.goals) ? data.goals : Array.isArray(data.budgets) ? data.budgets : []
                };
            } catch {
                return { transactions: [], cards: [], goals: [] };
            }
        }
        return { transactions: [], cards: [], goals: [] };
    };

    const state = getState();

    // Filtrar transações por período
    const filterTransactionsByPeriod = (transactions, period) => {
        if (period === 'all') return transactions;

        const now = new Date();
        now.setHours(23, 59, 59, 999);

        return transactions.filter(t => {
            const transactionDate = new Date(t.date + 'T00:00:00');
            let result = false;
            let rangeStart, rangeEnd;

            switch (period) {
                case 'current-month':
                    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                    result = transactionDate >= rangeStart && transactionDate <= rangeEnd;
                    break;
                
                case 'last-month':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    rangeEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                    result = transactionDate >= rangeStart && transactionDate <= rangeEnd;
                    break;
                
                case 'last-3-months':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                    rangeEnd = now;
                    result = transactionDate >= rangeStart && transactionDate <= rangeEnd;
                    break;
                
                case 'last-6-months':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
                    rangeEnd = now;
                    result = transactionDate >= rangeStart && transactionDate <= rangeEnd;
                    break;
                
                case 'last-year':
                    rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                    rangeEnd = now;
                    result = transactionDate >= rangeStart && transactionDate <= rangeEnd;
                    break;
                
                default:
                    result = true;
            }

            return result;
        });
    };

    // Obter transações filtradas
    const getFilteredTransactions = () => {
        return filterTransactionsByPeriod(state.transactions, currentPeriodFilter);
    };

    // Funções utilitárias
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

    // Atualizar cabeçalho de mês
    const updateMonthHeader = () => {
        const monthElement = document.getElementById('current-month');
        if (monthElement) {
            const date = new Date();
            const monthName = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
            monthElement.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);
        }
    };

    // Estatísticas rápidas
    const updateQuickStats = () => {
        const filteredTransactions = getFilteredTransactions();
        const totalTransactions = filteredTransactions.length;
        const totalCards = state.cards.length;
        const totalGoals = state.goals.length;
        const lastTransaction = filteredTransactions.length > 0 
            ? formatDate(filteredTransactions[filteredTransactions.length - 1].date)
            : '-';

        document.getElementById('total-transactions').textContent = totalTransactions;
        document.getElementById('total-cards').textContent = totalCards;
        document.getElementById('total-budgets').textContent = totalGoals;
        document.getElementById('last-transaction').textContent = lastTransaction;
    };

    // Obter gastos dos últimos 6 meses
    const getLast6MonthsData = () => {
        const months = [];
        const data = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push(date.toLocaleString('pt-BR', { month: 'short', year: '2-digit' }));
            
            const monthExpenses = state.transactions
                .filter(t => {
                    const tDate = new Date(t.date + 'T00:00:00');
                    const tKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
                    return t.type === 'outcome' && tKey === monthKey;
                })
                .reduce((acc, t) => acc + t.amount, 0);

            data.push(monthExpenses);
        }

        return { months, data };
    };

    // Top 5 categorias
    const getTopCategories = () => {
        const filteredTransactions = getFilteredTransactions();
        const categoryExpenses = {};
        
        filteredTransactions
            .filter(t => t.type === 'outcome')
            .forEach(t => {
                categoryExpenses[t.category] = (categoryExpenses[t.category] || 0) + t.amount;
            });

        // Incluir gastos dos cartões apenas se o filtro for 'all' ou do período atual
        if (currentPeriodFilter === 'all' || currentPeriodFilter === 'current-month') {
            state.cards.forEach(card => {
                if (card.used > 0) {
                    categoryExpenses['Cartão de Crédito'] = (categoryExpenses['Cartão de Crédito'] || 0) + card.used;
                }
            });
        }

        const sorted = Object.entries(categoryExpenses)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            labels: sorted.map(item => item[0]),
            data: sorted.map(item => item[1])
        };
    };

    // Resumo por categoria
    const getCategorySummary = () => {
        const filteredTransactions = getFilteredTransactions();
        const categoryData = {};
        const totalExpense = filteredTransactions
            .filter(t => t.type === 'outcome')
            .reduce((acc, t) => acc + t.amount, 0);

        filteredTransactions
            .filter(t => t.type === 'outcome')
            .forEach(t => {
                if (!categoryData[t.category]) {
                    categoryData[t.category] = { total: 0, count: 0 };
                }
                categoryData[t.category].total += t.amount;
                categoryData[t.category].count += 1;
            });

        // Adicionar gastos dos cartões apenas se o filtro for 'all' ou do período atual
        if ((currentPeriodFilter === 'all' || currentPeriodFilter === 'current-month') && state.cards.some(c => c.used > 0)) {
            const cardTotal = state.cards.reduce((acc, c) => acc + (c.used || 0), 0);
            categoryData['Cartão de Crédito'] = { 
                total: (categoryData['Cartão de Crédito']?.total || 0) + cardTotal, 
                count: (categoryData['Cartão de Crédito']?.count || 0) + 1 
            };
        }

        return { categoryData, totalExpense };
    };

    // Renderizar tabela de resumo
    const renderCategorySummaryTable = () => {
        const tableBody = document.getElementById('category-summary-table');
        const { categoryData, totalExpense } = getCategorySummary();

        if (Object.keys(categoryData).length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-gray-400">Nenhuma transação registrada</td></tr>';
            return;
        }

        const categoryColors = {
            'Alimentação': 'bg-green-50 text-green-700',
            'Transporte': 'bg-blue-50 text-blue-700',
            'Saúde': 'bg-red-50 text-red-700',
            'Lazer': 'bg-purple-50 text-purple-700',
            'Moradia': 'bg-indigo-50 text-indigo-700',
            'Educação': 'bg-yellow-50 text-yellow-700',
            'Cartão de Crédito': 'bg-pink-50 text-pink-700',
            'Salário': 'bg-teal-50 text-teal-700',
            'Investimento': 'bg-orange-50 text-orange-700',
            'Beleza': 'bg-fuchsia-50 text-fuchsia-700',
            'Outros': 'bg-gray-50 text-gray-700'
        };

        tableBody.innerHTML = Object.entries(categoryData)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([category, data]) => {
                const percentage = totalExpense > 0 ? ((data.total / totalExpense) * 100).toFixed(1) : 0;
                const average = (data.total / data.count).toFixed(2);
                const color = categoryColors[category] || 'bg-gray-50 text-gray-700';

                return `
                    <tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td class="py-4">
                            <span class="px-3 py-1 rounded-full text-sm font-semibold ${color}">
                                ${category}
                            </span>
                        </td>
                        <td class="text-right py-4 font-semibold text-red-600">${formatCurrency(data.total)}</td>
                        <td class="text-right py-4 text-gray-600">${data.count}</td>
                        <td class="text-right py-4 text-gray-600">${formatCurrency(average)}</td>
                        <td class="text-right py-4">
                            <div class="flex items-center justify-end gap-2">
                                <div class="w-16 bg-gray-200 rounded-full h-2">
                                    <div class="bg-primary h-2 rounded-full" style="width: ${percentage}%"></div>
                                </div>
                                <span class="text-sm font-semibold text-dark w-12">${percentage}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            })
            .join('');
    };

    // Gráfico de gastos mensais
    const renderMonthlyChart = () => {
        const ctx = document.getElementById('monthly-chart');
        if (!ctx) return;

        if (window.monthlyChart) {
            window.monthlyChart.destroy();
        }

        const { months, data } = getLast6MonthsData();

        window.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Gastos Mensais',
                    data: data,
                    borderColor: '#db2777',
                    backgroundColor: 'rgba(219, 39, 119, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#db2777',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            font: { size: 12 },
                            padding: 15
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 13 },
                        callbacks: {
                            label: (context) => `Gasto: ${formatCurrency(context.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    };

    // Gráfico top categorias
    const renderTopCategoriesChart = () => {
        const ctx = document.getElementById('top-categories-chart');
        if (!ctx) return;

        if (window.topCategoriesChart) {
            window.topCategoriesChart.destroy();
        }

        const { labels, data } = getTopCategories();

        if (data.length === 0) {
            return;
        }

        const colors = [
            '#db2777', '#f97316', '#eab308', '#22c55e', '#3b82f6'
        ];

        window.topCategoriesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: { size: 12 },
                            boxWidth: 12
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${formatCurrency(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    };

    // Filtro de período
    const setupPeriodFilter = () => {
        const filterSelect = document.getElementById('period-filter');
        if (!filterSelect) return;

        filterSelect.addEventListener('change', (e) => {
            currentPeriodFilter = e.target.value;
            
            // Feedback visual
            filterSelect.classList.add('ring-2', 'ring-primary');
            setTimeout(() => {
                filterSelect.classList.remove('ring-2', 'ring-primary');
            }, 300);
            
            renderAll();
        });
    };

    // Exportar JSON
    const setupExportJson = () => {
        const btn = document.getElementById('export-json-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const dataStr = JSON.stringify(state, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `myfinance-backup-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
        });
    };

    // Importar JSON
    const setupImportFile = () => {
        const btn = document.getElementById('import-btn');
        const input = document.getElementById('import-file-input');
        const status = document.getElementById('import-status');

        if (!btn || !input) return;

        btn.addEventListener('click', () => {
            input.click();
        });

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
                    status.textContent = '✅ Dados importados com sucesso!';
                    status.className = 'text-sm text-center text-green-600 font-semibold';
                    status.classList.remove('hidden');
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                } catch (error) {
                    status.textContent = '❌ Erro ao importar arquivo!';
                    status.className = 'text-sm text-center text-red-600 font-semibold';
                    status.classList.remove('hidden');
                }
            };
            reader.readAsText(file);
        });
    };

    // Comparação metas vs realizado
    const renderGoalsComparison = () => {
        const container = document.getElementById('goals-comparison');
        if (!container) return;

        if (state.goals.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-400 py-6">Nenhuma meta criada ainda</p>';
            return;
        }

        const filteredTransactions = getFilteredTransactions();

        const goalComparisons = state.goals.map(goal => {
            let current = 0;
            
            if (goal.type === 'expense_limit') {
                current = filteredTransactions
                    .filter(t => t.category === goal.category && t.type === 'outcome')
                    .reduce((acc, t) => acc + t.amount, 0);
                if (goal.category === 'Cartão de Crédito' && (currentPeriodFilter === 'all' || currentPeriodFilter === 'current-month')) {
                    current += state.cards.reduce((acc, c) => acc + (c.used || 0), 0);
                }
            } else if (goal.type === 'savings') {
                const income = filteredTransactions
                    .filter(t => t.category === goal.category && t.type === 'income')
                    .reduce((acc, t) => acc + t.amount, 0);
                const outcome = filteredTransactions
                    .filter(t => t.category === goal.category && t.type === 'outcome')
                    .reduce((acc, t) => acc + t.amount, 0);
                current = income - outcome;
            } else if (goal.type === 'investment' || goal.type === 'debt_payment') {
                current = filteredTransactions
                    .filter(t => t.category === goal.category && t.type === 'outcome')
                    .reduce((acc, t) => acc + t.amount, 0);
            }

            const percent = goal.amount > 0 ? (current / goal.amount) * 100 : 0;
            const typeLabel = goal.type === 'expense_limit' ? 'Limite' : 
                            goal.type === 'savings' ? 'Economia' : 
                            goal.type === 'investment' ? 'Investimento' : 'Pagamento';

            return {
                name: goal.name,
                type: typeLabel,
                current,
                target: goal.amount,
                percent,
                status: percent >= 100 ? 'Concluída' : 'Em progresso'
            };
        });

        container.innerHTML = goalComparisons.map(goal => `
            <div class="bg-white p-4 rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-dark">${goal.name}</h4>
                        <span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 inline-block">${goal.type}</span>
                    </div>
                    <span class="text-sm font-semibold ${goal.percent >= 100 ? 'text-green-600' : 'text-gray-600'}">
                        ${Math.round(goal.percent)}%
                    </span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div class="h-2 rounded-full transition-all ${goal.percent >= 100 ? 'bg-green-500' : 'bg-primary'}" 
                         style="width: ${Math.min(goal.percent, 100)}%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-600">
                    <span>${formatCurrency(goal.current)}</span>
                    <span>Meta: ${formatCurrency(goal.target)}</span>
                </div>
            </div>
        `).join('');
    };

    // Exportar para Excel com formatação bonita
    const setupExportExcel = () => {
        const btn = document.getElementById('export-excel-btn');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const filteredTransactions = getFilteredTransactions();
            
            // Criar workbook
            const wb = XLSX.utils.book_new();
            
            // Função para adicionar bordas a todas as células
            const addBordersToSheet = (ws, rows, cols) => {
                const borderStyle = {
                    top: { style: 'thin', color: { rgb: '000000' } },
                    bottom: { style: 'thin', color: { rgb: '000000' } },
                    left: { style: 'thin', color: { rgb: '000000' } },
                    right: { style: 'thin', color: { rgb: '000000' } }
                };
                
                for (let R = 0; R < rows; R++) {
                    for (let C = 0; C < cols; C++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[cellAddress]) continue;
                        if (!ws[cellAddress].s) ws[cellAddress].s = {};
                        ws[cellAddress].s.border = borderStyle;
                    }
                }
            };
            
            // Função para estilizar cabeçalho
            const styleHeader = (ws, row, cols) => {
                for (let C = 0; C < cols; C++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: C });
                    if (!ws[cellAddress]) continue;
                    ws[cellAddress].s = {
                        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
                        fill: { fgColor: { rgb: '4472C4' } },
                        alignment: { horizontal: 'center', vertical: 'center' },
                        border: {
                            top: { style: 'thin', color: { rgb: '000000' } },
                            bottom: { style: 'thin', color: { rgb: '000000' } },
                            left: { style: 'thin', color: { rgb: '000000' } },
                            right: { style: 'thin', color: { rgb: '000000' } }
                        }
                    };
                }
            };
            
            // === ABA 1: RESUMO ===
            const stats = {
                'Total de Transações': filteredTransactions.length,
                'Total de Receitas': formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0)),
                'Total de Despesas': formatCurrency(filteredTransactions.filter(t => t.type === 'outcome').reduce((acc, t) => acc + t.amount, 0)),
                'Saldo': formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - filteredTransactions.filter(t => t.type === 'outcome').reduce((acc, t) => acc + t.amount, 0))
            };
            
            const resumoData = [
                ['RESUMO FINANCEIRO'],
                [''],
                ['DESCRIÇÃO', 'VALOR'],
                ...Object.entries(stats).map(([key, value]) => [key, value]),
                [''],
                ['Data de Geração:', new Date().toLocaleString('pt-BR')]
            ];
            
            const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
            wsResumo['!cols'] = [{wch: 25}, {wch: 20}];
            
            // Estilizar título
            wsResumo['A1'].s = {
                font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: 'DB2777' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
            wsResumo['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
            
            // Estilizar cabeçalho
            styleHeader(wsResumo, 2, 2);
            addBordersToSheet(wsResumo, resumoData.length, 2);
            
            XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
            
            // === ABA 2: TRANSAÇÕES ===
            const transacoesData = [
                ['DATA', 'TIPO', 'CATEGORIA', 'DESCRIÇÃO', 'VALOR']
            ];
            
            filteredTransactions.forEach(t => {
                transacoesData.push([
                    formatDate(t.date),
                    t.type === 'income' ? 'Receita' : 'Despesa',
                    t.category || '-',
                    t.description || '-',
                    formatCurrency(t.amount)
                ]);
            });
            
            const wsTransacoes = XLSX.utils.aoa_to_sheet(transacoesData);
            wsTransacoes['!cols'] = [{wch: 12}, {wch: 10}, {wch: 20}, {wch: 30}, {wch: 15}];
            
            styleHeader(wsTransacoes, 0, 5);
            addBordersToSheet(wsTransacoes, transacoesData.length, 5);
            
            XLSX.utils.book_append_sheet(wb, wsTransacoes, 'Transações');
            
            // === ABA 3: CATEGORIAS ===
            const { categoryData, totalExpense } = getCategorySummary();
            const categoriasData = [
                ['CATEGORIA', 'TOTAL GASTO', 'PERCENTUAL']
            ];
            
            Object.entries(categoryData)
                .sort((a, b) => b[1].total - a[1].total)
                .forEach(([category, data]) => {
                    const percent = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
                    categoriasData.push([
                        category,
                        formatCurrency(data.total),
                        percent.toFixed(1) + '%'
                    ]);
                });
            
            const wsCategorias = XLSX.utils.aoa_to_sheet(categoriasData);
            wsCategorias['!cols'] = [{wch: 25}, {wch: 15}, {wch: 12}];
            
            styleHeader(wsCategorias, 0, 3);
            addBordersToSheet(wsCategorias, categoriasData.length, 3);
            
            XLSX.utils.book_append_sheet(wb, wsCategorias, 'Por Categoria');
            
            // === ABA 4: METAS ===
            if (state.goals.length > 0) {
                const metasData = [
                    ['META', 'TIPO', 'VALOR ATUAL', 'VALOR META', 'PROGRESSO']
                ];
                
                state.goals.forEach(goal => {
                    let current = 0;
                    if (goal.type === 'expense_limit') {
                        current = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'outcome')
                            .reduce((acc, t) => acc + t.amount, 0);
                    } else if (goal.type === 'savings') {
                        const income = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'income')
                            .reduce((acc, t) => acc + t.amount, 0);
                        const outcome = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'outcome')
                            .reduce((acc, t) => acc + t.amount, 0);
                        current = income - outcome;
                    } else if (goal.type === 'investment' || goal.type === 'debt_payment') {
                        current = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'outcome')
                            .reduce((acc, t) => acc + t.amount, 0);
                    }
                    
                    const percent = goal.amount > 0 ? (current / goal.amount) * 100 : 0;
                    const typeLabel = goal.type === 'expense_limit' ? 'Limite' : 
                                    goal.type === 'savings' ? 'Economia' : 
                                    goal.type === 'investment' ? 'Investimento' : 'Pagamento';
                    
                    metasData.push([
                        goal.name,
                        typeLabel,
                        formatCurrency(current),
                        formatCurrency(goal.amount),
                        percent.toFixed(1) + '%'
                    ]);
                });
                
                const wsMetas = XLSX.utils.aoa_to_sheet(metasData);
                wsMetas['!cols'] = [{wch: 25}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 12}];
                
                styleHeader(wsMetas, 0, 5);
                addBordersToSheet(wsMetas, metasData.length, 5);
                
                XLSX.utils.book_append_sheet(wb, wsMetas, 'Metas');
            }
            
            // === ABA 5: CARTÕES ===
            if (state.cards.length > 0) {
                const cartoesData = [
                    ['NOME', 'BANDEIRA', 'LIMITE', 'USADO', 'DISPONÍVEL', 'VENCIMENTO']
                ];
                
                state.cards.forEach(card => {
                    cartoesData.push([
                        card.name,
                        card.flag || '-',
                        formatCurrency(card.limit),
                        formatCurrency(card.used || 0),
                        formatCurrency(card.limit - (card.used || 0)),
                        card.dueDate || '-'
                    ]);
                });
                
                const wsCartoes = XLSX.utils.aoa_to_sheet(cartoesData);
                wsCartoes['!cols'] = [{wch: 20}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}];
                
                styleHeader(wsCartoes, 0, 6);
                addBordersToSheet(wsCartoes, cartoesData.length, 6);
                
                XLSX.utils.book_append_sheet(wb, wsCartoes, 'Cartões');
            }
            
            // Gerar arquivo
            const periodLabel = document.querySelector('#period-filter option:checked').textContent;
            const fileName = `Relatorio_Financeiro_${periodLabel.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
            XLSX.writeFile(wb, fileName);
        });
    };

    // Exportar para PDF
    const setupExportPDF = () => {
        const btn = document.getElementById('export-pdf-btn');
        if (!btn) return;

        btn.addEventListener('click', async () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            const filteredTransactions = getFilteredTransactions();
            const periodLabel = document.querySelector('#period-filter option:checked').textContent;
            
            // Obter configurações do usuário (nome e cor)
            const CONFIG_STORAGE_KEY = 'appConfig';
            let userName = 'Usuario';
            let primaryColor = '#db2777'; // Rosa padrão
            try {
                const configData = localStorage.getItem(CONFIG_STORAGE_KEY);
                if (configData) {
                    const config = JSON.parse(configData);
                    userName = config.userName || 'Usuario';
                    primaryColor = config.primaryColor || '#db2777';
                }
            } catch (e) {
                userName = 'Usuario';
                primaryColor = '#db2777';
            }
            
            // Converter hex para RGB
            const hexToRgb = (hex) => {
                const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16)
                } : { r: 219, g: 39, b: 119 };
            };
            
            const rgb = hexToRgb(primaryColor);
            
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 20;
            
            // Cabeçalho com fundo colorido (cor personalizada)
            doc.setFillColor(rgb.r, rgb.g, rgb.b);
            doc.rect(0, 0, pageWidth, 40, 'F');
            
            // Logo/Nome do site
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('MyFinance', 15, 12);
            
            // Nome do usuário no canto direito
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(userName, pageWidth - 15, 12, { align: 'right' });
            
            // Título
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('RELATORIO FINANCEIRO', pageWidth / 2, 22, { align: 'center' });
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Periodo: ${periodLabel}`, pageWidth / 2, 29, { align: 'center' });
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 35, { align: 'center' });
            
            y = 50;
            
            // Box de Estatísticas
            const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const totalOutcome = filteredTransactions.filter(t => t.type === 'outcome').reduce((acc, t) => acc + t.amount, 0);
            const balance = totalIncome - totalOutcome;
            
            doc.setFillColor(240, 240, 245);
            doc.roundedRect(15, y, pageWidth - 30, 40, 3, 3, 'F');
            
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 30);
            doc.text('RESUMO GERAL', 20, y + 8);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            doc.text(`Transacoes: ${filteredTransactions.length}`, 20, y + 18);
            
            doc.setTextColor(34, 197, 94);
            doc.text(`Receitas: ${formatCurrency(totalIncome)}`, 20, y + 26);
            
            doc.setTextColor(239, 68, 68);
            doc.text(`Despesas: ${formatCurrency(totalOutcome)}`, 20, y + 34);
            
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(balance >= 0 ? 34 : 239, balance >= 0 ? 197 : 68, balance >= 0 ? 94 : 68);
            doc.text(`Saldo: ${formatCurrency(balance)}`, pageWidth - 20, y + 26, { align: 'right' });
            
            y += 50;
            
            const { categoryData: catData, totalExpense: totExp } = getCategorySummary();
            const categories = Object.entries(catData).sort((a, b) => b[1].total - a[1].total).slice(0, 8);
            
            // Tabela de Categorias
            if (categories.length > 0) {
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 30);
                doc.text('DESPESAS POR CATEGORIA', 20, y);
                y += 8;
                
                // Cabeçalho da tabela
                doc.setFillColor(68, 114, 196);
                doc.rect(15, y, pageWidth - 30, 8, 'F');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('CATEGORIA', 18, y + 5.5);
                doc.text('VALOR', 120, y + 5.5);
                doc.text('PERCENTUAL', 165, y + 5.5);
                y += 8;
                
                // Linhas da tabela
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(60, 60, 60);
                
                categories.forEach(([category, data], index) => {
                    if (y > 260) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    const percent = totExp > 0 ? (data.total / totExp) * 100 : 0;
                    
                    // Fundo alternado
                    if (index % 2 === 0) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
                    }
                    
                    doc.setTextColor(60, 60, 60);
                    const categoryText = category.length > 25 ? category.substring(0, 25) + '...' : category;
                    doc.text(categoryText, 18, y);
                    doc.text(formatCurrency(data.total), 120, y);
                    doc.text(`${percent.toFixed(1)}%`, 165, y);
                    
                    y += 7;
                });
                
                y += 5;
            }
            
            // Tabela de Metas
            if (state.goals.length > 0) {
                if (y > 210) {
                    doc.addPage();
                    y = 20;
                }
                
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 30);
                doc.text('PROGRESSO DAS METAS', 20, y);
                y += 8;
                
                // Cabeçalho
                doc.setFillColor(68, 114, 196);
                doc.rect(15, y, pageWidth - 30, 8, 'F');
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text('META', 18, y + 5.5);
                doc.text('ATUAL', 100, y + 5.5);
                doc.text('OBJETIVO', 135, y + 5.5);
                doc.text('%', 185, y + 5.5);
                y += 8;
                
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60, 60, 60);
                
                state.goals.forEach((goal, index) => {
                    if (y > 265) {
                        doc.addPage();
                        y = 20;
                    }
                    
                    let current = 0;
                    if (goal.type === 'expense_limit') {
                        current = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'outcome')
                            .reduce((acc, t) => acc + t.amount, 0);
                    } else if (goal.type === 'savings') {
                        const income = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'income')
                            .reduce((acc, t) => acc + t.amount, 0);
                        const outcome = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'outcome')
                            .reduce((acc, t) => acc + t.amount, 0);
                        current = income - outcome;
                    } else if (goal.type === 'investment' || goal.type === 'debt_payment') {
                        current = filteredTransactions
                            .filter(t => t.category === goal.category && t.type === 'outcome')
                            .reduce((acc, t) => acc + t.amount, 0);
                    }
                    
                    const percent = goal.amount > 0 ? (current / goal.amount) * 100 : 0;
                    
                    // Fundo alternado
                    if (index % 2 === 0) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(15, y - 5, pageWidth - 30, 7, 'F');
                    }
                    
                    doc.setFontSize(8);
                    doc.setTextColor(60, 60, 60);
                    const goalName = goal.name.length > 20 ? goal.name.substring(0, 20) + '...' : goal.name;
                    doc.text(goalName, 18, y);
                    doc.text(formatCurrency(current), 100, y);
                    doc.text(formatCurrency(goal.amount), 135, y);
                    
                    const percentColor = percent >= 100 ? [34, 197, 94] : percent >= 75 ? [251, 191, 36] : [239, 68, 68];
                    doc.setTextColor(...percentColor);
                    doc.text(`${percent.toFixed(0)}%`, 185, y);
                    
                    y += 7;
                });
            }
            
            // Gráfico em escala (barra segmentada) - Distribuição de Despesas
            if (categories.length > 0) {
                if (y > 180) {
                    doc.addPage();
                    y = 20;
                } else {
                    y += 10;
                }

                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 30, 30);
                doc.text('DISTRIBUICAO DE DESPESAS', 20, y);
                y += 12;

                // Barra segmentada
                const barX = 25;
                const barY = y;
                const barWidth = 170;
                const barHeight = 10;
                const colors = [
                    [68, 114, 196], [237, 125, 49], [165, 165, 165], [255, 192, 0],
                    [91, 155, 213], [112, 173, 71], [158, 72, 14], [99, 99, 99]
                ];

                let offsetX = 0;
                categories.forEach(([category, data], index) => {
                    const percent = totExp > 0 ? (data.total / totExp) * 100 : 0;
                    const segmentWidth = barWidth * (percent / 100);
                    const color = colors[index % colors.length];

                    doc.setFillColor(...color);
                    doc.rect(barX + offsetX, barY, segmentWidth, barHeight, 'F');
                    offsetX += segmentWidth;
                });

                // Moldura da barra
                doc.setDrawColor(200, 200, 200);
                doc.rect(barX, barY, barWidth, barHeight);

                y += 18;

                // Legenda em duas colunas
                let legendX = 25;
                let legendY = y;
                const itemsPerColumn = Math.ceil(categories.length / 2);

                categories.forEach(([category, data], index) => {
                    if (index === itemsPerColumn) {
                        legendX = barX + barWidth / 2 + 15;
                        legendY = y;
                    }

                    const percent = totExp > 0 ? (data.total / totExp) * 100 : 0;
                    const color = colors[index % colors.length];

                    // Quadrado colorido
                    doc.setFillColor(...color);
                    doc.rect(legendX, legendY - 2.5, 3, 3, 'F');

                    // Texto da legenda
                    doc.setFontSize(7);
                    doc.setTextColor(60, 60, 60);
                    const legendText = `${category.substring(0, 16)}: ${percent.toFixed(1)}%`;
                    doc.text(legendText, legendX + 5, legendY);

                    legendY += 6;
                });

                y = legendY + 6;
            }
            
            // Salvar
            const fileName = `Relatorio_Financeiro_${periodLabel.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
            doc.save(fileName);
        });
    };

    // Renderizar tudo
    const renderAll = () => {
        updateMonthHeader();
        updateQuickStats();
        renderMonthlyChart();
        renderTopCategoriesChart();
        renderCategorySummaryTable();
        renderGoalsComparison();
    };

    // Inicialização
    updateMonthHeader();
    setupExportJson();
    setupExportExcel();
    setupExportPDF();
    setupImportFile();
    setupPeriodFilter();
    renderAll();
});
