/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, LogIn } from 'lucide-react';
import { BRAND_NAME } from '../constants';
import { auth, googleProvider, db } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { EmployeeRole } from '../types';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (user) {
        const empRef = doc(db, 'employees', user.uid);
        const empSnap = await getDoc(empRef);

        if (!empSnap.exists()) {
          const isAdmin = user.email === 'revathiinfrad@gmail.com';
          await setDoc(empRef, {
            employeeId: `EMP-${user.uid.substring(0, 5).toUpperCase()}`,
            username: user.email?.split('@')[0] || 'user',
            name: user.displayName || '',
            email: user.email,
            role: isAdmin ? EmployeeRole.ADMIN : EmployeeRole.STAFF,
            photoUrl: user.photoURL || null
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-700/50"
      >
        <div className="p-10">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Revathi<span className="text-blue-600 italic font-light ml-1">Portal</span>
            </h1>
            <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-[0.2em] font-bold">Secure Infrastructure Access</p>
          </div>

          <div className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                {error}
              </motion.div>
            )}

            <div className="text-center space-y-4">
              <p className="text-slate-500 text-xs leading-relaxed">
                Authorized personnel only. Please authenticate using your corporate Google credentials to access the internal management portal.
              </p>

              <button
                disabled={isLoading}
                onClick={handleGoogleLogin}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-70 text-xs uppercase tracking-widest"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-6 flex items-center justify-between border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-mono">ID: SEC-PX-2024</p>
          <div className="flex gap-4">
             <span className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer transition-colors font-bold uppercase tracking-tighter">Support</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
