class ChantTracker {
    constructor() {
        this.dailyTarget = 108; // Default target
        this.targetType = 'daily'; // 'daily', 'monthly', or 'yearly'
        this.monthlyTarget = 3240;
        this.yearlyTarget = 39420;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.yearData = {};
        this.installPrompt = null;
        this.currentCalendarMonth = new Date();
        this.currentQuarter = 0; // 0 = Jan-Apr, 1 = May-Aug, 2 = Sep-Dec

        this.initializeApp();
        this.setupEventListeners();
        this.loadData();
        this.updateDisplay();
        this.renderCalendar();
        this.registerServiceWorker();
        this.setupInstallPrompt();
    }

    initializeApp() {
        // Set today's date
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', options);

        // Set current year
        this.currentYear = now.getFullYear();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('sw.js');
                console.log('Service Worker registered');
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            document.getElementById('install-btn').style.display = 'block';

            document.getElementById('install-btn').addEventListener('click', async () => {
                if (!this.installPrompt) return;

                this.installPrompt.prompt();
                const { outcome } = await this.installPrompt.userChoice;

                if (outcome === 'accepted') {
                    this.showNotification('App installed successfully!', 'success');
                    document.getElementById('install-btn').style.display = 'none';
                }

                this.installPrompt = null;
            });
        });
    }

    loadData() {
        // Load target type
        const savedTargetType = localStorage.getItem('chantTargetType');
        if (savedTargetType) {
            this.targetType = savedTargetType;
        }

        // Load targets
        const savedDailyTarget = localStorage.getItem('chantDailyTarget');
        if (savedDailyTarget) {
            this.dailyTarget = parseInt(savedDailyTarget);
        }

        const savedMonthlyTarget = localStorage.getItem('chantMonthlyTarget');
        if (savedMonthlyTarget) {
            this.monthlyTarget = parseInt(savedMonthlyTarget);
        }

        const savedYearlyTarget = localStorage.getItem('chantYearlyTarget');
        if (savedYearlyTarget) {
            this.yearlyTarget = parseInt(savedYearlyTarget);
        }

        // Load year data
        const savedYearData = localStorage.getItem(`chantYearData_${this.currentYear}`);
        if (savedYearData) {
            this.yearData = JSON.parse(savedYearData);
        }

        // Initialize today's data if not exists
        if (!this.yearData[this.currentDate]) {
            this.yearData[this.currentDate] = 0;
        }

        // Set active target type button
        document.querySelectorAll('.target-type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === this.targetType) {
                btn.classList.add('active');
            }
        });

        // Show appropriate input group
        this.showTargetInput(this.targetType);
    }

    saveData() {
        localStorage.setItem('chantTargetType', this.targetType);
        localStorage.setItem('chantDailyTarget', this.dailyTarget.toString());
        localStorage.setItem('chantMonthlyTarget', this.monthlyTarget.toString());
        localStorage.setItem('chantYearlyTarget', this.yearlyTarget.toString());
        localStorage.setItem(`chantYearData_${this.currentYear}`, JSON.stringify(this.yearData));
    }

    setupEventListeners() {
        // Target type selector
        document.querySelectorAll('.target-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.target-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.targetType = btn.dataset.type;
                this.showTargetInput(this.targetType);
            });
        });

        // Add chants button
        document.getElementById('add-chants').addEventListener('click', () => {
            this.addChants();
        });

        // Enter key in input
        document.getElementById('chants-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addChants();
            }
        });

        // Reset today button
        document.getElementById('reset-today').addEventListener('click', () => {
            if (confirm('Reset today\'s count to zero?')) {
                this.yearData[this.currentDate] = 0;
                this.saveData();
                this.updateDisplay();
                this.renderCalendar();
                this.showNotification('Today\'s count reset');
            }
        });

        // Save target button
        document.getElementById('save-target').addEventListener('click', () => {
            this.saveDailyTarget();
        });

        // Quarter navigation
        document.getElementById('prev-quarter').addEventListener('click', () => {
            if (this.currentQuarter > 0) {
                this.currentQuarter--;
                this.renderCalendar();
            }
        });

        document.getElementById('next-quarter').addEventListener('click', () => {
            if (this.currentQuarter < 2) {
                this.currentQuarter++;
                this.renderCalendar();
            }
        });
    }

    showTargetInput(type) {
        // Hide all input groups
        document.getElementById('daily-target-group').style.display = 'none';
        document.getElementById('monthly-target-group').style.display = 'none';
        document.getElementById('yearly-target-group').style.display = 'none';

        // Show selected input group
        if (type === 'daily') {
            document.getElementById('daily-target-group').style.display = 'flex';
            document.getElementById('daily-target-input').value = this.dailyTarget;
        } else if (type === 'monthly') {
            document.getElementById('monthly-target-group').style.display = 'flex';
            document.getElementById('monthly-target-input').value = this.monthlyTarget;
        } else if (type === 'yearly') {
            document.getElementById('yearly-target-group').style.display = 'flex';
            document.getElementById('yearly-target-input').value = this.yearlyTarget;
        }
    }

    calculateTargets() {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysInYear = this.getDaysInYear();

        if (this.targetType === 'daily') {
            this.monthlyTarget = this.dailyTarget * daysInMonth;
            this.yearlyTarget = this.dailyTarget * daysInYear;
        } else if (this.targetType === 'monthly') {
            this.dailyTarget = Math.ceil(this.monthlyTarget / daysInMonth);
            this.yearlyTarget = this.monthlyTarget * 12;
        } else if (this.targetType === 'yearly') {
            this.monthlyTarget = Math.ceil(this.yearlyTarget / 12);
            this.dailyTarget = Math.ceil(this.yearlyTarget / daysInYear);
        }
    }

    addChants() {
        const input = document.getElementById('chants-input');
        const value = parseInt(input.value);

        if (isNaN(value) || value <= 0) {
            this.showNotification('Please enter a valid number');
            return;
        }

        this.yearData[this.currentDate] = (this.yearData[this.currentDate] || 0) + value;
        this.saveData();
        this.updateDisplay();
        this.renderCalendar();

        // Check if target is reached
        const todayCount = this.yearData[this.currentDate];
        if (todayCount >= this.dailyTarget) {
            this.showNotification(`🎉 Target achieved! ${todayCount} chants completed today!`, 'success');
        } else {
            const remaining = this.dailyTarget - todayCount;
            this.showNotification(`Added ${value} chants. ${remaining} remaining today.`);
        }

        input.value = '';
        input.focus();
    }

    saveDailyTarget() {
        let value;

        if (this.targetType === 'daily') {
            const input = document.getElementById('daily-target-input');
            value = parseInt(input.value);
            if (isNaN(value) || value < 1) {
                this.showNotification('Please enter a valid target (minimum 1)');
                return;
            }
            this.dailyTarget = value;
        } else if (this.targetType === 'monthly') {
            const input = document.getElementById('monthly-target-input');
            value = parseInt(input.value);
            if (isNaN(value) || value < 1) {
                this.showNotification('Please enter a valid target (minimum 1)');
                return;
            }
            this.monthlyTarget = value;
        } else if (this.targetType === 'yearly') {
            const input = document.getElementById('yearly-target-input');
            value = parseInt(input.value);
            if (isNaN(value) || value < 1) {
                this.showNotification('Please enter a valid target (minimum 1)');
                return;
            }
            this.yearlyTarget = value;
        }

        this.calculateTargets();
        this.saveData();
        this.updateDisplay();
        this.showCalculatedTargets();
        this.showNotification(`Target updated successfully!`, 'success');
    }

    showCalculatedTargets() {
        const container = document.getElementById('calculated-targets');
        const breakdown = document.getElementById('target-breakdown');

        let html = '';
        if (this.targetType === 'yearly') {
            html = `
                <p style="margin: 5px 0;"><strong>Yearly:</strong> ${this.yearlyTarget.toLocaleString()} chants</p>
                <p style="margin: 5px 0;"><strong>Monthly:</strong> ${this.monthlyTarget.toLocaleString()} chants</p>
                <p style="margin: 5px 0;"><strong>Daily:</strong> ${this.dailyTarget.toLocaleString()} chants</p>
            `;
        } else if (this.targetType === 'monthly') {
            html = `
                <p style="margin: 5px 0;"><strong>Monthly:</strong> ${this.monthlyTarget.toLocaleString()} chants</p>
                <p style="margin: 5px 0;"><strong>Daily:</strong> ${this.dailyTarget.toLocaleString()} chants</p>
            `;
        }

        if (html) {
            breakdown.innerHTML = html;
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    }

    updateDisplay() {
        // Update daily target display
        document.getElementById('daily-target').textContent = this.dailyTarget;

        // Update today's progress
        const todayCount = this.yearData[this.currentDate] || 0;
        const percentage = Math.min((todayCount / this.dailyTarget) * 100, 100);

        document.getElementById('progress-text').textContent =
            `${todayCount} / ${this.dailyTarget}`;
        document.getElementById('progress-fill').style.width = `${percentage}%`;

        // Update chants input placeholder
        const remaining = Math.max(0, this.dailyTarget - todayCount);
        document.getElementById('chants-input').placeholder =
            remaining > 0 ? `${remaining} remaining today` : "Target achieved!";

        // Update stats
        this.updateStats();

        // Update recent days
        this.updateRecentDays();

        // Show calculated targets if not daily
        if (this.targetType !== 'daily') {
            this.showCalculatedTargets();
        }
    }

    updateStats() {
        const days = Object.keys(this.yearData);
        const totalChants = days.reduce((sum, date) => sum + this.yearData[date], 0);
        const daysCompleted = days.filter(date => this.yearData[date] >= this.dailyTarget).length;
        const totalDaysThisYear = this.getDaysInYear();
        const completionRate = Math.round((daysCompleted / totalDaysThisYear) * 100);

        document.getElementById('total-chants').textContent = totalChants.toLocaleString();
        document.getElementById('days-completed').textContent = daysCompleted;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;
    }

    updateRecentDays() {
        const recentDaysContainer = document.getElementById('recent-days');
        const days = Object.keys(this.yearData)
            .sort()
            .reverse()
            .slice(0, 7);

        recentDaysContainer.innerHTML = days.map(date => {
            const count = this.yearData[date];
            const dateObj = new Date(date + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                weekday: 'short'
            });

            const isToday = date === this.currentDate;
            const isCompleted = count >= this.dailyTarget;

            return `
                <div class="day-item" style="border-left-color: ${isCompleted ? 'var(--green)' : isToday ? 'var(--saffron)' : 'var(--text-light)'}">
                    <span class="day-date">${formattedDate} ${isToday ? '(Today)' : ''}</span>
                    <span class="day-count">${count} chants</span>
                </div>
            `;
        }).join('');
    }

    renderCalendar() {
        const year = this.currentYear;

        // Update year title and navigation buttons
        document.getElementById('calendar-year-title').textContent = year;

        // Determine which 4 months to show based on currentQuarter
        const startMonth = this.currentQuarter * 4; // 0, 4, or 8
        const endMonth = startMonth + 4; // 4, 8, or 12

        // Update navigation button states
        document.getElementById('prev-quarter').disabled = this.currentQuarter === 0;
        document.getElementById('next-quarter').disabled = this.currentQuarter === 2;

        // Get date range for the 4 months
        const startDate = new Date(year, startMonth, 1);
        const endDate = new Date(year, endMonth, 0); // Last day of the 4th month

        // Find the first Sunday before or on the start date
        const firstDay = new Date(startDate);
        firstDay.setDate(firstDay.getDate() - firstDay.getDay());

        // Find the last Saturday after or on the end date
        const lastDay = new Date(endDate);
        lastDay.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

        // Calculate all weeks
        const weeks = [];
        let currentWeek = [];
        let currentDate = new Date(firstDay);

        while (currentDate <= lastDay) {
            currentWeek.push(new Date(currentDate));

            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Calculate max chants for color scaling
        const allDates = weeks.flat();
        const allChants = allDates.map(date => {
            const dateStr = date.toISOString().split('T')[0];
            return this.yearData[dateStr] || 0;
        });
        const maxChants = Math.max(...allChants, this.dailyTarget);

        // Render month labels
        const monthsContainer = document.getElementById('calendar-months');
        monthsContainer.innerHTML = '';

        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        // Show all 4 months for this quarter evenly distributed
        for (let i = 0; i < 4; i++) {
            const monthIndex = startMonth + i;
            const monthLabel = document.createElement('div');
            monthLabel.className = 'calendar-month-label';
            monthLabel.textContent = monthLabels[monthIndex];
            monthsContainer.appendChild(monthLabel);
        }

        // Render weeks with month dividers
        const weeksContainer = document.getElementById('calendar-weeks');
        weeksContainer.innerHTML = '';

        let previousMonth = -1;

        weeks.forEach((week, weekIdx) => {
            const firstDayOfWeek = week[0];
            const monthOfWeek = firstDayOfWeek.getMonth();

            // Add divider when month changes (except for the first week)
            if (weekIdx > 0 && monthOfWeek !== previousMonth && monthOfWeek >= startMonth && monthOfWeek < endMonth) {
                const divider = document.createElement('div');
                divider.className = 'month-divider';
                weeksContainer.appendChild(divider);
            }

            previousMonth = monthOfWeek;

            const weekColumn = document.createElement('div');
            weekColumn.className = 'calendar-week';

            week.forEach(date => {
                const dateStr = date.toISOString().split('T')[0];
                const chants = this.yearData[dateStr] || 0;
                const dateMonth = date.getMonth();
                const isInRange = dateMonth >= startMonth && dateMonth < endMonth;
                const isToday = dateStr === this.currentDate;

                const dayDiv = document.createElement('div');
                dayDiv.className = 'calendar-day';

                if (!isInRange) {
                    dayDiv.classList.add('empty');
                } else {
                    // Calculate heat level (0-5)
                    let heatLevel = 0;
                    if (chants > 0) {
                        const percentage = (chants / maxChants) * 100;
                        if (percentage >= 100) heatLevel = 5;
                        else if (percentage >= 80) heatLevel = 4;
                        else if (percentage >= 60) heatLevel = 3;
                        else if (percentage >= 40) heatLevel = 2;
                        else if (percentage >= 20) heatLevel = 1;
                    }

                    dayDiv.style.background = `var(--heat-${heatLevel})`;

                    if (isToday) {
                        dayDiv.style.outline = '2px solid var(--saffron-dark)';
                        dayDiv.style.outlineOffset = '0px';
                    }

                    // Add tooltip on hover
                    dayDiv.addEventListener('mouseenter', (e) => {
                        this.showTooltip(e, date, chants);
                    });

                    dayDiv.addEventListener('mouseleave', () => {
                        this.hideTooltip();
                    });

                    dayDiv.addEventListener('mousemove', (e) => {
                        this.updateTooltipPosition(e);
                    });
                }

                weekColumn.appendChild(dayDiv);
            });

            weeksContainer.appendChild(weekColumn);
        });
    }

    showTooltip(event, date, chants) {
        const tooltip = document.getElementById('calendar-tooltip');
        const dateStr = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        let message = `${chants} chants on ${dateStr}`;
        if (chants >= this.dailyTarget) {
            message += ' ✓';
        }

        tooltip.textContent = message;
        tooltip.classList.add('show');
        this.updateTooltipPosition(event);
    }

    hideTooltip() {
        const tooltip = document.getElementById('calendar-tooltip');
        tooltip.classList.remove('show');
    }

    updateTooltipPosition(event) {
        const tooltip = document.getElementById('calendar-tooltip');
        tooltip.style.left = `${event.clientX + 10}px`;
        tooltip.style.top = `${event.clientY - 30}px`;
    }

    getDaysInYear() {
        const year = this.currentYear;
        return ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;
    }

    showNotification(message, type = 'default', duration = 3000) {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = 'notification';
        if (type === 'success') {
            notification.classList.add('success');
        }
        notification.classList.add('show');

        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChantTracker();

    // Enable notifications
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});