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
    let weekIndex = 0;
    let lastMonthAdded = -1;

    weeks.forEach((week) => {
        const firstDayOfWeek = week[0];
        const monthOfWeek = firstDayOfWeek.getMonth();

        // Add month label if it's a new month and within our range
        if (monthOfWeek !== lastMonthAdded && monthOfWeek >= startMonth && monthOfWeek < endMonth) {
            const monthLabel = document.createElement('div');
            monthLabel.className = 'calendar-month-label';
            monthLabel.textContent = monthLabels[monthOfWeek];
            monthLabel.style.marginLeft = `${weekIndex * 14}px`;
            monthsContainer.appendChild(monthLabel);
            lastMonthAdded = monthOfWeek;
        }
        weekIndex++;
    });

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
