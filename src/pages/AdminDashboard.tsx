import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, User, Search, Edit, X, CheckCircle2, Lock, LogOut, 
  RotateCcw, QrCode, Plus, Trash2, Download, Copy, Check, AlertCircle, Eye 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { AnimatePresence, motion } from 'motion/react';
import { generateQRDataUrl, generateQRSvg } from '../lib/qr';
import { LinkRecord } from '../types';

import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'qrcodes' | 'admins'>('qrcodes');
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [admins, setAdmins] = useState<{id: string, email?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const listTopRef = useRef<HTMLDivElement>(null);
  
  // Edit modal state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LinkRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editId, setEditId] = useState('');

  // Add modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCustomId, setNewCustomId] = useState('');
  
  // Admin Management state
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  
  // Notification / Alert state
  const [notification, setNotification] = useState<{
    show: boolean, 
    type: 'success' | 'delete' | 'warning', 
    title?: string,
    message: string, 
    onConfirm?: () => void,
    confirmLabel?: string,
    cancelLabel?: string
  } | null>(null);
  const [copyId, setCopyId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const appUrl = (window as any).env?.APP_URL || window.location.origin;
  const superAdminEmail = 'Wsritangkum@gmail.com';
  const isSuperAdmin = auth.currentUser?.email?.toLowerCase() === superAdminEmail.toLowerCase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/admin/login');
      } else {
        // Verify admin status
        const isUserSuperAdmin = user.email?.toLowerCase() === superAdminEmail.toLowerCase();
        let authorized = isUserSuperAdmin;
        
        if (!isUserSuperAdmin && user.email) {
          try {
            const adminDoc = await getDoc(doc(db, 'admins', user.email));
            if (adminDoc.exists()) {
              authorized = true;
            }
          } catch (err) {
            console.error("Error checking admin status:", err);
          }
        }

        if (!authorized) {
          await signOut(auth);
          navigate('/admin/login');
        } else {
          if (activeTab === 'qrcodes') {
            fetchLinks();
          } else if (activeTab === 'admins') {
            fetchAdmins();
          }
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, activeTab]);

  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleFirestoreError = (error: unknown, operation: string, path: string) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      operation,
      path,
      auth: {
        uid: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified
      }
    };
    console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));
    return errInfo.error;
  };

  const fetchLinks = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let q;
      if (isSuperAdmin) {
        q = collection(db, 'links');
      } else {
        q = query(collection(db, 'links'), where('createdBy', '==', auth.currentUser?.email || ''));
      }
      
      const querySnapshot = await getDocs(q);
      const data: LinkRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const item = docSnap.data() as LinkRecord;
        if (item && item.id) {
          data.push(item);
        }
      });
      const sortedData = data.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setLinks(sortedData);
      generateQRCodesForList(sortedData);
    } catch (err: any) {
      const message = handleFirestoreError(err, 'list', 'links');
      setFetchError(message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'admins'));
      const data: {id: string, email?: string}[] = [];
      querySnapshot.forEach((docSnap) => {
        data.push({ id: docSnap.id, ...docSnap.data() });
      });
      setAdmins(data);
    } catch (err) {
      handleFirestoreError(err, 'list', 'admins');
    } finally {
      setLoading(false);
    }
  };

  const addAdmin = async () => {
    if (!newAdminEmail || !isSuperAdmin) return;
    setIsAdminLoading(true);
    try {
      await setDoc(doc(db, 'admins', newAdminEmail), {
        email: newAdminEmail,
        addedAt: new Date().toISOString(),
        addedBy: auth.currentUser?.email
      });
      setNewAdminEmail('');
      await fetchAdmins();
      setNotification({
        show: true,
        type: 'success',
        message: `เพิ่มสิทธิ์ผู้ดูแลให้ ${newAdminEmail} เรียบร้อยแล้ว`
      });
    } catch (err) {
      handleFirestoreError(err, 'create', `admins/${newAdminEmail}`);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const removeAdmin = async (id: string) => {
    if (!isSuperAdmin) return;
    try {
      await deleteDoc(doc(db, 'admins', id));
      await fetchAdmins();
      setNotification({
        show: true,
        type: 'success',
        message: 'ยกเลิกสิทธิ์ผู้ดูแลเรียบร้อยแล้ว'
      });
    } catch (err) {
      handleFirestoreError(err, 'delete', `admins/${id}`);
    }
  };

  const generateQRCodesForList = async (data: LinkRecord[]) => {
    const images: Record<string, string> = {};
    const settings = {
      size: 128, margin: 1, errorCorrectionLevel: 'M' as const,
      foregroundColor: '#000000', backgroundColor: '#ffffff'
    };
    
    await Promise.all(data.map(async (item) => {
       const shortUrl = `${appUrl}/r/${item.id}`;
       try {
         images[item.id] = await generateQRDataUrl(shortUrl, settings);
       } catch (e) {
         console.error(e);
       }
    }));
    setQrImages(images);
  };

  const openEdit = (item: LinkRecord) => {
    setEditItem(item);
    setEditName(item.name || '');
    setEditUrl(item.targetUrl);
    setEditId(item.id);
    setIsEditOpen(true);
  };

  const submitEdit = async () => {
    if (!editItem || !editUrl || !editId) return;

    // Validate ID format (alphanumeric and hyphens only)
    if (!/^[a-zA-Z0-9-]+$/.test(editId)) {
      setNotification({
        show: true,
        type: 'delete',
        message: 'Short ID ต้องประกอบด้วยตัวอักษร ภาษาอังกฤษ ตัวเลข หรือเครื่องหมาย - เท่านั้น'
      });
      return;
    }

    // Ensure URL is absolute
    let validatedUrl = editUrl.trim();
    if (validatedUrl && !/^https?:\/\//i.test(validatedUrl)) {
      validatedUrl = `https://${validatedUrl}`;
    }

    // Check for any duplicate (Name, URL, or ID)
    const isDuplicate = links.some(link => 
      link.id !== editItem.id && (
        link.name === editName || 
        link.targetUrl === validatedUrl || 
        link.id === editId
      )
    );

    if (isDuplicate) {
      setNotification({
        show: true,
        type: 'delete',
        title: 'ข้อมูลซ้ำในระบบ',
        message: 'ข้อมูลนี้ (ชื่อ, ลิงก์ หรือ Short ID) มีผู้ใช้งานในระบบแล้ว ไม่สามารถบันทึกซ้ำได้',
        cancelLabel: 'ยกเลิก',
        // No onConfirm means it will show as an alert with one button
      });
      return;
    }

    try {
      const isIdChanged = editId !== editItem.id;

      if (isIdChanged) {
        // Confirmation for ID change using custom modal
        setNotification({
          show: true,
          type: 'warning',
          title: 'ยืนยันการเปลี่ยน Short ID',
          message: 'การเปลี่ยน Short ID จะทำให้ QR Code เดิมที่ดาวน์โหลดไปแล้วใช้งานไม่ได้ คุณแน่ใจหรือไม่?',
          confirmLabel: 'ยืนยันการเปลี่ยน',
          cancelLabel: 'ยกเลิก',
          onConfirm: () => performEditSave(validatedUrl, editId)
        });
      } else {
        await performEditSave(validatedUrl, editId);
      }
    } catch (err) {
      const msg = handleFirestoreError(err, 'update', `links/${editItem.id}`);
      setNotification({
        show: true,
        type: 'delete',
        title: 'เกิดข้อผิดพลาด',
        message: `ไม่สามารถบันทึกข้อมูลได้: ${msg}`
      });
    }
  };

  const performEditSave = async (validatedUrl: string, editId: string) => {
    if (!editItem) return;
    setNotification(null);

    try {
      const isIdChanged = editId !== editItem.id;

      if (isIdChanged) {
        // Check if new ID already exists
        const newDocRef = doc(db, 'links', editId);
        const docSnap = await getDoc(newDocRef);
        if (docSnap.exists()) {
          setNotification({
            show: true,
            type: 'delete',
            message: `Short ID "${editId}" ถูกใช้งานไปแล้ว กรุณาใช้ชื่ออื่น`
          });
          return;
        }

        // Create new document and delete old one
        const now = new Date().toISOString();
        const updatedItem: LinkRecord = {
          ...editItem,
          id: editId,
          name: editName,
          targetUrl: validatedUrl,
          updatedAt: now,
          createdBy: editItem.createdBy || auth.currentUser?.email || 'unknown'
        };

        await setDoc(newDocRef, updatedItem);
        await deleteDoc(doc(db, 'links', editItem.id));
      } else {
        // Just update existing document
        const docRef = doc(db, 'links', editItem.id);
        const updateData: any = {
          name: editName,
          targetUrl: validatedUrl,
          updatedAt: new Date().toISOString()
        };
        
        // Ensure createdBy is set for legacy records
        if (!editItem.createdBy) {
          updateData.createdBy = auth.currentUser?.email || 'unknown';
        }

        await updateDoc(docRef, updateData);
      }

      setIsEditOpen(false);
      await fetchLinks();
      setNotification({
        show: true,
        type: 'success',
        message: 'อัปเดตข้อมูล QR Code เรียบร้อยแล้ว'
      });
    } catch (err) {
      const msg = handleFirestoreError(err, 'update', `links/${editItem.id}`);
      setNotification({
        show: true,
        type: 'delete',
        title: 'เกิดข้อผิดพลาด',
        message: `ไม่สามารถบันทึกข้อมูลได้: ${msg}`
      });
    }
  };

  const submitAdd = async () => {
    if (!newUrl) return;
    
    let finalId = newCustomId.trim();
    if (finalId) {
      if (!/^[a-zA-Z0-9-]+$/.test(finalId)) {
        setNotification({
          show: true,
          type: 'delete',
          message: 'Short ID ต้องประกอบด้วยตัวอักษร ภาษาอังกฤษ ตัวเลข หรือเครื่องหมาย - เท่านั้น'
        });
        return;
      }
      
      // Check for uniqueness
      const checkDoc = await getDoc(doc(db, 'links', finalId));
      if (checkDoc.exists()) {
        setNotification({
          show: true,
          type: 'delete',
          message: `Short ID "${finalId}" ถูกใช้งานไปแล้ว กรุณาใช้ชื่ออื่น`
        });
        return;
      }
    } else {
      finalId = Math.random().toString(36).substring(2, 10);
    }

    // Ensure URL is absolute
    let validatedUrl = newUrl.trim();
    if (validatedUrl && !/^https?:\/\//i.test(validatedUrl)) {
      validatedUrl = `https://${validatedUrl}`;
    }

    // Check for any duplicate (Name, URL, or ID)
    const isDuplicate = links.some(link => 
      link.name === (newName || `Link ${new Date().toLocaleDateString()}`) || 
      link.targetUrl === validatedUrl || 
      link.id === finalId
    );

    if (isDuplicate) {
      setNotification({
        show: true,
        type: 'delete',
        title: 'ข้อมูลซ้ำในระบบ',
        message: 'ข้อมูลนี้ (ชื่อ, ลิงก์ หรือ Short ID) มีผู้ใช้งานในระบบแล้ว ไม่สามารถสร้างซ้ำได้',
        cancelLabel: 'ยกเลิก',
        // No onConfirm means it will show as an alert with one button
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      const newItem: LinkRecord = {
        id: finalId,
        targetUrl: validatedUrl,
        name: newName || `Link ${new Date().toLocaleDateString()}`,
        createdAt: now,
        updatedAt: now,
        clicks: 0,
        createdBy: auth.currentUser?.email || 'unknown'
      };
      await setDoc(doc(db, 'links', finalId), newItem);
      setIsAddOpen(false);
      setNewName('');
      setNewUrl('');
      setNewCustomId('');
      await fetchLinks();
      setNotification({
        show: true,
        type: 'success',
        message: 'สร้าง QR Code ถาวรใหม่เรียบร้อยแล้ว'
      });
    } catch (err) {
      const msg = handleFirestoreError(err, 'create', 'links');
      setNotification({
        show: true,
        type: 'delete',
        title: 'เกิดข้อผิดพลาด',
        message: `ไม่สามารถสร้างรายการได้: ${msg}`
      });
    }
  };

  const handleDeleteRequest = (id: string, name: string) => {
    setNotification({
      show: true,
      type: 'delete',
      message: `คุณแน่ใจหรือไม่ว่าต้องการลบ "${name || id}"? การดำเนินการนี้ไม่สามารถย้อนกลับได้`,
      onConfirm: () => confirmDelete(id)
    });
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'links', id));
      setNotification(null);
      await fetchLinks();
    } catch (err) {
      handleFirestoreError(err, 'delete', `links/${id}`);
    }
  };

  const copyToClipboard = async (id: string) => {
    const shortUrl = `${appUrl}/r/${id}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyId(id);
      setTimeout(() => setCopyId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const downloadQR = async (link: LinkRecord, format: 'png' | 'svg') => {
    const shortUrl = `${appUrl}/r/${link.id}`;
    const fileName = link.name || `qrcode-${link.id}`;
    const qrSettings = {
      size: 1024,
      margin: 1,
      errorCorrectionLevel: 'M' as const,
      foregroundColor: '#000000',
      backgroundColor: '#ffffff'
    };
    
    if (format === 'png') {
      const dataUrl = await generateQRDataUrl(shortUrl, qrSettings);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${fileName}.png`;
      a.click();
    } else {
      const svg = await generateQRSvg(shortUrl, qrSettings);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const formatDate = (dateStr: string) => {
    try {
       return format(new Date(dateStr), 'd MMM yyyy HH:mm', { locale: th });
    } catch {
       return dateStr;
    }
  };

  const filteredLinks = links.filter(link => {
    const s = search.toLowerCase();
    const idMatch = link.id?.toLowerCase().includes(s);
    const urlMatch = link.targetUrl?.toLowerCase().includes(s);
    const nameMatch = link.name?.toLowerCase().includes(s);
    return idMatch || urlMatch || nameMatch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredLinks.length / itemsPerPage);
  const paginatedLinks = filteredLinks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      
      {/* Header */}
      <header className="sticky top-0 z-30 px-6 py-5 flex items-center justify-between bg-white/80 backdrop-blur-lg border-b border-slate-100 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#0055ff] rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-[#0f2142] tracking-tight leading-none">Admin Panel</h1>
            <p className="text-[11px] text-slate-500 font-medium mt-1 uppercase tracking-wider">QR Code Management</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-[10px] sm:text-[12px] text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 hidden md:flex">
          <span className="font-bold">Base URL:</span>
          <span className="truncate max-w-[200px]">{appUrl}</span>
          {appUrl.includes('run.app') && (
            <span className="text-amber-500 flex items-center gap-1 font-bold ml-1">
              <AlertCircle className="w-3 h-3" />
              Preview Mode
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => activeTab === 'qrcodes' ? fetchLinks() : fetchAdmins()}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 bg-white border border-slate-100 shadow-sm"
            title="รีเฟรช"
          >
            <RotateCcw className="w-5 h-5" strokeWidth={2} />
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition-all shadow-sm font-bold text-[13px]"
            title="ออกจากระบบ"
          >
             <LogOut className="w-[18px] h-[18px]" />
             <span className="hidden sm:inline">ออกจากระบบ</span>
             <span className="sm:hidden">ออก</span>
          </button>
        </div>
      </header>

      {/* Tab Switcher (Only for Super Admin) */}
      {isSuperAdmin && (
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 mt-6">
          <div className="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm flex">
            <button 
              onClick={() => setActiveTab('qrcodes')}
              className={`flex-1 py-3 rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${activeTab === 'qrcodes' ? 'bg-[#0f2142] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <QrCode className="w-4 h-4" />
              จัดการ QR Code
            </button>
            <button 
              onClick={() => setActiveTab('admins')}
              className={`flex-1 py-3 rounded-xl font-bold text-[14px] transition-all flex items-center justify-center gap-2 ${activeTab === 'admins' ? 'bg-[#0f2142] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <User className="w-4 h-4" />
              จัดการสิทธิ์ผู้ดูแล
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full flex flex-col pt-6 px-4 sm:px-6">
        
        {activeTab === 'qrcodes' ? (
          <>
            {/* Search & Filter Bar */}
            <section ref={listTopRef} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center justify-between sm:justify-start sm:gap-4">
                  <div>
                    <h2 className="font-bold text-[18px] text-[#0f2142]">รายการ QR Code ทั้งหมด</h2>
                    <p className="text-[12px] text-slate-400 font-bold mt-0.5">พบ {filteredLinks.length} รายการ</p>
                  </div>
                  <button 
                    onClick={() => setIsAddOpen(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-[#0055ff] text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm font-bold text-[13px]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>สร้างใหม่</span>
                  </button>
                </div>
                <div className="relative flex flex-1 max-w-md">
                  <Search className="w-[18px] h-[18px] text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" strokeWidth={2} />
                  <input 
                    type="text" 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ค้นหาชื่อหรือ Short Link..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/10 focus:border-[#0055ff] text-[15px] text-[#0f2142] font-medium placeholder-slate-400"
                  />
                </div>
              </div>
            </section>

            {/* Links Grid */}
            <div className="flex-1 pb-20">
              {loading ? (
                 <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                    <div className="w-10 h-10 border-4 border-[#0055ff] border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[14px] font-bold text-slate-400 uppercase tracking-widest">กำลังโหลดข้อมูล...</p>
                 </div>
              ) : (
                <>
                  {fetchError ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-3xl border border-red-100 border-dashed text-red-600">
                       <X className="w-12 h-12 mb-4" />
                       <p className="text-[15px] font-bold">{fetchError}</p>
                       <button onClick={fetchLinks} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm">ลองใหม่อีกครั้ง</button>
                    </div>
                  ) : paginatedLinks.length === 0 ? (
                     <div className="text-center py-20 bg-white rounded-3xl border border-slate-100 border-dashed">
                        <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-[15px] font-bold text-slate-400">ไม่พบคลังข้อมูล QR Code ในระบบ</p>
                     </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedLinks.map(link => {
                          const isSpecialAdmin = link.createdBy?.toLowerCase() === superAdminEmail.toLowerCase();
                          const isGoogleUser = link.createdBy && link.createdBy !== 'public' && !isSpecialAdmin;
                          
                          let borderColorClass = 'border-slate-100';
                          let glowClass = '';
                          
                          if (isSpecialAdmin) {
                            borderColorClass = 'border-red-500 border-2';
                            glowClass = 'shadow-red-100';
                          } else if (isGoogleUser) {
                            borderColorClass = 'border-blue-500 border-2';
                            glowClass = 'shadow-blue-100';
                          }

                          return (
                            <div 
                              key={link.id} 
                              className={`group bg-white p-5 rounded-3xl shadow-sm border transition-all flex flex-col hover:shadow-lg hover:translate-y-[-2px] ${borderColorClass} ${glowClass}`}
                            >
                               <div className="flex items-start justify-between mb-4">
                                  <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center p-1.5 group-hover:bg-white transition-colors">
                                    {qrImages[link.id] ? (
                                        <img src={qrImages[link.id]} alt="QR" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 animate-pulse rounded-lg" />
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex gap-1">
                                      <button 
                                        onClick={() => copyToClipboard(link.id)}
                                        className={`p-2 rounded-xl transition-all ${copyId === link.id ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-blue-50 text-slate-400 hover:text-blue-500'}`}
                                        title="Copy Short Link"
                                      >
                                        {copyId === link.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                      </button>
                                      <button 
                                        onClick={() => downloadQR(link, 'png')}
                                        className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400"
                                        title="Download PNG"
                                      >
                                        <Download className="w-4 h-4" />
                                      </button>
                                    </div>
                                    {link.createdBy && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isSpecialAdmin ? 'bg-red-50 text-red-600' : 
                                        isGoogleUser ? 'bg-blue-50 text-blue-600' : 
                                        'bg-slate-50 text-slate-400'
                                      }`}>
                                        {isSpecialAdmin ? 'OWNER' : isGoogleUser ? 'ADMIN' : 'PUBLIC'}
                                      </span>
                                    )}
                                  </div>
                               </div>
                               
                               <div className="flex-1 min-w-0 mb-4">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="font-black text-[15px] text-[#0f2142] truncate uppercase tracking-tight" title={link.name || link.id}>
                                      {link.name || link.id}
                                    </span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase">
                                        <Eye className="w-2.5 h-2.5" />
                                        <span>{link.clicks?.toLocaleString() || 0}</span>
                                      </div>
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase">Active</span>
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-slate-400 font-bold opacity-70 mb-2 truncate">ID: {link.id}</p>
                                  <p className="text-[13px] text-slate-500 truncate font-medium flex items-center gap-2 mb-3" title={link.targetUrl}>
                                    <Lock className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{link.targetUrl}</span>
                                  </p>
                                  <div className="text-[11px] text-slate-400 flex items-center justify-between font-bold mt-auto pt-3 border-t border-slate-50">
                                     <div className="flex items-center space-x-2">
                                       <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                                       <span className="truncate">อัปเดตเมื่อ {formatDate(link.updatedAt || link.createdAt)}</span>
                                     </div>
                                     {link.createdBy && <span className="text-[10px] opacity-50 truncate max-w-[100px]">{link.createdBy}</span>}
                                  </div>
                               </div>
                
                               <div className="flex items-center gap-2 pt-1">
                                   {(isSuperAdmin || (link.createdBy === auth.currentUser?.email)) && (
                                    <button 
                                      onClick={() => openEdit(link)}
                                      className="flex-1 px-4 py-3 border border-slate-100 text-[#0055ff] rounded-2xl text-[13px] font-black hover:bg-blue-50 hover:border-blue-100 transition-all bg-white shadow-sm flex items-center justify-center gap-2"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                      <span>เเก้ไข</span>
                                    </button>
                                  )}
                                  {(isSuperAdmin || (link.createdBy === auth.currentUser?.email)) && (
                                    <button 
                                      onClick={() => handleDeleteRequest(link.id, link.name || '')}
                                      className="px-4 py-3 border border-slate-100 text-red-500 rounded-2xl hover:bg-red-50 hover:border-red-100 transition-all bg-white shadow-sm flex items-center justify-center"
                                      title="ลบ"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="mt-12 flex flex-col items-center gap-6">
                           <div className="flex items-center gap-2">
                             <button 
                               onClick={() => handlePageChange(currentPage - 1)}
                               disabled={currentPage === 1}
                               className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                             >
                               <RotateCcw className="w-5 h-5 rotate-[-90deg]" />
                             </button>
                             
                             <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, i) => {
                                  const pageNum = i + 1;
                                  // Show first, last, and relative pages
                                  if (
                                    pageNum === 1 || 
                                    pageNum === totalPages || 
                                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                                  ) {
                                    return (
                                      <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`w-12 h-12 rounded-2xl font-black text-[14px] transition-all ${
                                          currentPage === pageNum 
                                            ? 'bg-[#0f2142] text-white shadow-lg shadow-slate-200' 
                                            : 'bg-white border border-slate-100 text-slate-500 hover:bg-slate-50'
                                        }`}
                                      >
                                        {pageNum}
                                      </button>
                                    );
                                  }
                                  if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                    return <span key={pageNum} className="px-1 text-slate-300 font-bold">...</span>;
                                  }
                                  return null;
                                })}
                             </div>

                             <button 
                               onClick={() => handlePageChange(currentPage + 1)}
                               disabled={currentPage === totalPages}
                               className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm"
                             >
                               <RotateCcw className="w-5 h-5 rotate-[90deg]" />
                             </button>
                           </div>
                           <p className="text-[13px] text-slate-400 font-bold uppercase tracking-widest">
                             หน้า {currentPage} จาก {totalPages}
                           </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col pb-20">
            {/* Add Admin Section */}
            <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
              <h3 className="font-bold text-[18px] text-[#0f2142] mb-4">เพิ่มสิทธิ์ผู้ดูแลใหม่</h3>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <User className="w-[18px] h-[18px] text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="ใส่อีเมล Google ที่ต้องการให้สิทธิ์..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-[#0055ff]/10 focus:border-[#0055ff] text-[15px] font-medium"
                  />
                </div>
                <button 
                  onClick={addAdmin}
                  disabled={isAdminLoading || !newAdminEmail}
                  className="px-6 bg-[#0055ff] text-white rounded-xl font-bold text-[14px] hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {isAdminLoading ? 'กำลังบันทึก...' : <><Plus className="w-4 h-4" /> <span>เพิ่ม</span></>}
                </button>
              </div>
              <p className="mt-3 text-[12px] text-slate-400 font-medium italic">* ผู้ที่ได้รับสิทธิ์จะสามารถเข้าถึงและแก้ไขข้อมูล QR Code ทั้งหมดได้</p>
            </section>

            {/* Admin List */}
            <div className="space-y-4">
              <h3 className="font-bold text-[16px] text-slate-400 uppercase tracking-widest px-1">รายชื่อผู้ดูแลระบบ</h3>
              
              {/* Super Admin (Hardcoded) */}
              <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#0f2142] shadow-sm">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-[#0f2142]">{superAdminEmail}</p>
                      <span className="px-2 py-0.5 bg-[#0055ff] text-white text-[10px] font-black rounded-md uppercase">Owner</span>
                    </div>
                    <p className="text-[12px] text-slate-500 font-medium">สิทธิ์การควบคุมสูงสุด (Immutable)</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-center text-slate-400 font-medium">กำลังโหลดรายชื่อ...</div>
              ) : admins.filter(a => a.id.toLowerCase() !== superAdminEmail.toLowerCase()).map(admin => (
                <div key={admin.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#0055ff]">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-[#0f2142]">{admin.email || admin.id}</p>
                      <p className="text-[12px] text-slate-400 font-bold uppercase tracking-tighter opacity-70">Admin Access</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeAdmin(admin.id)}
                    className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    title="ลบสิทธิ์"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {!loading && admins.filter(a => a.id.toLowerCase() !== superAdminEmail.toLowerCase()).length === 0 && (
                <div className="py-10 text-center bg-white rounded-3xl border border-slate-100 border-dashed text-slate-400 font-medium">
                  ยังไม่ได้เพิ่มผู้ดูแลคนอื่น
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Global Notifications Overlay */}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" 
              onClick={() => notification.type === 'success' && setNotification(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 text-center">
                {notification.type === 'success' ? (
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto mb-5">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                ) : notification.type === 'warning' ? (
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto mb-5">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-5">
                    <AlertCircle className="w-10 h-10" />
                  </div>
                )}
                
                <h3 className="text-[20px] font-black text-[#0f2142] mb-2 leading-tight">
                  {notification.title || (notification.type === 'success' ? 'ดำเนินการสำเร็จ' : 'ยืนยันการทำรายการ')}
                </h3>
                <p className="text-[15px] text-slate-500 font-bold leading-relaxed">
                  {notification.message}
                </p>
              </div>
              
              <div className="p-4 bg-slate-50/50 flex gap-3">
                {notification.type === 'success' || !notification.onConfirm ? (
                  <button 
                    onClick={() => setNotification(null)}
                    className="w-full bg-[#0f2142] text-white py-4 rounded-2xl font-black text-[15px] hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    {notification.cancelLabel || 'ตกลง'}
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => setNotification(null)}
                      className="flex-1 bg-white border border-slate-200 text-slate-500 py-4 rounded-2xl font-black text-[15px] hover:bg-slate-50 transition-all active:scale-[0.98]"
                    >
                      {notification.cancelLabel || 'ยกเลิก'}
                    </button>
                    <button 
                      onClick={() => notification.onConfirm?.()}
                      className={`flex-1 text-white py-4 rounded-2xl font-black text-[15px] transition-all shadow-lg active:scale-[0.98] ${
                        notification.type === 'warning' 
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                          : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                      }`}
                    >
                      {notification.confirmLabel || 'ยืนยันการลบ'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Modal / Backdrop */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div 
             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
             onClick={() => setIsAddOpen(false)} 
           />
           
           <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-400 overflow-hidden">
              <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
              
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                 <div>
                   <h3 className="font-black text-[20px] text-[#0f2142]">เพิ่มรายการ QR Code ใหม่</h3>
                   <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest mt-1">Create New Permanent QR</p>
                 </div>
                 <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-white bg-slate-100 rounded-2xl transition-colors shadow-sm">
                   <X className="w-6 h-6 text-slate-400" strokeWidth={2.5} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6 bg-white">
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="block text-[14px] font-black text-[#0f2142] uppercase tracking-wider ml-1">ชื่อรายการ</label>
                          <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50/30 focus:bg-white focus:outline-none transition-all text-[15px] text-[#0f2142] font-black"
                            placeholder="เช่น เมนูอาหาร, หน้าหลักเว็บ..."
                          />
                       </div>

                       <div className="space-y-2">
                          <label className="block text-[14px] font-black text-[#0f2142] uppercase tracking-wider ml-1">กำหนด Short ID เอง (เว้นว่างเพื่อสุ่ม)</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={newCustomId}
                              onChange={(e) => setNewCustomId(e.target.value.replace(/\s+/g, '-'))}
                              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50/30 focus:bg-white focus:outline-none transition-all text-[15px] text-[#0f2142] font-black"
                              placeholder="เช่น custom-name"
                            />
                            <p className="text-[11px] text-slate-400 mt-1 ml-1">* ใช้ได้เฉพาะ A-Z, 0-9 และเครื่องหมาย -</p>
                          </div>
                       </div>
                    
                    <div className="space-y-2">
                       <label className="block text-[14px] font-black text-[#0055ff] uppercase tracking-wider ml-1">ลิงก์ปลายทาง (Target URL)</label>
                       <div className="relative group">
                         <input 
                           type="text" 
                           value={newUrl}
                           onChange={(e) => setNewUrl(e.target.value)}
                           className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-[#0055ff] bg-slate-50/30 focus:bg-white focus:outline-none transition-all pr-12 text-[15px] text-[#0f2142] font-black shadow-inner"
                           placeholder="https://www.example.com"
                         />
                         <CheckCircle2 className={`w-[22px] h-[22px] absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${newUrl ? 'text-emerald-500' : 'text-slate-200'}`} />
                       </div>
                    </div>
                 </div>
                 
                 <button 
                   onClick={submitAdd}
                   disabled={!newUrl}
                   className="w-full bg-[#0055ff] hover:bg-blue-700 active:scale-[0.98] text-white py-5 rounded-2xl font-black text-[17px] transition-all disabled:opacity-30 shadow-xl shadow-blue-500/20 mb-2 uppercase tracking-wide"
                 >
                   สร้าง QR Code ถาวร
                 </button>
              </div>
              
              <div className="h-8 bg-white" />
           </div>
        </div>
      )}
      {/* Edit Modal / Backdrop */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div 
             className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
             onClick={() => setIsEditOpen(false)} 
           />
           
           <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-400 overflow-hidden">
              <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
              
              <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                 <div>
                   <h3 className="font-black text-[20px] text-[#0f2142]">ปรับเปลี่ยนข้อมูลลิงก์</h3>
                   <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest mt-1">Short ID: {editItem?.id}</p>
                 </div>
                 <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-white bg-slate-100 rounded-2xl transition-colors shadow-sm">
                   <X className="w-6 h-6 text-slate-400" strokeWidth={2.5} />
                 </button>
              </div>
              
              <div className="p-8 space-y-6 bg-white">
                 <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="block text-[14px] font-black text-[#0f2142] uppercase tracking-wider ml-1">ชื่อรายการ</label>
                       <input 
                         type="text" 
                         value={editName}
                         onChange={(e) => setEditName(e.target.value)}
                         className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50/30 focus:bg-white focus:outline-none transition-all text-[15px] text-[#0f2142] font-black"
                         placeholder="ระบุชื่อรายการ..."
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="block text-[14px] font-black text-[#0f2142] uppercase tracking-wider ml-1">แก้ไข Short Link ID</label>
                       <div className="relative">
                         <input 
                           type="text" 
                           value={editId}
                           onChange={(e) => setEditId(e.target.value.replace(/\s+/g, '-'))}
                           className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 bg-slate-50/30 focus:bg-white focus:outline-none transition-all text-[15px] text-[#0f2142] font-black"
                           placeholder="ระบุ ID..."
                         />
                         <p className="text-[11px] text-slate-400 mt-1 ml-1">* หากเปลี่ยน ID ลิงก์เดิมจะใช้งานไม่ได้</p>
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="block text-[14px] font-black text-[#0f2142] uppercase tracking-wider ml-1">ลิงก์ปัจจุบัน</label>
                       <div className="relative">
                         <input 
                           type="text" 
                           value={editItem?.targetUrl}
                           disabled
                           className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-400 focus:outline-none pr-12 text-[15px] font-medium select-none"
                         />
                         <Lock className="w-[18px] h-[18px] text-slate-300 absolute right-4 top-1/2 -translate-y-1/2" />
                       </div>
                    </div>
                    
                    <div className="space-y-2">
                       <label className="block text-[14px] font-black text-[#0055ff] uppercase tracking-wider ml-1">ลิงก์ปลายทางใหม่</label>
                       <div className="relative group">
                         <input 
                           type="text" 
                           value={editUrl}
                           onChange={(e) => setEditUrl(e.target.value)}
                           className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-[#0055ff] bg-slate-50/30 focus:bg-white focus:outline-none transition-all pr-12 text-[15px] text-[#0f2142] font-black shadow-inner"
                           placeholder="https://..."
                         />
                         <CheckCircle2 className={`w-[22px] h-[22px] absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${editUrl && editUrl !== editItem?.targetUrl ? 'text-emerald-500' : 'text-slate-200'}`} />
                       </div>
                    </div>
                 </div>
                 
                 <button 
                   onClick={submitEdit}
                   disabled={!editUrl || (editUrl === editItem?.targetUrl && editName === editItem?.name && editId === editItem?.id)}
                   className="w-full bg-[#0055ff] hover:bg-blue-700 active:scale-[0.98] text-white py-5 rounded-2xl font-black text-[17px] transition-all disabled:opacity-30 shadow-xl shadow-blue-500/20 mb-2 uppercase tracking-wide"
                 >
                   บันทึกข้อมูล
                 </button>
              </div>
              
              <div className="h-8 bg-white" />
           </div>
        </div>
      )}
    </div>
  );
}
