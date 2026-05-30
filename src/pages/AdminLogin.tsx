import React, { useState } from 'react';
import { QrCode, Mail, Lock, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function AdminLogin() {
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Firebase Email/Password login is not enabled. Please use Google Login or enable it in console.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้เพิ่มลงในระบบ Firebase Auth');
      } else {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
      }
    }
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError('Google Sign-in failed: ' + err.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans text-slate-800">
      
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-4 border-white flex flex-col h-[800px] max-h-[95vh] relative ring-1 ring-slate-100">
        
        {/* Header */}
        <div className="px-6 py-6 flex items-center justify-center relative bg-white border-b border-slate-100/60 z-10">
          <button onClick={() => navigate('/')} className="absolute left-6 focus:outline-none">
             <svg className="w-6 h-6 text-[#0f2142]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-[19px] font-bold text-[#0f2142]">QR Code ถาวร</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white p-8">
          
          <div className="flex flex-col items-center pt-4 pb-8">
            <div className="w-[84px] h-[84px] bg-[#0055ff] rounded-[24px] flex items-center justify-center text-white shadow-lg mb-6">
               <QrCode className="w-10 h-10" />
            </div>
            <h2 className="text-[22px] font-bold text-[#0f2142]">Admin Login</h2>
            <p className="text-[14px] text-slate-500 mt-1">เข้าสู่ระบบเพื่อจัดการ QR Code</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-6">
            
            <div>
              <label className="block text-[15px] font-bold text-[#0f2142] mb-3">อีเมล</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0055ff] shadow-sm text-[15px] text-[#0f2142] font-medium"
                  required
                />
                <Mail className="w-[20px] h-[20px] text-slate-500 absolute right-4 top-4" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <label className="block text-[15px] font-bold text-[#0f2142] mb-3">รหัสผ่าน</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0055ff] shadow-sm text-[15px] text-[#0f2142] font-medium"
                  required
                />
                <EyeOff className="w-[20px] h-[20px] text-slate-500 absolute right-4 top-4" strokeWidth={1.5} />
              </div>
            </div>

            <div className="flex items-center space-x-2.5 mt-[-4px]">
               <input type="checkbox" id="remember" className="rounded border-slate-300 text-[#0055ff] focus:ring-[#0055ff] w-[18px] h-[18px]" />
               <label htmlFor="remember" className="text-[14px] text-[#0f2142] font-semibold">จำฉันไว้ในระบบ</label>
            </div>

            {error && <div className="text-sm text-red-500 text-center font-medium">{error}</div>}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0055ff] hover:bg-blue-700 text-white rounded-xl py-4 text-[16px] font-bold text-center transition-all mt-2 shadow-md tracking-wide"
            >
              เข้าสู่ระบบด้วย Email
            </button>

            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-slate-200"></div>
              <span className="px-3 text-slate-400 text-xs font-medium">หรือ</span>
              <div className="flex-1 h-px bg-slate-200"></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white border border-slate-300 hover:bg-slate-50 text-[#0f2142] rounded-xl py-4 text-[16px] font-bold text-center transition-all shadow-sm flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
