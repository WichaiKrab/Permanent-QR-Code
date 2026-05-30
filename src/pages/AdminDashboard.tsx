import React, { useState, useEffect, useRef } from 'react';
import { Menu, User, Search, Edit, X, CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { generateQRDataUrl } from '../lib/qr';
import { LinkRecord } from '../types';

import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function AdminDashboard() {
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  
  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LinkRecord | null>(null);
  const [editUrl, setEditUrl] = useState('');
  
  const navigate = useNavigate();
  const appUrl = (window as any).env?.APP_URL || window.location.origin;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin/login');
      } else {
        fetchLinks();
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchLinks = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'links'));
      const data: LinkRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        data.push(docSnap.data() as LinkRecord);
      });
      const sortedData = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLinks(sortedData);
      generateQRCodesForList(sortedData);
    } catch (err) {
      console.error('Failed to fetch links', err);
    }
    setLoading(false);
  };

  const generateQRCodesForList = async (data: LinkRecord[]) => {
    const images: Record<string, string> = {};
    const settings = {
      size: 128, margin: 1, errorCorrectionLevel: 'M' as const,
      foregroundColor: '#000000', backgroundColor: '#ffffff'
    };
    
    for (const item of data) {
       const shortUrl = `${appUrl}/r/${item.id}`;
       try {
         images[item.id] = await generateQRDataUrl(shortUrl, settings);
       } catch (e) {
         console.error(e);
       }
    }
    setQrImages(images);
  };

  const openEdit = (item: LinkRecord) => {
    setEditItem(item);
    setEditUrl(item.targetUrl);
    setIsEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editItem || !editUrl) return;
    try {
      const docRef = doc(db, 'links', editItem.id);
      await updateDoc(docRef, {
        targetUrl: editUrl,
        updatedAt: new Date().toISOString()
      });
      setIsEditOpen(false);
      fetchLinks();
    } catch (err) {
      console.error(err);
    }
  };
  
  const formatDate = (dateStr: string) => {
    try {
       return format(new Date(dateStr), 'd MMM yyyy HH:mm', { locale: th });
    } catch {
       return dateStr;
    }
  };

  const filteredLinks = links.filter(link => 
    link.id.toLowerCase().includes(search.toLowerCase()) || 
    link.targetUrl.toLowerCase().includes(search.toLowerCase()) ||
    link.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans text-slate-800">
      
      <div className="w-full max-w-[400px] bg-white rounded-[40px] shadow-2xl overflow-hidden border-4 border-white flex flex-col h-[800px] max-h-[95vh] relative ring-1 ring-slate-100">
        
        {/* Header */}
        <div className="px-6 py-6 flex items-center justify-between relative bg-white border-b border-slate-100/60 z-10 shrink-0">
          <Menu className="w-6 h-6 text-slate-600" strokeWidth={2.5} />
          <h1 className="text-[19px] font-bold text-[#0f2142] absolute left-1/2 -translate-x-1/2">QR Code ถาวร</h1>
          <button 
            onClick={() => signOut(auth)}
            className="w-[32px] h-[32px] bg-slate-100 rounded-full flex items-center justify-center border border-slate-200 shrink-0 hover:bg-slate-200 transition-colors"
            title="ออกจากระบบ"
          >
             <User className="w-[18px] h-[18px] text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white flex flex-col pt-5">
          
          <div className="px-5 mb-4 shrink-0">
            <h2 className="font-bold text-[16px] text-[#0f2142]">รายการ QR Code ที่เคยสร้างแล้ว</h2>
            
            <div className="relative flex mt-3">
              <Search className="w-[20px] h-[20px] text-slate-400 absolute left-3.5 top-3.5" strokeWidth={2} />
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาด้วยชื่อหรือ Short Link"
                className="flex-1 pl-11 pr-3 py-3 rounded-l-xl border border-r-0 border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-[14px] text-[#0f2142] font-medium placeholder-slate-400"
              />
              <button className="px-3.5 py-3 border border-slate-300 rounded-r-xl bg-white focus:outline-none hover:bg-slate-50 text-slate-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path></svg>
              </button>
            </div>
          </div>

          <div className="px-5 space-y-3 pb-8">
            {loading ? (
               <div className="text-center py-8 text-[14px] font-medium text-slate-500">กำลังโหลด...</div>
            ) : filteredLinks.length === 0 ? (
               <div className="text-center py-8 text-[14px] font-medium text-slate-500">ไม่พบรายการ QR Code</div>
            ) : filteredLinks.map(link => (
              <div key={link.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex items-start space-x-3">
                 <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center p-1.5">
                   {qrImages[link.id] ? (
                      <img src={qrImages[link.id]} alt="QR" className="w-full h-full object-contain" />
                   ) : (
                      <div className="w-full h-full bg-slate-200 animate-pulse rounded" />
                   )}
                 </div>
                 <div className="flex-1 min-w-0 pt-0.5">
                    <div className="font-bold text-[15px] text-[#0f2142]">{link.id}</div>
                    <div className="text-[13px] text-slate-500 truncate" title={link.targetUrl}>{link.targetUrl}</div>
                    <div className="text-[11px] text-emerald-600 mt-1 flex items-center space-x-1.5 font-bold">
                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                       <span>อัปเดตล่าสุด {formatDate(link.updatedAt || link.createdAt)}</span>
                    </div>
                 </div>
                 <button 
                   onClick={() => openEdit(link)}
                   className="shrink-0 px-3.5 py-1.5 border border-[#0055ff] text-[#0055ff] rounded-xl text-[12px] font-bold hover:bg-blue-50 transition-colors bg-white mt-1 shadow-sm"
                 >
                   แก้ไอลิงก์
                 </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Edit Modal / Drawer */}
        {isEditOpen && (
          <div className="absolute inset-0 z-50 overflow-hidden flex flex-col justify-end">
             <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setIsEditOpen(false)} />
             
             <div className="bg-white w-full rounded-t-[32px] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
                <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-2" />
                
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                   <h3 className="font-bold text-[17px] text-[#0f2142]">แก้ไขลิงก์: {editItem?.id}</h3>
                   <button onClick={() => setIsEditOpen(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                     <X className="w-6 h-6 text-slate-500" strokeWidth={2} />
                   </button>
                </div>
                
                <div className="p-6 space-y-5 bg-white">
                   <div>
                     <label className="block text-[14px] font-bold text-[#0f2142] mb-3">ลิงก์เดิม</label>
                     <div className="relative">
                       <input 
                         type="text" 
                         value={editItem?.targetUrl}
                         disabled
                         className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 focus:outline-none pr-11 text-[14px] font-medium"
                       />
                       <Lock className="w-[18px] h-[18px] text-slate-400 absolute right-4 top-4" strokeWidth={2.5} />
                     </div>
                   </div>
                   
                   <div>
                     <label className="block text-[14px] font-bold text-[#0f2142] mb-3">ลิงก์ใหม่</label>
                     <div className="relative">
                       <input 
                         type="text" 
                         value={editUrl}
                         onChange={(e) => setEditUrl(e.target.value)}
                         className="w-full px-4 py-3.5 rounded-xl border border-emerald-500 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-11 text-[14px] text-[#0f2142] font-medium shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                       />
                       <CheckCircle2 className="w-[20px] h-[20px] bg-emerald-500 text-white rounded-full border-none absolute right-4 top-4" />
                     </div>
                   </div>
                   
                   <button 
                     onClick={submitEdit}
                     disabled={!editUrl || editUrl === editItem?.targetUrl}
                     className="w-full bg-[#0055ff] hover:bg-blue-700 text-white py-4 rounded-xl text-[16px] font-bold transition-colors disabled:opacity-50 mt-4 shadow-md tracking-wide"
                   >
                     บันทึกการเปลี่ยนแปลง
                   </button>
                </div>
                {/* Pad the bottom for mobile safe area */}
                <div className="h-6 bg-white"></div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
