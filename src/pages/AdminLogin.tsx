import React, { useState } from 'react';
import { QrCode, Mail, Lock, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { signInWithEmailAndPassword } from 'firebase/auth';
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
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้เพิ่มลงในระบบ Firebase Auth');
      } else {
        setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
      }
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
              เข้าสู่ระบบ
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
