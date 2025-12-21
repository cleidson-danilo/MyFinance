document.addEventListener('DOMContentLoaded', () => {
    // --- UTILITY FUNCTIONS ---
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

    // --- STATE MANAGEMENT ---
    const getState = () => {
        const savedState = localStorage.getItem('myFinanceState');
        const defaultState = {
            transactions: [],
            cards: [],
            budgets: []
        };
        
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                return {
                    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
                    cards: Array.isArray(parsed.cards) ? parsed.cards : [],
                    budgets: Array.isArray(parsed.budgets) ? parsed.budgets : []
                };
            } catch {
                return defaultState;
            }
        }
        return defaultState;
    };

    const setState = (newState) => {
        localStorage.setItem('myFinanceState', JSON.stringify(newState));
    };

    // --- EXPORT FUNCTIONS ---
    const exportToJSON = () => {
        const state = getState();
        const dataStr = JSON.stringify(state, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.download = `myfinance_backup_${dateStr}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Mostrar feedback
        showNotification('Backup exportado com sucesso!', 'success');
    };

    const exportToExcel = () => {
        const state = getState();
        
        // Criar dados para Excel (formato CSV)
        let csvContent = '';
        
        // Header das transações
        csvContent += 'TRANSAÇÕES\n';
        csvContent += 'Nome,Categoria,Tipo,Valor,Data,Status\n';
        
        // Dados das transações
        state.transactions.forEach(t => {
            csvContent += `"${t.name}","${t.category}","${t.type}",${t.amount},"${t.date}","${t.status}"\n`;
        });
        
        csvContent += '\n\nCARTÕES\n';
        csvContent += 'Nome,Bandeira,Limite,Usado,Disponível,Fechamento,Vencimento\n';
        
        // Dados dos cartões
        state.cards.forEach(c => {
            const used = c.used || 0;
            const available = c.limit - used;
            csvContent += `"${c.name}","${c.brand}",${c.limit},${used},${available},${c.closingDay},${c.dueDay}\n`;
        });
        
        csvContent += '\n\nORÇAMENTOS\n';
        csvContent += 'Nome,Categoria,Valor Planejado\n';
        
        // Dados dos orçamentos
        state.budgets.forEach(b => {
            csvContent += `"${b.name}","${b.category}",${b.amount}\n`;
        });
        
        // Criar e baixar arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        link.download = `myfinance_dados_${dateStr}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification('Dados exportados para Excel com sucesso!', 'success');
    };

    // --- IMPORT FUNCTIONS ---
    const importFromFile = (file) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validar estrutura dos dados
                if (!importedData.transactions || !importedData.cards || !importedData.budgets) {
                    throw new Error('Formato de arquivo inválido');
                }
                
                // Perguntar se quer substituir ou mesclar dados
                const choice = confirm(
                    'Como deseja importar os dados?\n\n' +
                    'OK = Substituir dados atuais\n' +
                    'Cancelar = Mesclar com dados atuais'
                );
                
                if (choice) {
                    // Substituir completamente
                    setState(importedData);
                    showNotification('Dados importados e substituídos com sucesso!', 'success');
                } else {
                    // Mesclar dados
                    const currentState = getState();
                    
                    // Gerar novos IDs para evitar conflitos
                    const maxTransactionId = Math.max(0, ...currentState.transactions.map(t => t.id || 0));
                    const maxCardId = Math.max(0, ...currentState.cards.map(c => c.id || 0));
                    const maxBudgetId = Math.max(0, ...currentState.budgets.map(b => b.id || 0));
                    
                    // Adicionar transações
                    importedData.transactions.forEach((t, index) => {
                        t.id = maxTransactionId + index + 1;
                        currentState.transactions.push(t);
                    });
                    
                    // Adicionar cartões
                    importedData.cards.forEach((c, index) => {
                        c.id = maxCardId + index + 1;
                        currentState.cards.push(c);
                    });
                    
                    // Adicionar orçamentos
                    importedData.budgets.forEach((b, index) => {
                        b.id = maxBudgetId + index + 1;
                        currentState.budgets.push(b);
                    });
                    
                    setState(currentState);
                    showNotification('Dados mesclados com sucesso!', 'success');
                }
                
                // Atualizar estatísticas
                renderStatistics();
                renderCharts();
                renderCategorySummary();
                
            } catch (error) {
                showNotification('Erro ao importar arquivo: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    };

    // --- NOTIFICATION FUNCTION ---
    const showNotification = (message, type = 'info') => {
        // Remover notificação anterior se existir
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 text-white font-medium`;
        
        if (type === 'success') {
            notification.classList.add('bg-green-500');
        } else if (type === 'error') {
            notification.classList.add('bg-red-500');
        } else {
            notification.classList.add('bg-blue-500');
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remover após 3 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };

    // --- STATISTICS FUNCTIONS ---
    const renderStatistics = () => {
        const state = getState();
        
        // Total de transações
        document.getElementById('total-transactions').textContent = state.transactions.length;
        
        // Total de cartões
        document.getElementById('total-cards').textContent = state.cards.length;
        
        // Total de orçamentos
        document.getElementById('total-budgets').textContent = state.budgets.length;
        
        // Última transação
        const lastTransaction = state.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        
        if (lastTransaction) {
            document.getElementById('last-transaction').textContent = 
                `${lastTransaction.name} - ${formatDate(lastTransaction.date)}`;
        }
    };

    // --- CHART FUNCTIONS ---
    const renderCharts = () => {
        renderMonthlyChart();
        renderTopCategoriesChart();
    };

    const renderMonthlyChart = () => {
        const canvas = document.getElementById('monthly-chart');
        if (!canvas) return;
        
        if (window.monthlyChart) {
            window.monthlyChart.destroy();
        }
        
        const state = getState();
        
        // Se não há transações, não mostrar gráfico
        if (state.transactions.length === 0) {
            canvas.parentElement.innerHTML = '<div class="text-center text-gray-400 py-10">Nenhuma transação encontrada ainda</div>';
            return;
        }
        
        const monthlyData = {};
        
        // Encontrar o intervalo real de dados
        const transactionDates = state.transactions.map(t => new Date(t.date));
        const earliestDate = new Date(Math.min(...transactionDates));
        const latestDate = new Date(Math.max(...transactionDates));
        
        // Criar meses apenas do período onde há dados
        let currentDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
        const endDate = new Date(latestDate.getFullYear(), latestDate.getMonth(), 1);
        
        while (currentDate <= endDate) {
            const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            const monthName = currentDate.toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
            monthlyData[key] = { name: monthName, amount: 0 };
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
        
        // Somar transações de saída
        state.transactions
            .filter(t => t.type === 'outcome')
            .forEach(transaction => {
                const date = new Date(transaction.date);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData[key]) {
                    monthlyData[key].amount += transaction.amount;
                }
            });
        
        // Adicionar gastos dos cartões no mês atual (se houver dados)
        const totalCardUsed = state.cards.reduce((acc, card) => acc + (card.used || 0), 0);
        if (totalCardUsed > 0 && Object.keys(monthlyData).length > 0) {
            // Adicionar no último mês com dados (mais recente)
            const monthKeys = Object.keys(monthlyData).sort();
            const lastMonthKey = monthKeys[monthKeys.length - 1];
            if (monthlyData[lastMonthKey]) {
                monthlyData[lastMonthKey].amount += totalCardUsed;
            }
        }
        
        const labels = Object.values(monthlyData).map(d => d.name);
        const data = Object.values(monthlyData).map(d => d.amount);
        
        const ctx = canvas.getContext('2d');
        window.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos Mensais',
                    data: data,
                    borderColor: '#db2777',
                    backgroundColor: 'rgba(219, 39, 119, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    };

    const renderTopCategoriesChart = () => {
        const canvas = document.getElementById('top-categories-chart');
        if (!canvas) return;
        
        if (window.topCategoriesChart) {
            window.topCategoriesChart.destroy();
        }
        
        const state = getState();
        const categoryTotals = {};
        
        // Somar gastos por categoria
        state.transactions
            .filter(t => t.type === 'outcome')
            .forEach(t => {
                if (!categoryTotals[t.category]) {
                    categoryTotals[t.category] = 0;
                }
                categoryTotals[t.category] += t.amount;
            });
        
        // Adicionar gastos dos cartões como categoria separada
        const totalCardUsed = state.cards.reduce((acc, card) => acc + (card.used || 0), 0);
        if (totalCardUsed > 0) {
            categoryTotals['Cartão de Crédito'] = totalCardUsed;
        }
        
        // Ordenar e pegar top 5
        const sortedCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        // Se não há dados, mostrar mensagem
        if (sortedCategories.length === 0) {
            canvas.parentElement.innerHTML = '<div class="text-center text-gray-400 py-10">Nenhuma transação de saída encontrada</div>';
            return;
        }
        
        const labels = sortedCategories.map(([category]) => category);
        const data = sortedCategories.map(([, amount]) => amount);
        
        const colors = ['#db2777', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
        
        const ctx = canvas.getContext('2d');
        window.topCategoriesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gasto Total',
                    data: data,
                    backgroundColor: colors,
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    };

    // --- CATEGORY SUMMARY TABLE ---
    const renderCategorySummary = () => {
        const state = getState();
        const categoryData = {};
        let totalSpent = 0;
        
        // Processar transações
        state.transactions
            .filter(t => t.type === 'outcome')
            .forEach(t => {
                if (!categoryData[t.category]) {
                    categoryData[t.category] = { total: 0, count: 0 };
                }
                categoryData[t.category].total += t.amount;
                categoryData[t.category].count += 1;
                totalSpent += t.amount;
            });
        
        // Incluir cartões
        const totalCardSpent = state.cards.reduce((acc, card) => acc + (card.used || 0), 0);
        if (totalCardSpent > 0) {
            if (!categoryData['Cartão de Crédito']) {
                categoryData['Cartão de Crédito'] = { total: 0, count: 0 };
            }
            categoryData['Cartão de Crédito'].total += totalCardSpent;
            categoryData['Cartão de Crédito'].count += state.cards.filter(c => c.used > 0).length;
            totalSpent += totalCardSpent;
        }
        
        const tableBody = document.getElementById('category-summary-table');
        tableBody.innerHTML = '';
        
        // Ordenar por valor total
        const sortedCategories = Object.entries(categoryData)
            .sort((a, b) => b[1].total - a[1].total);
        
        sortedCategories.forEach(([category, data]) => {
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-100 hover:bg-gray-50';
            
            const average = data.count > 0 ? data.total / data.count : 0;
            const percentage = totalSpent > 0 ? (data.total / totalSpent) * 100 : 0;
            
            row.innerHTML = `
                <td class="py-3 font-medium text-dark">${category}</td>
                <td class="py-3 text-right font-semibold text-red-500">${formatCurrency(data.total)}</td>
                <td class="py-3 text-right text-gray-600">${data.count}</td>
                <td class="py-3 text-right text-gray-600">${formatCurrency(average)}</td>
                <td class="py-3 text-right font-medium text-primary">${percentage.toFixed(1)}%</td>
            `;
            
            tableBody.appendChild(row);
        });
    };

    // --- EVENT LISTENERS ---
    document.getElementById('export-json-btn').addEventListener('click', exportToJSON);
    document.getElementById('export-excel-btn').addEventListener('click', exportToExcel);
    
    document.getElementById('import-btn').addEventListener('click', () => {
        document.getElementById('import-file-input').click();
    });
    
    document.getElementById('import-file-input').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            importFromFile(file);
        }
    });

    // --- MONTH DISPLAY ---
    const monthElement = document.getElementById('current-month');
    if (monthElement) {
        const date = new Date();
        const monthName = date.toLocaleString('pt-BR', { month: 'long' });
        const year = date.getFullYear();
        monthElement.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    }

    // --- INITIALIZATION ---
    renderStatistics();
    renderCharts();
    renderCategorySummary();
});