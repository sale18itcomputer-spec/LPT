

/**
 * Gets the ISO week of the year for a given date.
 * Per ISO 8601, week 1 is the first week with a Thursday in it.
 */
export const getISOWeek = (date: Date): number => {
    // Copy date so don't modify original
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    // Get first day of year
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    // Calculate full weeks to nearest Thursday
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

export const getCalendarMonth = (year: number, month: number): Date[][] => {
    const startDate = new Date(Date.UTC(year, month, 1));
    const endDate = new Date(Date.UTC(year, month + 1, 0));
    const startDayOfWeek = startDate.getUTCDay(); // 0 (Sun) - 6 (Sat)
    const totalDays = endDate.getUTCDate();

    const dates: Date[] = [];

    // Add dates from previous month
    for (let i = startDayOfWeek; i > 0; i--) {
        const d = new Date(startDate);
        d.setUTCDate(d.getUTCDate() - i);
        dates.push(d);
    }

    // Add dates from current month
    for (let i = 1; i <= totalDays; i++) {
        dates.push(new Date(Date.UTC(year, month, i)));
    }

    // Add dates from next month to fill the grid (6 weeks total)
    const remaining = 42 - dates.length; 
    for (let i = 1; i <= remaining; i++) {
        const d = new Date(endDate);
        d.setUTCDate(d.getUTCDate() + i);
        dates.push(d);
    }

    // Split into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < dates.length; i += 7) {
        weeks.push(dates.slice(i, i + 7));
    }

    return weeks;
};

export const getDateRangeForPreset = (preset: 'today' | 'last7' | 'last30' | 'last90'): { startDate: string, endDate: string } => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(today);
    let startDate = new Date(today);

    switch (preset) {
        case 'today':
            // Start and end are the same day
            break;
        case 'last7':
            startDate.setUTCDate(today.getUTCDate() - 6);
            break;
        case 'last30':
            startDate.setUTCDate(today.getUTCDate() - 29);
            break;
        case 'last90':
            startDate.setUTCDate(today.getUTCDate() - 89);
            break;
    }

    return {
        startDate: toYYYYMMDD(startDate),
        endDate: toYYYYMMDD(endDate),
    };
};

export const getCurrentDateParts = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
    return { year: String(year), quarter: `Q${quarter}` as const };
};

export const getLastQuarter = () => {
    const now = new Date();
    let year = now.getUTCFullYear();
    let quarter = Math.floor(now.getUTCMonth() / 3); // 0-indexed quarter

    if (quarter === 0) { // If in Q1
        quarter = 4; // Last quarter is Q4
        year -= 1; // of the previous year
    }
    
    return { year: String(year), quarter: `Q${quarter}` as const };
};

export const toYYYYMMDD = (d: Date) => {
    // Use UTC to prevent timezone issues with ISO string
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
