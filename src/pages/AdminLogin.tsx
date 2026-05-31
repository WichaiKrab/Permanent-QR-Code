import React, { useState } from 'react';
import { QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) {
        throw new Error('Email not found from Google account');
      }

      // Check if user is super admin or in admins collection
      const superAdminEmail = 'Wsritangkum@gmail.com';
      const isSuperAdmin = user.email.toLowerCase() === superAdminEmail.toLowerCase();
      
      let isAdmin = isSuperAdmin;
      if (!isSuperAdmin) {
        const adminDoc = await getDoc(doc(db, 'admins', user.email));
        if (adminDoc.exists()) {
          isAdmin = true;
        }
      }

      if (isAdmin) {
        navigate('/admin/dashboard');
      } else {
        await auth.signOut();
        setError('อีเมลของคุณไม่มีสิทธิ์เข้าถึงระบบผู้ดูแล โปรดติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์');
      }
    } catch (err: any) {
      if (err.code === 'auth/unauthorized-domain') {
        setError('เเจ้งเตือนโดเมนไม่ได้รับอนุญาต: โปรดเพิ่มโดเมนของแอปนี้ใน Firebase Console (Authentication > Settings > Authorized domains)');
      } else {
        setError('Google Sign-in failed: ' + err.message);
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-5 flex items-center justify-center bg-white border-b border-slate-100 shrink-0">
        <button onClick={() => navigate('/')} className="absolute left-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
           <svg className="w-6 h-6 text-[#0f2142]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-[20px] font-bold text-[#0f2142] tracking-tight text-center">Admin Login</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full px-6 flex flex-col justify-center pb-20">
        
        <div className="flex flex-col items-center pt-4 pb-10">
          <div className="w-[100px] h-[100px] bg-gradient-to-br from-[#0055ff] to-blue-600 rounded-[32px] flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
             <QrCode className="w-12 h-12" />
          </div>
          <h2 className="text-[28px] font-bold text-[#0f2142] mb-3">เข้าสู่ระบบผู้ดูแล</h2>
          <p className="text-[16px] text-slate-500 text-center leading-relaxed font-medium">ยืนยันตัวตนด้วย Google เพื่อดูแลจัดการระบบ QR Code</p>
        </div>

        <div className="flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 border border-red-100 text-sm text-red-600 p-4 rounded-2xl text-center font-bold animate-shake">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white border-2 border-slate-200 hover:border-[#0055ff] hover:bg-blue-50/50 active:scale-[0.98] text-[#0f2142] rounded-2xl py-5 text-[18px] font-bold transition-all flex items-center justify-center space-x-4 shadow-sm group"
            >
              <svg className="w-8 h-8 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}</span>
            </button>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-slate-400 text-[13px] font-bold">
        © 2026 Permanent QR Code Admin Panel
      </footer>
    </div>
  );
}
