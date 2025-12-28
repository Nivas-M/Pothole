import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Helper to calculate distance (Haversine)
const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const onReportCreate = functions.firestore
    .document('reports/{reportId}')
    .onCreate(async (snap, context) => {
        const newData = snap.data();
        const { location, id } = newData;

        if (!location) return;

        // Check for existing reports within 20m
        const reportsRef = db.collection('reports');
        // In a real app, use Geohashing for query efficiency
        // For MVP, we'll query recent reports manually or all open reports (careful with scale)
        const snapshot = await reportsRef.where('status', '==', 'open').get();

        let duplicateFound = false;
        let existingDocId = '';
        let currentCount = 1;

        for (const doc of snapshot.docs) {
            if (doc.id === context.params.reportId) continue; // Skip self

            const data = doc.data();
            if (data.location) {
                const dist = getDist(location.lat, location.lng, data.location.lat, data.location.lng);
                if (dist < 20) { // 20 meters radius
                    duplicateFound = true;
                    existingDocId = doc.id;
                    currentCount = (data.reportCount || 1) + 1;
                    break;
                }
            }
        }

        if (duplicateFound) {
            console.log(`Duplicate found! Merging with ${existingDocId}`);

            // Determine new severity
            let newSeverity = 'low';
            if (currentCount >= 6) newSeverity = 'high';
            else if (currentCount >= 3) newSeverity = 'medium';

            // Update existing report
            await reportsRef.doc(existingDocId).update({
                reportCount: currentCount,
                severity: newSeverity,
                lastReported: admin.firestore.FieldValue.serverTimestamp()
            });

            // Delete the new duplicate report
            await reportsRef.doc(context.params.reportId).delete();
        }
    });
