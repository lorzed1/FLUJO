import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDzuoSD5b0lV-55yyZ3plNWy5Ue6FGc48M",
    authDomain: "app-turnos-b82a2.firebaseapp.com",
    projectId: "app-turnos-b82a2",
    storageBucket: "app-turnos-b82a2.firebasestorage.app",
    messagingSenderId: "485759340504",
    appId: "1:485759340504:web:210a62d98cb20d69b2acad",
};

const app = initializeApp(firebaseConfig, "turnos-app");
export const dbTurnos = getFirestore(app);

export const fetchShiftsCountPorFecha = async (startDate: string, endDate: string) => {
    const q = query(collection(dbTurnos, 'shifts'));
    const snapshot = await getDocs(q);

    // Filtramos turnos activos
    const turnosFiltrados = snapshot.docs
        .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
        .filter(s => s.date >= startDate && s.date <= endDate && (!s.type || s.type === 'shift'));

    // Agrupamos contando
    const cuentaPorFecha: Record<string, number> = {};
    for (const turno of turnosFiltrados) {
        if (!cuentaPorFecha[turno.date]) {
            cuentaPorFecha[turno.date] = 0;
        }
        cuentaPorFecha[turno.date]++;
    }
    return cuentaPorFecha;
};
