'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface Report {
    id: string;
    location: { lat: number; lng: number };
    severity: string;
    imageUrl?: string;
    status: string;
    timestamp: any;
    userName: string;
    reportCount?: number;
}

export default function AdminPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Basic Auth Check
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                // In a real app, you'd redirect to login or show access denied
                // For MVP demo, limits might be looser, but let's encourage login
                // router.push('/report'); // Redirect to report/login if needed
            }
        });

        // Real-time listener for reports
        const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
        const unsubscribeDocs = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Report[];
            setReports(msgs);
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeDocs();
        };
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            const reportRef = doc(db, 'reports', id);
            await updateDoc(reportRef, { status: newStatus });
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        }
    };

    const openMap = (lat: number, lng: number) => {
        window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center">Loading Dashboard...</div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-100 uppercase text-gray-600 text-xs leading-normal">
                            <tr>
                                <th className="py-3 px-6 text-left">Status</th>
                                <th className="py-3 px-6 text-left">Severity</th>
                                <th className="py-3 px-6 text-left">Location</th>
                                <th className="py-3 px-6 text-left">Image</th>
                                <th className="py-3 px-6 text-left">Reported By</th>
                                <th className="py-3 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-600 text-sm font-light">
                            {reports.map((report) => (
                                <tr key={report.id} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 text-left whitespace-nowrap">
                                        <span className={`py-1 px-3 rounded-full text-xs 
                      ${report.status === 'fixed' ? 'bg-green-200 text-green-600' :
                                                report.status === 'open' ? 'bg-red-200 text-red-600' : 'bg-yellow-200 text-yellow-600'}`}>
                                            {report.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 text-left">
                                        <span className={`font-medium 
                      ${report.severity === 'high' ? 'text-red-600' :
                                                report.severity === 'medium' ? 'text-orange-500' : 'text-blue-500'}`}>
                                            {report.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 text-left">
                                        <button
                                            onClick={() => openMap(report.location.lat, report.location.lng)}
                                            className="text-blue-500 hover:underline"
                                        >
                                            View Map
                                        </button>
                                        <div className="text-xs text-gray-400">
                                            {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-left">
                                        {report.imageUrl ? (
                                            <a href={report.imageUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={report.imageUrl} alt="Pothole" className="h-10 w-10 object-cover rounded hover:scale-150 transition" />
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">No Image</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-6 text-left">
                                        {report.userName}
                                        <div className="text-xs text-gray-400">
                                            {report.timestamp?.seconds ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                        </div>
                                    </td>
                                    <td className="py-3 px-6 text-center">
                                        <div className="flex item-center justify-center gap-2">
                                            {report.status !== 'fixed' && (
                                                <button
                                                    onClick={() => updateStatus(report.id, 'fixed')}
                                                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-xs"
                                                >
                                                    Mark Fixed
                                                </button>
                                            )}
                                            {report.status === 'fixed' && (
                                                <button
                                                    onClick={() => updateStatus(report.id, 'open')}
                                                    className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 text-xs"
                                                >
                                                    Reopen
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center">No reports found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
