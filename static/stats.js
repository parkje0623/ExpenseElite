let incomeChart, expenseChart, comparisonChart;
let earliestDate, latestDate;

document.addEventListener("DOMContentLoaded", function() {
    incomeChart = new Chart(document.getElementById('incomeChart').getContext('2d'), createChartConfig([]));
    expenseChart = new Chart(document.getElementById('expenseChart').getContext('2d'), createChartConfig([]));
    comparisonChart = new Chart(document.getElementById('comparisonChart').getContext('2d'), createLineChartConfig([], [], [], 'monthly'));

    updateChart('income');
    updateChart('expense');
    updateChart('comparison');

    const now = new Date();
    document.getElementById('current-income-date').innerHTML = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
    document.getElementById('current-expense-date').innerHTML = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
    document.getElementById('current-comparison-date').innerHTML = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);

    fetchDateRange();
});

function createChartConfig(data) {
    return {
        type: 'pie',
        data: {
            labels: data.map(d => d.category),
            datasets: [{
                data: data.map(d => d.amount),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true
                }
            }
        }
    };
}

function createLineChartConfig(labels, incomeData, expenseData, period) {
    return {
        type: 'line',
        data: {
            labels: labels, // X-axis labels
            datasets: [
                {
                    label: 'Income', // Label for the dataset 1
                    data: incomeData, // Data points
                    fill: false,
                    borderColor: 'rgb(75, 192, 192)', // Line color
                    tension: 0.1
                },
                {
                    label: 'Expense', // Label for the dataset 2
                    data: expenseData, // Data points
                    fill: false,
                    borderColor: 'rgb(255, 99, 132)', // Line color
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: period
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            }
        }
    };
}


function updateChart(type) {
    updateCurrentDate(type);
    const period = document.getElementById(`${type}-period`).value;
    let startDate, endDate;

    if (period === 'custom') {
        // Clear Chart (initially) if Custom Period selected
        if (type === 'comparison') {
            comparisonChart.destroy();
            document.getElementById('comparison-select-x-axis').style.display = "block";
            const detailsList = document.getElementById('comparison-details');
            detailsList.innerHTML = '';
        } else {
            const chart = type === 'income' ? incomeChart : expenseChart;
            chart.data.labels = []; // Clear label
            chart.data.datasets[0].data = []; // Clear data
            chart.update();
            updateDetailsList(type, []);
        }

        document.getElementById(`${type}-custom-period`).classList.remove('d-none');
        startDate = document.getElementById(`${type}-start-date`).value;
        endDate = document.getElementById(`${type}-end-date`).value;
        document.getElementById(`${type}-navigation`).style.display = "none";
    } else {
        document.getElementById(`${type}-custom-period`).classList.add('d-none');
        // handle monthly or yearly data fetching
        startDate = getStartDate(period, type);
        endDate = getEndDate(period, type);

        if (period === 'entirely') {
            document.getElementById('comparison-navigation').style.display = "none";
        } else {
            document.getElementById(`${type}-navigation`).style.display = "block";
        }
    }

    if (startDate && endDate) {
        fetchData(type, startDate, endDate).then(data => {
            if (type !== 'comparison') {
                updateChartData(type === 'income' ? incomeChart : expenseChart, data);
                updateDetailsList(type, data);
                const chart = type === 'income' ? incomeChart : expenseChart;
                chart.resize();
            } else {
                // Destroy existing Canvas Chart, then create a new one
                comparisonChart.destroy();
                updateLineChartData(comparisonChart, data, period);
            }
        });
    }
}

function getStartDate(period, type) {
    const now = getCurrentDate(type);
    if (period === 'monthly') {
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (period === 'yearly') {
        return new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    } else if (period === 'entirely') {
        return earliestDate.toISOString().slice(0, 10);
    }
}

function getEndDate(period, type) {
    const now = getCurrentDate(type);
    if (period === 'monthly') {
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    } else if (period === 'yearly') {
        return new Date(now.getFullYear(), 11, 31).toISOString().slice(0, 10);
    } else if (period === 'entirely') {
        return latestDate.toISOString().slice(0, 10);
    }
}

function updateCurrentDate(type) {
    const period = document.getElementById(`${type}-period`).value;
    const currentDateElement = document.getElementById(`current-${type}-date`).innerHTML;
    if (period === 'monthly') {
        if (currentDateElement.length < 5) {
            const now = new Date();
            document.getElementById(`current-${type}-date`).innerHTML = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 7);
        } else {
            document.getElementById(`current-${type}-date`).innerHTML = currentDateElement.slice(0, 7);
        }
    } else if (period === 'yearly') {
        document.getElementById(`current-${type}-date`).innerHTML = currentDateElement.slice(0, 4);
    }
}

function getCurrentDate(type) {
    const period = document.getElementById(`${type}-period`).value;
    const currentDateElement = document.getElementById(`current-${type}-date`);
    let currentDate;
    if (period === 'monthly') {
        const [year, month] = currentDateElement.innerHTML.split('-').map(Number);
        currentDate = new Date(year, month - 1, 1);
    } else if (period === 'yearly') {
        const year = Number(currentDateElement.innerHTML);
        currentDate = new Date(year, 0, 1);
    }
    return currentDate;
}

// Fetch the earliest and latest dates from the server
function fetchDateRange() {
    fetch('/getDateRange')
        .then(response => response.json())
        .then(data => {
            earliestDate = new Date(data.earliestDate);
            latestDate = new Date(data.latestDate);
        });
}


function fetchData(type, startDate, endDate) {
    return fetch(`/stats/${type}_data?start_date=${startDate}&end_date=${endDate}`)
        .then(response => response.json())
        .then(data => {
            return data.map(item => {
                if (type !== 'comparison') {
                    return {
                        category: item.category_name,
                        amount: parseFloat(item.amount)
                    };
                }
                else {
                    return {
                        category: item.category_name,
                        amount: parseFloat(item.amount),
                        type: item.type,
                        date: item.date
                    };
                };
            });
        })
        .catch(error => {
            console.log('Error fetching income/expense data: ', error);
        });
}

// Update Pie Chart
function updateChartData(chart, data) {
    chart.data.labels = data.map(d => d.category);
    chart.data.datasets[0].data = data.map(d => d.amount);
    chart.update();
}
// Update Line Chart Data
function updateLineChartData(chart, data, period) {
    let labels = [];
    let incomeData = [];
    let expenseData = [];
    let period_x_label = '';
    let data_period = period;

    if (data_period === 'custom') {
        data_period = document.getElementById('comparison-x-axis').value;
    } else {
        document.getElementById('comparison-select-x-axis').style.display = "none";
    }

    if (data_period === 'monthly') {
        // Extract daily labels and data points
        let dailyData = {};
        data.forEach(item => {
            const date = new Date(item.date).toISOString().slice(5, 10);
            // Add new data point if the date is not in array yet
            if (!dailyData[date]) {
                dailyData[date] = { income: 0, expense: 0 };
            }

            if (item.type === 'income') {
                dailyData[date].income += item.amount;
            } else if (item.type === 'expense') {
                dailyData[date].expense += item.amount;
            }
        });

        // Sort data and push into label data array for the line graph
        labels = Object.keys(dailyData).sort((a, b) => a - b);
        labels.forEach(label => {
            incomeData.push(dailyData[label].income);
            expenseData.push(dailyData[label].expense);
        });
        period_x_label = 'Days';
    } else if (data_period === 'yearly') {
        // Extract monthly labels and data points
        let monthlyData = {};
        data.forEach(item => {
            const month = new Date(item.date).toISOString().slice(0, 7);
            // Add new data point if the date is not in array yet
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expense: 0 };
            }
            if (item.type === 'income') {
                monthlyData[month].income += item.amount;
            } else if (item.type === 'expense') {
                monthlyData[month].expense += item.amount;
            }
        });

        // Sort data and push into label data array for the line graph
        labels = Object.keys(monthlyData).sort();
        labels.forEach(label => {
            incomeData.push(monthlyData[label].income);
            expenseData.push(monthlyData[label].expense);
        });
        period_x_label = 'Months';
    } else if (data_period === 'entirely') {
        // Extract yearly labels and data points
        let yearlyData = {};
        data.forEach(item => {
            const year = new Date(item.date).toISOString().slice(0, 4);
            // Add new data point if the date is not in array yet
            if (!yearlyData[year]) {
                yearlyData[year] = { income: 0, expense: 0 };
            }
            if (item.type === 'income') {
                yearlyData[year].income += item.amount;
            } else if (item.type === 'expense') {
                yearlyData[year].expense += item.amount;
            }
        });

        // Sort data and push into label data array for the line graph
        labels = Object.keys(yearlyData).sort();
        labels.forEach(label => {
            incomeData.push(yearlyData[label].income);
            expenseData.push(yearlyData[label].expense);
        });
        period_x_label = 'Years';
    }

    // Add Text Details for the graph
    const detailsList = document.getElementById('comparison-details');
    detailsList.innerHTML = '';
    let final_total = 0;
    for (let i = 0; i < labels.length; i++) {
        const li = document.createElement('li');
        const total = incomeData[i] - expenseData[i];
        final_total += total;
        li.textContent = `${labels[i]}: Income: ${incomeData[i]}, Expense: ${expenseData[i]}, Total: ${total}`;
        detailsList.appendChild(li);
    }
    // Final Total
    const li = document.createElement('li');
    li.textContent = `Total Income: ${incomeData.reduce((sum, item) => sum + item, 0)},
                        Total Expense: ${expenseData.reduce((sum, item) => sum + item, 0)},
                        Total: ${final_total}`;
    detailsList.appendChild(li);

    // Create a new chart
    comparisonChart = new Chart(document.getElementById('comparisonChart').getContext('2d'), createLineChartConfig(labels, incomeData, expenseData, period_x_label));
}

