import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Download, Copy, CheckCircle2, Menu, RotateCcw, AlertCircle, X, Check } from 'lucide-react';
import { generateQRDataUrl, generateQRSvg } from '../lib/qr';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LinkRecord } from '../types';

export default function PublicGenerator() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeItem, setActiveItem] = useState<LinkRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [notification, setNotification] = useState<{show: boolean, type: 'success' | 'error', message: string} | null>(null);
  
  const appUrl = (window as any).env?.APP_URL || window.location.origin;

  const handleCreate = async () => {
    if (!url) return;
    setIsGenerating(true);
    try {
      const newId = Math.random().toString(36).substring(2, 10);
      const now = new Date().toISOString();
      const newItem: LinkRecord = {
        id: newId,
        targetUrl: url,
        name: name || `Public Link ${new Date().toLocaleDateString()}`,
        createdAt: now,
        updatedAt: now,
        clicks: 0
      };

      await setDoc(doc(db, 'links', newId), newItem);
      
      setActiveItem(newItem);
      setNotification({
        show: true,
        type: 'success',
        message: 'สร้าง QR Code สำเร็จ! ข้อมูลถูกบันทึกลงระบบแล้ว'
      });
      
      const shortUrl = `${appUrl}/r/${newItem.id}`;
        const settings = {
          size: 512, margin: 2, errorCorrectionLevel: 'M' as const,
          foregroundColor: '#000000', backgroundColor: '#ffffff'
        };
        
        const pngUrl = await generateQRDataUrl(shortUrl, settings);
        const svgText = await generateQRSvg(shortUrl, settings);
        setQrDataUrl(pngUrl);
        setQrSvg(svgText);
    } catch (err) {
      console.error(err);
      setNotification({
        show: true,
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง'
      });
    }
    setIsGenerating(false);
  };

  const handleReset = () => {
    setName('');
    setUrl('');
    setActiveItem(null);
    setQrDataUrl('');
    setQrSvg('');
  };

  const downloadFile = (format: 'png' | 'svg') => {
    if (!qrDataUrl && !qrSvg) return;
    const a = document.createElement('a');
    const fileName = activeItem?.name || `qrcode-${activeItem?.id || 'new'}`;
    a.download = `${fileName}.${format}`;
    if (format === 'png') {
       a.href = qrDataUrl;
    } else {
       const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
       a.href = URL.createObjectURL(blob);
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyShortLink = () => {
    if (activeItem) {
      navigator.clipboard.writeText(`${appUrl}/r/${activeItem.id}`);
      setNotification({
        show: true,
        type: 'success',
        message: 'คัดลอกลิงก์สั้นเรียบร้อยแล้ว'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-5 flex items-center justify-center bg-white/80 backdrop-blur-md border-b border-slate-100 shrink-0">
        <button 
          onClick={() => navigate('/admin/login')}
          className="absolute left-6 p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
        >
          <Menu className="w-6 h-6" strokeWidth={2.5} />
        </button>
        <h1 className="text-[20px] font-bold text-[#0f2142] tracking-tight">Permanent QR Code</h1>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl mx-auto w-full flex flex-col">
        
        {/* Input Section */}
        <section className="p-6 bg-white shrink-0">
          <div className="mb-4">
            <label className="block text-[15px] font-bold text-[#0f2142] mb-3">ชื่อรายการ</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น เมนูอาหาร, หน้าหลักเว็บ"
              className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-[16px] text-[#0f2142] font-medium placeholder:text-slate-400"
            />
          </div>

          <label className="block text-[15px] font-bold text-[#0f2142] mb-3">Link URL สำหรับสร้าง QR</label>
          <div className="relative mb-5">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.example.com"
              className={`w-full px-5 py-4 rounded-2xl border transition-all ${url ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-slate-50/50'} focus:outline-none focus:ring-2 focus:ring-emerald-500/20 pr-12 text-[16px] text-[#0f2142] font-medium placeholder:text-slate-400`}
            />
            {url && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <CheckCircle2 className="w-[20px] h-[20px] bg-emerald-500 text-white rounded-full border-none shadow-sm" />
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={handleCreate}
              disabled={isGenerating || !url}
              className="flex-1 bg-[#0055ff] hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl py-4 text-[16px] font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
            >
              <QrCode className="w-5 h-5" />
              <span>สร้าง QR Code</span>
            </button>
            
            <button 
              onClick={handleReset}
              className="px-5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-600 rounded-2xl py-4 font-bold transition-all border border-slate-200"
              title="รีเซ็ต"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </section>

        {/* Result Section */}
        <section className="flex-1 px-6 pb-10 w-full flex flex-col">
           <div className="flex-1 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm border-t-4 border-t-blue-500 flex flex-col items-center">
             <div className="w-full text-left font-bold text-[17px] text-[#0f2142] mb-6 flex items-center justify-between">
               <span>QR Code ของคุณ</span>
               {activeItem && <span className="text-[12px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">ID: {activeItem.id}</span>}
             </div>
             
             <div className="flex-1 w-full flex flex-col items-center justify-center py-4">
               {qrDataUrl ? (
                 <div className="relative group">
                   <div className="w-[240px] h-[240px] bg-white border border-slate-100 rounded-[32px] shadow-xl p-5 flex items-center justify-center transition-transform hover:scale-105">
                     <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                   </div>
                 </div>
               ) : (
                 <div className="w-[220px] h-[220px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                   <QrCode className="w-14 h-14 opacity-20 mb-3" />
                   <p className="text-[14px] font-medium leading-relaxed">กรอก URL ด้านบนเพื่อ<br/>เริ่มต้นสร้าง QR Code</p>
                 </div>
               )}
             </div>

             <div className="grid grid-cols-3 gap-3 w-full mt-8">
                <button 
                  onClick={() => downloadFile('png')} 
                  disabled={!qrDataUrl}
                  className="flex flex-col items-center justify-center py-5 px-1 border border-slate-200 rounded-2xl hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-40 transition-all bg-white shadow-sm group"
                >
                  <Download className="w-[22px] h-[22px] mb-2 text-[#0f2142] group-disabled:text-slate-400" strokeWidth={2} />
                  <span className="text-[11px] font-bold text-[#0f2142] group-disabled:text-slate-400">PNG</span>
                </button>
                <button 
                  onClick={() => downloadFile('svg')} 
                  disabled={!qrSvg}
                  className="flex flex-col items-center justify-center py-5 px-1 border border-slate-200 rounded-2xl hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-40 transition-all bg-white shadow-sm group"
                >
                  <Download className="w-[22px] h-[22px] mb-2 text-[#0f2142] group-disabled:text-slate-400" strokeWidth={2} />
                  <span className="text-[11px] font-bold text-[#0f2142] group-disabled:text-slate-400">SVG</span>
                </button>
                <button 
                  onClick={copyShortLink} 
                  disabled={!activeItem}
                  className="flex flex-col items-center justify-center py-5 px-1 border border-slate-200 rounded-2xl hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-40 transition-all bg-white shadow-sm group"
                >
                  <Copy className="w-[22px] h-[22px] mb-2 text-[#0f2142] group-disabled:text-slate-400" strokeWidth={2} />
                  <span className="text-[11px] font-bold text-[#0f2142] group-disabled:text-slate-400">LINK</span>
                </button>
             </div>
           </div>
        </section>
      </main>

      {/* Footer / Branding */}
      <footer className="py-6 text-center shrink-0">
        <p className="text-slate-400 text-[12px] font-medium">© 2026 Permanent QR Code Service</p>
      </footer>

      {/* Global Notifications Overlay */}
      {notification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setNotification(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              {notification.type === 'success' ? (
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-5">
                  <Check className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-5">
                  <AlertCircle className="w-10 h-10" />
                </div>
              )}
              
              <h3 className="text-[20px] font-black text-[#0f2142] mb-2">
                {notification.type === 'success' ? 'ดำเนินการสำเร็จ' : 'เกิดข้อผิดพลาด'}
              </h3>
              <p className="text-[15px] text-slate-500 font-medium leading-relaxed">
                {notification.message}
              </p>
            </div>
            
            <div className="p-4 bg-slate-50/50">
              <button 
                onClick={() => setNotification(null)}
                className="w-full bg-[#0f2142] text-white py-4 rounded-2xl font-black text-[15px] hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
