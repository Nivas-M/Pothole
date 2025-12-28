'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

export default function ReportPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState('');
    const [severity, setSeverity] = useState('medium');

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            return;
        }
        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLoading(false);
            },
            () => {
                setError('Unable to retrieve your location');
                setLoading(false);
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location) {
            setError('Please allow location access to report a pothole.');
            return;
        }

        // Ensure user is logged in (simple anonymous auth or google check could go here)
        let user = auth.currentUser;
        if (!user) {
            try {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                user = result.user;
            } catch (err) {
                setError('Authentication failed. Please login to submit.');
                return;
            }
        }

        setLoading(true);
        try {
            let imageUrl = '';
            if (fileInputRef.current?.files?.[0]) {
                const file = fileInputRef.current.files[0];
                const storageRef = ref(storage, `potholes/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            await addDoc(collection(db, 'reports'), {
                location,
                // Basic geohash would be generated here or cloud function
                severity,
                imageUrl,
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                timestamp: serverTimestamp(),
                status: 'open',
                reportCount: 1, // Initial count
            });

            alert('Report submitted successfully!');
            router.push('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to submit report');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Report a Pothole</h1>

            {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={getLocation}
                            className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition text-sm flex-1"
                        >
                            {location ? `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}` : 'Get Current Location'}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                    <select
                        value={severity}
                        onChange={(e) => setSeverity(e.target.value)}
                        className="w-full border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                    >
                        <option value="low">Low (Minor bump)</option>
                        <option value="medium">Medium (Noticeable)</option>
                        <option value="high">High (Dangerous)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo (Optional)</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Submitting...' : 'Submit Report'}
                </button>
            </form>
        </div>
    );
}
