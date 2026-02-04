class ChantTracker {
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

    constructor() {
        this.dailyTarget = 108; // Default target
        this.targetType = 'daily'; // 'daily', 'monthly', or 'yearly'
        this.monthlyTarget = 3240;
        this.yearlyTarget = 39420;
        this.currentDate = new Date().toISOString().split('T')[0];
        this.yearData = {};
        this.installPrompt = null;

        // Navigation State
        this.currentYear = new Date().getFullYear();
        this.currentMonthStart = 0; // 0-11, starting month index

        // Initialize logic based on view mode
        this.initializeViewMode();

        this.initializeApp();
        this.setupEventListeners();
        this.setupHourlyNotifications(); // Start hourly timer
        this.loadData();
        this.updateDisplay();
        this.renderCalendar();
        this.registerServiceWorker();
        this.setupInstallPrompt();

        // Handle resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    isMobile() {
        return window.innerWidth < 768; // Matches CSS media query
    }

    initializeViewMode() {
        const todayMonth = new Date().getMonth();
        if (this.isMobile()) {
            this.currentMonthStart = todayMonth;
        } else {
            // Desktop: Align to quarter (0, 4, 8)
            this.currentMonthStart = Math.floor(todayMonth / 4) * 4;
        }
    }

    handleResize() {
        const wasMobile = this.lastWasMobile || false;
        const nowMobile = this.isMobile();

        if (wasMobile !== nowMobile) {
            if (nowMobile) {
                // Formatting for Mobile
            } else {
                // Formatting for Desktop -> Align to quarter
                this.currentMonthStart = Math.floor(this.currentMonthStart / 4) * 4;
            }
            this.renderCalendar();
        }
        this.lastWasMobile = nowMobile;
    }

    initializeApp() {
        // Set today's date
        const now = new Date();
        // Request notification permission early if possible, or wait for interaction
        if ('Notification' in window && Notification.permission === 'default') {
            // We'll ask on first user interaction
        }

        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('date-display').textContent = now.toLocaleDateString('en-US', options);
        this.lastWasMobile = this.isMobile();
    }

    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
            const btn = document.getElementById('install-btn');
            if (btn) btn.style.display = 'block';

            if (btn) btn.addEventListener('click', async () => {
                if (!this.installPrompt) return;
                this.installPrompt.prompt();
                const { outcome } = await this.installPrompt.userChoice;
                if (outcome === 'accepted') {
                    btn.style.display = 'none';
                }
                this.installPrompt = null;
            });
        });

        window.addEventListener('appinstalled', () => {
            const btn = document.getElementById('install-btn');
            if (btn) btn.style.display = 'none';
        });
    }

    loadData() {
        const storedData = localStorage.getItem('chantData');
        if (storedData) {
            this.yearData = JSON.parse(storedData);
        }

        const storedTarget = localStorage.getItem('dailyTarget');
        if (storedTarget) {
            this.dailyTarget = parseInt(storedTarget);
            const input = document.getElementById('daily-target-input');
            if (input) input.value = this.dailyTarget;
        }

        const storedTargetType = localStorage.getItem('targetType');
        if (storedTargetType) {
            this.targetType = storedTargetType;
            document.querySelectorAll('.target-type-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.type === this.targetType) {
                    btn.classList.add('active');
                }
            });
            this.showTargetInput(this.targetType);
        }
    }

    saveData() {
        localStorage.setItem('chantData', JSON.stringify(this.yearData));
        this.updateDisplay();
        this.renderCalendar();
        this.updateStats();
    }

    setupEventListeners() {
        document.getElementById('add-chants')?.addEventListener('click', () => {
            // Request notification permission on interaction
            if ('Notification' in window && Notification.permission !== 'granted') {
                Notification.requestPermission();
            }

            const input = document.getElementById('chants-input');
            const val = parseInt(input.value);
            if (val > 0) {
                this.addChants(val);
                input.value = '';
            }
        });

        document.getElementById('reset-today')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset today\'s progress?')) {
                this.yearData[this.currentDate] = 0;
                this.saveData();
                this.showNotification('Today\'s progress reset', 'default');
            }
        });

        // Target type selectors
        document.querySelectorAll('.target-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.target-type-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.targetType = e.target.dataset.type;
                localStorage.setItem('targetType', this.targetType);
                this.showTargetInput(this.targetType);
            });
        });

        // Target inputs
        document.getElementById('daily-target-input')?.addEventListener('input', () => this.calculateTargets());
        document.getElementById('monthly-target-input')?.addEventListener('input', () => this.calculateTargets());
        document.getElementById('yearly-target-input')?.addEventListener('input', () => this.calculateTargets());

        // Save target button
        document.getElementById('save-target')?.addEventListener('click', () => {
            this.saveDailyTarget();
        });

        // Calendar Navigation
        document.getElementById('prev-quarter')?.addEventListener('click', () => {
            const jump = this.isMobile() ? 1 : 4;
            this.currentMonthStart -= jump;
            if (this.currentMonthStart < 0) {
                this.currentYear--;
                this.currentMonthStart += 12;
            }
            this.renderCalendar();
        });

        document.getElementById('next-quarter')?.addEventListener('click', () => {
            const jump = this.isMobile() ? 1 : 4;
            this.currentMonthStart += jump;
            if (this.currentMonthStart >= 12) {
                this.currentYear++;
                this.currentMonthStart -= 12;
            }
            this.renderCalendar();
        });

        // Navigation Menu
        const nav = document.getElementById('side-nav');
        const overlay = document.getElementById('nav-overlay');
        const openBtn = document.getElementById('menu-toggle');
        const closeBtn = document.getElementById('close-nav');

        function toggleNav() {
            if (nav && overlay) {
                nav.classList.toggle('open');
                overlay.classList.toggle('show');
            }
        }

        if (openBtn) openBtn.addEventListener('click', toggleNav);
        if (closeBtn) closeBtn.addEventListener('click', toggleNav);
        if (overlay) overlay.addEventListener('click', toggleNav);

        document.getElementById('test-notify-btn')?.addEventListener('click', async () => {
            if (!('Notification' in window)) {
                alert('This browser does not support notifications.');
                return;
            }

            if (Notification.permission !== 'granted') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert('Permission denied. Please enable notifications in your browser settings.');
                    return;
                }
            }

            new Notification("🔔 It Works!", {
                body: "This is how your hourly updates will look. Keep the app open!",
                icon: 'icon.png' // Ensure icon exists or fallback
            });
        });
    }

    showTargetInput(type) {
        if (!document.getElementById('daily-target-group')) return;
        document.getElementById('daily-target-group').style.display = 'none';
        document.getElementById('monthly-target-group').style.display = 'none';
        document.getElementById('yearly-target-group').style.display = 'none';
        document.getElementById(`${type}-target-group`).style.display = 'flex';
        this.calculateTargets();
    }

    calculateTargets() {
        let daily = 0;
        if (this.targetType === 'daily') {
            const input = document.getElementById('daily-target-input');
            daily = input ? (parseInt(input.value) || 0) : 0;
        } else if (this.targetType === 'monthly') {
            const input = document.getElementById('monthly-target-input');
            const val = input ? (parseInt(input.value) || 0) : 0;
            daily = Math.ceil(val / 30);
        } else if (this.targetType === 'yearly') {
            const input = document.getElementById('yearly-target-input');
            const val = input ? (parseInt(input.value) || 0) : 0;
            daily = Math.ceil(val / 365);
        }
        this.showCalculatedTargets(daily);
    }

    addChants(count) {
        if (!this.yearData[this.currentDate]) {
            this.yearData[this.currentDate] = 0;
        }

        const previousTotal = this.yearData[this.currentDate];
        this.yearData[this.currentDate] += count;
        const newTotal = this.yearData[this.currentDate];

        this.saveData();
        this.showNotification(`Added ${count} chants!`, 'success');

        // Check for achievements and send Notification
        this.checkAndNotifyProgress(previousTotal, newTotal);
    }

    checkAndNotifyProgress(prev, current) {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        const target = this.dailyTarget;
        const prevPct = (prev / target) * 100;
        const currPct = (current / target) * 100;

        // Notify on crossing 100%
        if (prevPct < 100 && currPct >= 100) {
            new Notification("🎉 Target Achieved!", {
                body: `Congratulations! You've completed your daily target of ${target} chants.`,
                icon: 'icon.png' // Fallback if no icon
            });
        }
        // Notify on significant milestones (50%, 150%, 200%)
        else if (Math.floor(prevPct / 50) < Math.floor(currPct / 50)) {
            const milestone = Math.floor(currPct / 50) * 50;
            new Notification("📈 Progress Update", {
                body: `You've reached ${milestone}% of your daily target! Keep going!`,
            });
        }
    }

    saveDailyTarget() {
        let newTarget = 0;
        if (this.targetType === 'daily') {
            newTarget = parseInt(document.getElementById('daily-target-input').value);
        } else if (this.targetType === 'monthly') {
            const monthly = parseInt(document.getElementById('monthly-target-input').value);
            newTarget = Math.ceil(monthly / 30);
        } else if (this.targetType === 'yearly') {
            const yearly = parseInt(document.getElementById('yearly-target-input').value);
            newTarget = Math.ceil(yearly / 365);
        }

        if (newTarget && newTarget > 0) {
            this.dailyTarget = newTarget;
            localStorage.setItem('dailyTarget', this.dailyTarget);
            this.updateDisplay();
            this.renderCalendar();
            this.showNotification('Target updated successfully!', 'success');
        } else {
            this.showNotification('Please enter a valid target number', 'error');
        }
    }

    showCalculatedTargets(dailyVal) {
        const daily = dailyVal;
        const monthly = daily * 30;
        const yearly = daily * 365;
        if (document.getElementById('calc-daily')) {
            document.getElementById('calc-daily').textContent = daily.toLocaleString();
            document.getElementById('calc-monthly').textContent = monthly.toLocaleString();
            document.getElementById('calc-yearly').textContent = yearly.toLocaleString();
        }
    }

    updateDisplay() {
        const todayCount = this.yearData[this.currentDate] || 0;
        const rawPercentage = Math.round((todayCount / this.dailyTarget) * 100);
        const visualPercentage = Math.min(100, rawPercentage);

        const countElem = document.getElementById('today-count');
        const fillElem = document.getElementById('progress-fill');
        const textElem = document.getElementById('progress-text');
        const targetElem = document.getElementById('daily-target');

        if (countElem) countElem.textContent = todayCount.toLocaleString();
        if (fillElem) fillElem.style.width = `${visualPercentage}%`;
        if (textElem) textElem.textContent = `${rawPercentage}%`;
        if (targetElem) targetElem.textContent = this.dailyTarget.toLocaleString();
    }

    updateStats() {
        const total = Object.values(this.yearData).reduce((a, b) => a + b, 0);
        const totalElem = document.getElementById('total-chants');
        if (totalElem) totalElem.textContent = total.toLocaleString();

        const daysCompleted = Object.values(this.yearData).filter(count => count >= this.dailyTarget).length;
        const completedElem = document.getElementById('days-completed');
        if (completedElem) completedElem.textContent = daysCompleted.toLocaleString();

        const startOfYear = new Date(this.currentYear, 0, 1);
        const today = new Date();
        const daysSoFar = Math.ceil((today - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
        const rate = Math.round((daysCompleted / Math.max(1, daysSoFar)) * 100);

        const rateElem = document.getElementById('completion-rate');
        if (rateElem) rateElem.textContent = `${rate}%`;
    }

    renderCalendar() {
        const year = this.currentYear;
        const titleElem = document.getElementById('calendar-year-title');
        if (titleElem) titleElem.textContent = year;

        const isMobile = this.isMobile();
        const monthsToShow = isMobile ? 1 : 4;

        const prevBtn = document.getElementById('prev-quarter');
        const nextBtn = document.getElementById('next-quarter');
        if (prevBtn) {
            prevBtn.disabled = false;
            prevBtn.innerHTML = isMobile ? '&larr; Previous' : '&larr; Previous';
        }
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.innerHTML = isMobile ? 'Next &rarr;' : 'Next &rarr;';
        }

        const monthsContainer = document.getElementById('calendar-months');
        if (!monthsContainer) return;
        monthsContainer.innerHTML = '';

        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = 0; i < monthsToShow; i++) {
            const monthIndex = this.currentMonthStart + i;
            if (monthIndex < 12) {
                const monthLabel = document.createElement('div');
                monthLabel.className = 'calendar-month-label';
                monthLabel.textContent = monthLabels[monthIndex];
                monthsContainer.appendChild(monthLabel);
            }
        }

        const allChants = Object.values(this.yearData);
        const maxChants = Math.max(...allChants, this.dailyTarget);

        const gridContainer = document.getElementById('calendar-grid');
        if (!gridContainer) return;
        gridContainer.innerHTML = '';

        const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        for (let weekday = 0; weekday < 7; weekday++) {
            const row = document.createElement('div');
            row.className = 'calendar-row';
            const label = document.createElement('div');
            label.className = 'calendar-weekday-label';
            label.textContent = weekdayLabels[weekday];
            row.appendChild(label);

            const daysRow = document.createElement('div');
            daysRow.className = 'calendar-days-row';

            for (let monthOffset = 0; monthOffset < monthsToShow; monthOffset++) {
                const monthIndex = this.currentMonthStart + monthOffset;
                if (monthIndex >= 12) continue;
                if (monthOffset > 0) {
                    const divider = document.createElement('div');
                    divider.className = 'month-divider';
                    daysRow.appendChild(divider);
                }

                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
                const maxWeeksInMonth = 6;

                for (let weekIdx = 0; weekIdx < maxWeeksInMonth; weekIdx++) {
                    const dayDiv = document.createElement('div');
                    dayDiv.className = 'calendar-day';
                    const dateVal = (weekIdx * 7) + weekday - firstDayOfMonth + 1;

                    if (dateVal > 0 && dateVal <= daysInMonth) {
                        const date = new Date(year, monthIndex, dateVal);
                        const dateStr = date.toISOString().split('T')[0];
                        const chants = this.yearData[dateStr] || 0;
                        const isToday = dateStr === this.currentDate;

                        dayDiv.textContent = dateVal;
                        let heatLevel = 0;
                        if (chants > 0) {
                            const percentage = (chants / maxChants) * 100;
                            if (percentage >= 100) heatLevel = 5;
                            else if (percentage >= 80) heatLevel = 4;
                            else if (percentage >= 60) heatLevel = 3;
                            else if (percentage >= 40) heatLevel = 2;
                            else heatLevel = 1; // Ensure any progress shows at least the first shade
                        }
                        dayDiv.style.background = `var(--heat-${heatLevel})`;
                        if (isToday) dayDiv.classList.add('today');

                        dayDiv.addEventListener('mouseenter', (e) => this.showTooltip(e, date, chants));
                        dayDiv.addEventListener('mouseleave', () => this.hideTooltip());
                        dayDiv.addEventListener('mousemove', (e) => this.updateTooltipPosition(e));
                    } else {
                        dayDiv.classList.add('empty');
                    }
                    daysRow.appendChild(dayDiv);
                }
            }
            row.appendChild(daysRow);
            gridContainer.appendChild(row);
        }
    }

    showTooltip(event, date, chants) {
        const tooltip = document.getElementById('calendar-tooltip');
        if (!tooltip) return;
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        let message = `${chants} chants on ${dateStr}`;
        if (chants >= this.dailyTarget) message += ' ✓';
        tooltip.textContent = message;
        tooltip.classList.add('show');
        this.updateTooltipPosition(event);
    }
    hideTooltip() {
        const tooltip = document.getElementById('calendar-tooltip');
        if (tooltip) tooltip.classList.remove('show');
    }
    updateTooltipPosition(event) {
        const tooltip = document.getElementById('calendar-tooltip');
        if (tooltip) {
            const padding = 10;
            const tooltipRect = tooltip.getBoundingClientRect();

            // Initial position (right of cursor)
            let left = event.clientX + padding;
            let top = event.clientY - 30;

            // Check if tooltip goes off the right edge of the viewport
            if (left + tooltipRect.width > window.innerWidth) {
                // Flip to left of cursor
                left = event.clientX - tooltipRect.width - padding;
            }

            // Ensure it doesn't go off the left edge
            if (left < 0) left = padding;

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }
    }
    getDaysInYear() {
        const year = this.currentYear;
        return ((year % 4 === 0 && year % 100 > 0) || year % 400 === 0) ? 366 : 365;
    }
    showNotification(message, type = 'default', duration = 3000) {
        const notification = document.getElementById('notification');
        if (!notification) return;
        notification.textContent = message;
        notification.className = 'notification';
        if (type === 'success') notification.classList.add('success');
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), duration);
    }

    setupHourlyNotifications() {
        setInterval(() => {
            if (Notification.permission === 'granted') {
                const todayCount = this.yearData[this.currentDate] || 0;
                const pct = Math.round((todayCount / this.dailyTarget) * 100);

                new Notification("⏳ Hourly Check-in", {
                    body: `You've completed ${pct}% of your daily target (${todayCount}/${this.dailyTarget}). Keep going! 🕉️`,
                    icon: 'icon.png',
                    tag: 'hourly-update'
                });
            }
        }, 60 * 60 * 1000);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ChantTracker();
    if ('Notification' in window && Notification.permission === 'default') {
        // Notification.requestPermission(); // Move to interaction or here
    }
});
