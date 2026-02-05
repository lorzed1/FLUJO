import { db } from './firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    writeBatch
} from 'firebase/firestore';
import { SalesEvent, SalesProjection } from '../types';

const COLLECTIONS = {
    EVENTS: 'sales_events',
    PROJECTIONS: 'sales_projections'
};

export const projectionsService = {
    // ==========================================
    // Sales Events (Calendario Comercial)
    // ==========================================

    async getEvents(startDate?: string, endDate?: string): Promise<SalesEvent[]> {
        try {
            let q = query(collection(db, COLLECTIONS.EVENTS), orderBy('date', 'asc'));

            if (startDate && endDate) {
                q = query(
                    collection(db, COLLECTIONS.EVENTS),
                    where('date', '>=', startDate),
                    where('date', '<=', endDate),
                    orderBy('date', 'asc')
                );
            }

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as SalesEvent));
        } catch (error) {
            console.error('Error fetching events:', error);
            throw error;
        }
    },

    async addEvent(event: Omit<SalesEvent, 'id'>): Promise<string> {
        try {
            const newDocRef = doc(collection(db, COLLECTIONS.EVENTS));
            await setDoc(newDocRef, {
                ...event,
                id: newDocRef.id, // Ensure ID is in the doc data if needed, or rely on doc.id
                createdAt: Timestamp.now()
            });
            return newDocRef.id;
        } catch (error) {
            console.error('Error adding event:', error);
            throw error;
        }
    },

    async updateEvent(id: string, updates: Partial<SalesEvent>): Promise<void> {
        try {
            const docRef = doc(db, COLLECTIONS.EVENTS, id);
            await updateDoc(docRef, {
                ...updates
                // removed updatedAt since it's not in the interface, but could be added
            });
        } catch (error) {
            console.error('Error updating event:', error);
            throw error;
        }
    },

    async deleteEvent(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, COLLECTIONS.EVENTS, id));
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    },

    // ==========================================
    // Sales Projections (Metas Diarias)
    // ==========================================

    /**
     * Get a specific projection by date (ID = date YYYY-MM-DD)
     */
    async getProjection(date: string): Promise<SalesProjection | null> {
        try {
            const docRef = doc(db, COLLECTIONS.PROJECTIONS, date);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                return snapshot.data() as SalesProjection;
            }
            return null;
        } catch (error) {
            console.error(`Error fetching projection for ${date}:`, error);
            throw error;
        }
    },

    async getProjectionsRange(startDate: string, endDate: string): Promise<SalesProjection[]> {
        try {
            // Since ID is date, we can't easily range query on ID primarily without a field. 
            // Better to allow querying on a 'date' field inside the doc as well.
            // My types say 'date' is a field. So we can query it.
            const q = query(
                collection(db, COLLECTIONS.PROJECTIONS),
                where('date', '>=', startDate),
                where('date', '<=', endDate),
                orderBy('date', 'asc')
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(d => d.data() as SalesProjection);
        } catch (error) {
            console.error('Error fetching projections range:', error);
            throw error;
        }
    },

    async saveProjection(projection: SalesProjection): Promise<void> {
        try {
            // Upsert: ID is the date
            const docRef = doc(db, COLLECTIONS.PROJECTIONS, projection.date);
            await setDoc(docRef, {
                ...projection,
                lastUpdated: Timestamp.now()
            });
        } catch (error) {
            console.error('Error saving projection:', error);
            throw error;
        }
    },

    async saveProjectionsBatch(projections: SalesProjection[]): Promise<void> {
        try {
            const batch = writeBatch(db);

            projections.forEach(p => {
                const docRef = doc(db, COLLECTIONS.PROJECTIONS, p.date);
                batch.set(docRef, {
                    ...p,
                    lastUpdated: Timestamp.now()
                });
            });

            await batch.commit();
        } catch (error) {
            console.error('Error batch saving projections:', error);
            throw error;
        }
    }
};
