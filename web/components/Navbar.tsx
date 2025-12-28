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
        <nav className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
            <Link href="/" className="text-2xl font-bold text-blue-600">
                PotholeGuard
            </Link>
            <div className="space-x-4 flex items-center">
                <Link href="/report" className="text-gray-600 hover:text-blue-600 font-medium">
                    Report
                </Link>
                <Link href="/admin" className="text-gray-600 hover:text-blue-600 font-medium">
                    Admin
                </Link>
                {user ? (
                    <div className="flex items-center gap-3">
                        {user.photoURL && <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full" />}
                        <button onClick={handleLogout} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                            Logout
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Login
                    </button>
                )}
            </div>
        </nav>
    );
}
