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
        <div className="max-w-md mx-auto mt-10 p-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl shadow-xl">
            <h1 className="text-3xl font-extrabold mb-8 text-center text-slate-100">Report to Promet</h1>

            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={getLocation}
                            className={`w-full py-3 rounded-xl transition-all font-medium text-sm flex items-center justify-center gap-2
                                ${location
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}
                            `}
                        >
                            {location ? (
                                <>📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</>
                            ) : (
                                <>🌍 Get Current Location</>
                            )}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Severity</label>
                    <div className="relative">
                        <select
                            value={severity}
                            onChange={(e) => setSeverity(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none transition-all"
                        >
                            <option value="low">🟡 Low (Minor bump)</option>
                            <option value="medium">🟠 Medium (Noticeable)</option>
                            <option value="high">🔴 High (Dangerous)</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                            ▼
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Photo (Optional)</label>
                    <label className="block w-full cursor-pointer bg-slate-900 border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-xl p-4 text-center transition-all group">
                        <span className="text-slate-400 group-hover:text-blue-400 text-sm">Click to upload image</span>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            className="hidden"
                            onChange={() => {
                                // Optional: add logic to show preview or file name
                            }}
                        />
                    </label>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Processing...
                        </span>
                    ) : 'Submit Report'}
                </button>
            </form>
        </div>
    );
}
