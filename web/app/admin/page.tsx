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

    const handleStatusChange = async (id: string, newStatus: string) => {
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
        <div className="container mx-auto p-6 max-w-6xl">
            <h1 className="text-3xl font-extrabold mb-8 text-slate-100">Admin Dashboard</h1>

            <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700">
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold">Severity</th>
                                <th className="p-4 font-semibold">Location</th>
                                <th className="p-4 font-semibold">Image</th>
                                <th className="p-4 font-semibold">Reported By</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {reports.map((report) => (
                                <tr key={report.id} className="hover:bg-slate-700/20 transition-colors group">
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                                            ${report.status === 'open'
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`
                                        }>
                                            {report.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`font-semibold
                                            ${report.severity === 'high' ? 'text-red-400' :
                                                report.severity === 'medium' ? 'text-orange-400' : 'text-yellow-400'}`
                                        }>
                                            {report.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-300 text-sm">
                                        {report.location ? (
                                            <a
                                                href={`https://www.openstreetmap.org/?mlat=${report.location.lat}&mlon=${report.location.lng}#map=18/${report.location.lat}/${report.location.lng}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                                            >
                                                View Map ↗
                                            </a>
                                        ) : 'N/A'}
                                        <div className="text-xs text-slate-500 mt-1 font-mono">
                                            {report.location?.lat.toFixed(4)}, {report.location?.lng.toFixed(4)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {report.imageUrl ? (
                                            <a href={report.imageUrl} target="_blank" rel="noopener noreferrer">
                                                <img
                                                    src={report.imageUrl}
                                                    alt="Evidence"
                                                    className="w-16 h-12 object-cover rounded-lg border border-slate-700 hover:scale-150 transition-transform origin-center bg-slate-900"
                                                />
                                            </a>
                                        ) : <span className="text-slate-600 text-xs italic">No Image</span>}
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-300 text-sm font-medium">{report.userName}</div>
                                        <div className="text-xs text-slate-500">
                                            {report.timestamp ? new Date(report.timestamp.seconds * 1000).toLocaleDateString() : 'Unknown'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right space-x-2">
                                        {report.status === 'open' ? (
                                            <button
                                                onClick={() => handleStatusChange(report.id, 'fixed')}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-lg shadow-emerald-500/20"
                                            >
                                                Mark Fixed
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleStatusChange(report.id, 'open')}
                                                className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                                            >
                                                Reopen
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-4 text-center text-slate-500 italic">No reports found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