function updateDetailsList(type, data) {
    const detailsList = document.getElementById(`${type}-details`);
    detailsList.innerHTML = '';

    if (Object.keys(data).length != 0) {
        const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
        data.forEach(item => {
            const li = document.createElement('li');
            const percentage = totalAmount ? ((item.amount / totalAmount) * 100).toFixed(2) : 0;
            li.textContent = `${item.category}: $${item.amount} (${percentage}%)`;
            detailsList.appendChild(li);
        });
    } else {
        const li = document.createElement('li');
        li.textContent = `No ${type} to be displayed`;
        detailsList.appendChild(li);
    }

}

function changePeriod(type, direction) {
    const currentDate = getCurrentDate(type);
    const period = document.getElementById(`${type}-period`).value;
    const currentDateElement = document.getElementById(`current-${type}-date`);

    if (period === 'monthly') {
        if (direction === 'previous') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else if (direction === 'next') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        }
    } else if (period === 'yearly') {
        if (direction === 'previous') {
            currentDate.setFullYear(currentDate.getFullYear() - 1);
        } else if (direction === 'next') {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
    }

    if (period !== 'entirely') {
        currentDateElement.innerHTML = period === 'monthly'
            ? currentDate.toISOString().slice(0, 7)
            : currentDate.getFullYear();
    }

    updateChart(type);
}
