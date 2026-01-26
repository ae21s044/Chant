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

    // Calculate max chants for color scaling
    const allChants = Object.values(this.yearData);
    const maxChants = Math.max(...allChants, this.dailyTarget);

    // Create calendar grid with 7 rows (one for each weekday)
    const gridContainer = document.getElementById('calendar-grid');
    gridContainer.innerHTML = '';

    const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // For each weekday (row)
    for (let weekday = 0; weekday < 7; weekday++) {
        const row = document.createElement('div');
        row.className = 'calendar-row';

        // Add weekday label
        const label = document.createElement('div');
        label.className = 'calendar-weekday-label';
        label.textContent = weekdayLabels[weekday];
        row.appendChild(label);

        // Create days row container
        const daysRow = document.createElement('div');
        daysRow.className = 'calendar-days-row';

        // For each month in the quarter
        for (let monthOffset = 0; monthOffset < 4; monthOffset++) {
            const monthIndex = startMonth + monthOffset;

            // Add divider before each month (except the first)
            if (monthOffset > 0) {
                const divider = document.createElement('div');
                divider.className = 'month-divider';
                daysRow.appendChild(divider);
            }

            // Get all days in this month that fall on this weekday
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();

            // Calculate which dates in this month fall on this weekday
            let firstDateOnWeekday = 1 + ((weekday - firstDayOfMonth + 7) % 7);
            if (firstDateOnWeekday > daysInMonth) firstDateOnWeekday = null;

            // Find all dates in this month on this weekday
            const datesOnWeekday = [];
            if (firstDateOnWeekday !== null) {
                for (let date = firstDateOnWeekday; date <= daysInMonth; date += 7) {
                    datesOnWeekday.push(date);
                }
            }

            // Determine max number of weeks in any month (usually 5 or 6)
            const maxWeeksInMonth = 6;

            // Create day boxes for this month
            for (let weekInMonth = 0; weekInMonth < maxWeeksInMonth; weekInMonth++) {
                const dayDiv = document.createElement('div');
                dayDiv.className = 'calendar-day';

                if (weekInMonth < datesOnWeekday.length) {
                    const dayNumber = datesOnWeekday[weekInMonth];
                    const date = new Date(year, monthIndex, dayNumber);
                    const dateStr = date.toISOString().split('T')[0];
                    const chants = this.yearData[dateStr] || 0;
                    const isToday = dateStr === this.currentDate;

                    // Display day number
                    dayDiv.textContent = dayNumber;

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
                        dayDiv.classList.add('today');
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
                } else {
                    // Empty cell
                    dayDiv.classList.add('empty');
                }

                daysRow.appendChild(dayDiv);
            }
        }

        row.appendChild(daysRow);
        gridContainer.appendChild(row);
    }
}
