'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed", error);
            alert("Login failed. Check console for details.");
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 p-4 flex justify-between items-center sticky top-0 z-50">
            <Link href="/" className="text-2xl font-bold text-blue-400">
                Promet
            </Link>
            <div className="space-x-4 flex items-center">
                <Link href="/report" className="text-slate-300 hover:text-white font-medium transition-colors">
                    Report
                </Link>
                <Link href="/admin" className="text-slate-300 hover:text-white font-medium transition-colors">
                    Admin
                </Link>
                {user ? (
                    <div className="flex items-center gap-3">
                        {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-slate-600" />}
                        <button onClick={handleLogout} className="bg-slate-800 text-slate-200 px-4 py-2 rounded-lg hover:bg-slate-700 transition-all border border-slate-700 text-sm">
                            Logout
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 transition-all font-medium text-sm">
                        Login
                    </button>
                )}
            </div>
        </nav>
    );
}
