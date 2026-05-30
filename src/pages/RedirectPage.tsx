import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { LinkRecord } from '../types';

export default function RedirectPage() {
  const { id } = useParams<{ id: string }>();
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAndRedirect = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'links', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as LinkRecord;
          // In a real backend we'd increment clicks synchronously using existsAfter/getAfter or an increment.
          // For simplicity in this client-side redirect, we'll just redirect since 'clicks' isn't secure from the client.
          window.location.replace(data.targetUrl);
        } else {
          setError('Link not found or has been disabled.');
        }
      } catch (err) {
        console.error('Failed to redirect', err);
        setError('Error fetching the destination link.');
      }
    };

    fetchAndRedirect();
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white rounded-2xl shadow-md p-8 text-center max-w-sm w-full">
           <svg className="w-16 h-16 text-rose-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
           <h1 className="text-xl font-bold mb-2">ไม่พบลิงก์ / Link Not Found</h1>
           <p className="text-slate-500 text-sm mb-6">{error}</p>
           <button onClick={() => window.location.href = '/'} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
              กลับสู่หน้าหลัก (Home)
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
       <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
       <p className="text-slate-600 font-medium">กำลังเปลี่ยนเส้นทาง.. / Redirecting..</p>
    </div>
  );
}
