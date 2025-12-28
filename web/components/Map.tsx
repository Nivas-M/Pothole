'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import MapContainer and other Leaflet components to avoid SSR issues
const MapContainer = dynamic(
    () => import('react-leaflet').then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import('react-leaflet').then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import('react-leaflet').then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import('react-leaflet').then((mod) => mod.Popup),
    { ssr: false }
);

export default function Map() {
    const [isMounted, setIsMounted] = useState(false);
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        setIsMounted(true);
        // Fix for Leaflet default icon issues in Next.js/Webpack
        (async () => {
            const L = (await import('leaflet')).default;
            // @ts-ignore
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
            });
        })();
    }, []);

    useEffect(() => {
        // Dynamically import firebase only on client to avoid huge bundle or SSR issues
        // better yet, standard import if we are sure it's client-side (use 'use client')
        const fetchReports = async () => {
            const { db } = await import('@/lib/firebase');
            const { collection, onSnapshot, query } = await import('firebase/firestore');

            const q = query(collection(db, "reports"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setReports(data);
            });
            return () => unsubscribe();
        };

        if (isMounted) {
            fetchReports();
        }
    }, [isMounted]);

    if (!isMounted) {
        return <div className="h-[calc(100vh-64px)] w-full flex items-center justify-center bg-gray-100">Loading Map...</div>;
    }

    return (
        <div className="h-[calc(100vh-64px)] w-full relative z-0">
            <MapContainer
                center={[28.6139, 77.2090] as [number, number]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {reports.map((report) => (
                    report.location && (
                        <Marker key={report.id} position={[report.location.lat, report.location.lng] as [number, number]}>
                            <Popup>
                                <div className="text-sm">
                                    <h3 className="font-bold">{report.severity.toUpperCase()} Severity</h3>
                                    <p>Reported by: {report.userName}</p>
                                    <p className="text-xs text-gray-500">{new Date(report.timestamp?.seconds * 1000).toLocaleDateString()}</p>
                                    {report.imageUrl && <img src={report.imageUrl} alt="Pothole" className="mt-2 h-20 w-full object-cover rounded" />}
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
}
