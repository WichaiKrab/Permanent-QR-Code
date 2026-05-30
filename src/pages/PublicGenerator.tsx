import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Download, Copy, CheckCircle2, Menu } from 'lucide-react';
import { generateQRDataUrl, generateQRSvg } from '../lib/qr';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LinkRecord } from '../types';

export default function PublicGenerator() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeItem, setActiveItem] = useState<LinkRecord | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  
  const appUrl = (window as any).env?.APP_URL || window.location.origin;

  const handleCreate = async () => {
    if (!url) return;
    setIsGenerating(true);
    try {
      const newId = (Math.random() + 1).toString(36).substring(7); // simple random id
      const now = new Date().toISOString();
      const newItem: LinkRecord = {
        id: newId,
        targetUrl: url,
        name: 'Untitled Link',
        createdAt: now,
        updatedAt: now,
        clicks: 0
      };

      await setDoc(doc(db, 'links', newId), newItem);
      
      setActiveItem(newItem);
      
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
    }
    setIsGenerating(false);
  };

  const downloadFile = (format: 'png' | 'svg') => {
    if (!qrDataUrl && !qrSvg) return;
    const a = document.createElement('a');
    a.download = `qrcode-${activeItem?.id || 'new'}.${format}`;
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
      alert('คัดลอกลิงก์สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans text-slate-800">
      
      {/* Mobile-like Container */}
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-4 border-white flex flex-col h-[800px] max-h-[95vh] relative ring-1 ring-slate-100">

        {/* Header */}
        <div className="px-6 py-6 flex items-center justify-center relative bg-white border-b border-slate-100/60 z-10">
          <button 
            onClick={() => navigate('/admin/login')}
            className="absolute left-6 p-1 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-slate-600" strokeWidth={2.5} />
          </button>
          <h1 className="text-[19px] font-bold text-[#0f2142]">QR Code ถาวร</h1>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col">
          
          <div className="p-6">
            <label className="block text-[15px] font-bold text-[#0f2142] mb-3">Link URL</label>
            <div className="relative mb-5">
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.example.com"
                className={`w-full px-4 py-3.5 rounded-xl border ${url ? 'border-emerald-500 bg-white' : 'border-slate-300 bg-white'} focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-10 text-[15px] text-[#0f2142] font-medium shadow-[0_2px_4px_rgba(0,0,0,0.02)]`}
              />
              {url && <CheckCircle2 className="w-[18px] h-[18px] bg-emerald-500 text-white rounded-full border-none absolute right-4 top-4" />}
            </div>
            
            <button 
              onClick={handleCreate}
              disabled={isGenerating || !url}
              className="w-full bg-[#0055ff] hover:bg-blue-700 text-white rounded-xl py-4 text-[16px] font-bold flex items-center justify-center space-x-2 transition-all disabled:opacity-50 shadow-md tracking-wide"
            >
              <QrCode className="w-5 h-5" />
              <span>สร้าง QR Code</span>
            </button>
          </div>

          <div className="flex-1 px-5 pb-6 w-full flex flex-col">
             <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
               <div className="w-full text-left font-bold text-[15px] text-[#0f2142] mb-4">QR Code ของคุณ</div>
               
               <div className="flex-1 flex flex-col items-center justify-between pt-2">
                 {qrDataUrl ? (
                   <div className="w-[200px] h-[200px] bg-white border border-slate-100 rounded-2xl shadow-sm p-3 flex items-center justify-center mb-8 mx-auto">
                     <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                   </div>
                 ) : (
                   <div className="w-[200px] h-[200px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 mb-8 mx-auto px-4 text-center">
                     <QrCode className="w-12 h-12 opacity-30 mb-2" />
                     <span className="text-[13px]">ใส่ URL ด้านบนเพื่อ<br/>สร้างตัวอย่าง</span>
                   </div>
                 )}

                 <div className="grid grid-cols-3 gap-3 w-full mt-auto pb-1">
                    <button 
                      onClick={() => downloadFile('png')} 
                      disabled={!qrDataUrl}
                      className="flex flex-col items-center justify-center py-4 px-1 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors bg-white shadow-sm group"
                    >
                      <Download className="w-[22px] h-[22px] mb-2.5 text-[#0f2142] group-disabled:text-slate-400" strokeWidth={1.5} />
                      <span className="text-[11px] font-bold text-[#0f2142] whitespace-nowrap group-disabled:text-slate-400">ดาวน์โหลด PNG</span>
                    </button>
                    <button 
                      onClick={() => downloadFile('svg')} 
                      disabled={!qrSvg}
                      className="flex flex-col items-center justify-center py-4 px-1 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors bg-white shadow-sm group"
                    >
                      <Download className="w-[22px] h-[22px] mb-2.5 text-[#0f2142] group-disabled:text-slate-400" strokeWidth={1.5} />
                      <span className="text-[11px] font-bold text-[#0f2142] whitespace-nowrap group-disabled:text-slate-400">ดาวน์โหลด SVG</span>
                    </button>
                    <button 
                      onClick={copyShortLink} 
                      disabled={!activeItem}
                      className="flex flex-col items-center justify-center py-4 px-1 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors bg-white shadow-sm group"
                    >
                      <Copy className="w-[22px] h-[22px] mb-2.5 text-[#0f2142] group-disabled:text-slate-400" strokeWidth={1.5} />
                      <span className="text-[11px] font-bold text-[#0f2142] whitespace-nowrap group-disabled:text-slate-400">คัดลอกลิงก์</span>
                    </button>
                 </div>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
