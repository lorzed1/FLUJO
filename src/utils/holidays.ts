import { addDays, getDay, setYear, setMonth, setDate, format, isSameDay } from 'date-fns';

interface Holiday {
    date: string; // YYYY-MM-DD
    name: string;
}

// Helper to move date to next Monday if needed (Ley Emiliani)
const applyEmiliani = (date: Date): Date => {
    const day = getDay(date);
    if (day === 1) return date; // Already Monday
    // Move to next Monday
    // If today is Tuesday (2), add 6 days? No.
    // If today is Sunday (0), add 1 day.
    // Monday(1) -> 0 diff
    // Tuesday(2) -> 6 days (next mon)
    // Wednesday(3) -> 5 days
    // Thursday(4) -> 4 days
    // Friday(5) -> 3 days
    // Saturday(6) -> 2 days
    // Sunday(0) -> 1 day

    // Formula: (8 - day) % 7.
    // If day is 1 (Mon): (7) % 7 = 0. Correct.
    // If day is 0 (Sun): (8) % 7 = 1. Correct.
    // If day is 2 (Tue): (6) % 7 = 6. Correct.

    // Wait, Ley Emiliani says: "se trasladan al lunes siguiente".
    // If it falls on Sunday, it moves to Monday? YES.
    // If it falls on Monday, it stays? YES.
    // If it falls on Tue-Fri, it moves to NEXT Monday.

    // Simple logic:
    // while day != 1 (Monday), add 1 day.
    let d = new Date(date);
    while (getDay(d) !== 1) {
        d = addDays(d, 1);
    }
    return d;
};

// Easter Calculation (Meeus/Jones/Butcher's Algorithm)
const getEasterDate = (year: number): Date => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
};

export const getColombianHolidays = (year: number): Holiday[] => {
    const holidays: { date: Date, name: string }[] = [];

    // Helper to add fixed date
    const addFixed = (month: number, day: number, name: string) => {
        holidays.push({ date: new Date(year, month - 1, day), name });
    };

    // Helper to add Emiliani date
    const addEmiliani = (month: number, day: number, name: string) => {
        const d = new Date(year, month - 1, day);
        holidays.push({ date: applyEmiliani(d), name });
    };

    // 1. Fixed Holidays (No se mueven)
    addFixed(1, 1, 'Año Nuevo');
    addFixed(5, 1, 'Día del Trabajo');
    addFixed(7, 20, 'Día de la Independencia');
    addFixed(8, 7, 'Batalla de Boyacá');
    addFixed(12, 8, 'Inmaculada Concepción');
    addFixed(12, 25, 'Navidad');

    // 2. Fixed but moved (Emiliani)
    addEmiliani(1, 6, 'Reyes Magos');
    addEmiliani(3, 19, 'San José');
    addEmiliani(6, 29, 'San Pedro y San Pablo');
    addEmiliani(8, 15, 'Asunción de la Virgen');
    addEmiliani(10, 12, 'Día de la Raza');
    addEmiliani(11, 1, 'Todos los Santos');
    addEmiliani(11, 11, 'Independencia de Cartagena');

    // 3. Easter Based
    const easter = getEasterDate(year);

    // Jueves Santo (-3 days) - OJO: En Colombia Jueves y Viernes Santo son FIJOS relativos a pascua, NO se mueven a Lunes.
    holidays.push({ date: addDays(easter, -3), name: 'Jueves Santo' });
    holidays.push({ date: addDays(easter, -2), name: 'Viernes Santo' });

    // Ascensión del Señor (+43 days -> Emiliani)
    // 40 days after Easter is Thursday. Moved to next Monday (+4 days) = 43 days from Easter Sunday? 
    // Wait. Ascension is 40 days after Easter (Thursday). Emiliani moves it to Monday.
    // So 39 days after Easter Sunday is Thursday? No. Sunday + 1 = Mon.
    // Easter + 39 days = Ascension Thursday?
    // Let's use the logic: Calculate the strict date, then apply Emiliani.
    const ascension = addDays(easter, 43); // Traditionally 40th day (Thursday). 43 assumes next Monday?
    // Let's follow strict: Ascension is 39 days AFTER Easter Sunday (Thursday). 
    // Corpus Christi is 60 days after Easter (Thursday).
    // Sagrado Corazon is 68 days after Easter (Friday).

    const rawAscension = addDays(easter, 39); // Thursday
    holidays.push({ date: applyEmiliani(rawAscension), name: 'Ascensión del Señor' });

    const rawCorpus = addDays(easter, 60); // Thursday
    holidays.push({ date: applyEmiliani(rawCorpus), name: 'Corpus Christi' });

    const rawSagrado = addDays(easter, 68); // Friday
    holidays.push({ date: applyEmiliani(rawSagrado), name: 'Sagrado Corazón' });

    return holidays
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(h => ({
            date: format(h.date, 'yyyy-MM-dd'),
            name: h.name
        }));
};
