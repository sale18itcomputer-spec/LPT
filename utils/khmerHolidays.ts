export interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
    description: string;
}

// Data for 2024 and 2025. In a real-world app, this would come from an API.
export const khmerHolidays: Holiday[] = [
    // 2024
    { date: '2024-01-01', name: 'International New Year\'s Day', description: 'Celebrates the first day of the Gregorian calendar.' },
    { date: '2024-01-07', name: 'Victory Day over Genocide', description: 'Commemorates the end of the Khmer Rouge regime in 1979.' },
    { date: '2024-03-08', name: 'International Women\'s Day', description: 'Celebrates the social, economic, cultural, and political achievements of women.' },
    { date: '2024-04-13', name: 'Khmer New Year (Day 1)', description: 'The first day of the traditional Cambodian New Year celebration, known as Maha Sangkran.' },
    { date: '2024-04-14', name: 'Khmer New Year (Day 2)', description: 'The second day of Khmer New Year, known as Virak Vanabat.' },
    { date: '2024-04-15', name: 'Khmer New Year (Day 3)', description: 'The third day of Khmer New Year, known as Vearak Loeng Sak.' },
    { date: '2024-04-16', name: 'Khmer New Year Holiday', description: 'An additional public holiday for the New Year celebrations.' },
    { date: '2024-05-01', name: 'International Labour Day', description: 'Celebrates the achievements of workers.' },
    { date: '2024-05-14', name: 'King Sihamoni\'s Birthday', description: 'Celebrates the birthday of His Majesty King Norodom Sihamoni.' },
    { date: '2024-05-22', name: 'Visak Bochea Day', description: 'An important Buddhist holiday commemorating the birth, enlightenment, and death of the Buddha.' },
    { date: '2024-05-26', name: 'Royal Ploughing Ceremony', description: 'An ancient royal rite held to mark the traditional start of the rice-growing season.' },
    { date: '2024-06-18', name: 'Queen Mother\'s Birthday', description: 'Celebrates the birthday of Her Majesty Queen Mother Norodom Monineath Sihanouk.' },
    { date: '2024-09-24', name: 'Constitution Day', description: 'Marks the signing of the Cambodian Constitution in 1993.' },
    { date: '2024-10-01', name: 'Pchum Ben (Day 1)', description: 'The first day of the most important Cambodian religious festival, dedicated to honoring ancestors.' },
    { date: '2024-10-02', name: 'Pchum Ben (Day 2)', description: 'The main day of Pchum Ben, where families visit pagodas to make offerings.' },
    { date: '2024-10-03', name: 'Pchum Ben (Day 3)', description: 'The final day of the Pchum Ben festival.' },
    { date: '2024-10-15', name: 'Commemoration Day of King\'s Father', description: 'Commemorates the late King Father Norodom Sihanouk.' },
    { date: '2024-10-29', name: 'King\'s Coronation Day', description: 'Celebrates the anniversary of King Norodom Sihamoni\'s coronation.' },
    { date: '2024-11-09', name: 'Independence Day', description: 'Celebrates Cambodia\'s independence from France in 1953.' },
    { date: '2024-11-14', name: 'Water Festival (Day 1)', description: 'The first day of the Bon Om Touk festival, celebrating the end of the rainy season.' },
    { date: '2024-11-15', name: 'Water Festival (Day 2)', description: 'The second day of the Water Festival, featuring boat races.' },
    { date: '2024-11-16', name: 'Water Festival (Day 3)', description: 'The final day of the Water Festival celebrations.' },

    // 2025
    { date: '2025-01-01', name: 'International New Year\'s Day', description: 'Celebrates the first day of the Gregorian calendar.' },
    { date: '2025-01-07', name: 'Victory Day over Genocide', description: 'Commemorates the end of the Khmer Rouge regime in 1979.' },
    { date: '2025-03-08', name: 'International Women\'s Day', description: 'Celebrates the social, economic, cultural, and political achievements of women.' },
    { date: '2025-04-14', name: 'Khmer New Year (Day 1)', description: 'The first day of the traditional Cambodian New Year celebration.' },
    { date: '2025-04-15', name: 'Khmer New Year (Day 2)', description: 'The second day of Khmer New Year.' },
    { date: '2025-04-16', name: 'Khmer New Year (Day 3)', description: 'The third day of Khmer New Year.' },
    { date: '2025-05-01', name: 'International Labour Day', description: 'Celebrates the achievements of workers.' },
    { date: '2025-05-11', name: 'Visak Bochea Day', description: 'An important Buddhist holiday.' },
    { date: '2025-05-14', name: 'King Sihamoni\'s Birthday', description: 'Celebrates the birthday of His Majesty King Norodom Sihamoni.' },
    { date: '2025-05-15', name: 'Royal Ploughing Ceremony', description: 'Marks the traditional start of the rice-growing season.' },
    { date: '2025-06-18', name: 'Queen Mother\'s Birthday', description: 'Celebrates the birthday of Her Majesty Queen Mother Norodom Monineath Sihanouk.' },
    { date: '2025-09-21', name: 'Pchum Ben Festival', description: 'The main day of the Pchum Ben religious festival.' },
    { date: '2025-09-24', name: 'Constitution Day', description: 'Marks the signing of the Cambodian Constitution in 1993.' },
    { date: '2025-10-15', name: 'Commemoration Day of King\'s Father', description: 'Commemorates the late King Father Norodom Sihanouk.' },
    { date: '2025-10-29', name: 'King\'s Coronation Day', description: 'Celebrates the anniversary of King Norodom Sihamoni\'s coronation.' },
    { date: '2025-11-03', name: 'Water Festival', description: 'The main day of the Bon Om Touk festival.' },
    { date: '2025-11-09', name: 'Independence Day', description: 'Celebrates Cambodia\'s independence from France in 1953.' },
];
