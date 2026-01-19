import React, { useEffect, useState } from 'react';
import { Camera, LogOut, Trash2, UserPen, Check, AlertTriangle, X } from 'lucide-react';
import { signOut, deleteUser, updateProfile } from 'firebase/auth';
import { doc, updateDoc, deleteDoc, collection, getDocs, getDoc, query, addDoc, writeBatch, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

import { AuthModal } from './components/AuthModal';
import { FeedModal } from './components/FeedModal';
import { UpdateCard } from './components/UpdateCard';
import { generateGamePayload } from './utils/gamePayload';
import { getDefaultAvatar } from './utils/avatarUtils';

// Custom Hooks
import { useOasisAuth } from './hooks/useOasisAuth';
import { useOasisData } from './hooks/useOasisData';

export default function App() {
  const { user, setUser } = useOasisAuth();
  const { games, groups, categories, tagHierarchy, badges, loading, status } = useOasisData();
  
  const [showAuth, setShowAuth] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Name Change States
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [showNameDisclaimer, setShowNameDisclaimer] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Expose Firebase to Child Window
  useEffect(() => {
    (window as any).oasis = {
      db,
      collection,
      doc,
      query,
      getDocs,
      getDoc,
      deleteDoc,
      writeBatch,
      onSnapshot: (ref: any, cb: any) => onSnapshot(ref, cb),
      // Sanitized Wrappers for Writes
      addDoc: async (ref: any, data: any) => addDoc(ref, JSON.parse(JSON.stringify(data))),
      updateDoc: async (ref: any, data: any) => updateDoc(ref, JSON.parse(JSON.stringify(data))),
      setDoc: async (ref: any, data: any, options: any) => setDoc(ref, JSON.parse(JSON.stringify(data)), options)
    };
    // CRITICAL: Expose auth for launcher user inheritance
    (window as any).firebaseAuth = auth;
  }, []);

  const handleLaunch = () => {
    // Allow launch even if loading, as long as we have valid empty arrays. 
    // This allows Owners to enter an empty DB to set it up.
    if (loading && games.length === 0 && groups.length === 0 && !confirm("Library is still syncing. Launch anyway?")) {
      return;
    }

    const payload = generateGamePayload(
      games, 
      groups, 
      categories,
      tagHierarchy,
      badges, 
      // Update: Allow 'Developer' role to be treated as Admin in the generated launcher
      ['Owner', 'Developer'].includes(user?.role || ''), 
      ['Owner', 'Developer'].includes(user?.role || ''), 
      user?.username || 'Guest'
    );

    const win = window.open("about:blank", "_blank");
    if (!win) {
      alert("Pop-up blocked! Allow pop-ups for Oasis.");
      return;
    }
    win.document.open();
    win.document.write(payload);
    win.document.close();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await updateDoc(doc(db, "users", user.uid), { photoURL: base64 });
      setShowDropdown(false);
    };
    reader.readAsDataURL(file);
  };

  // Step 1: Validate input and show disclaimer
  const initiateNameChange = () => {
      const trimmedName = newName.trim();
      
      if (!user || !auth.currentUser) {
          alert("Session lost. Please log in again.");
          return;
      }
      if (!trimmedName) {
          alert("Please enter a valid username.");
          return;
      }
      if (trimmedName === user.username) {
          setEditingName(false);
          return;
      }
      
      // Store name and show warning modal
      setPendingName(trimmedName);
      setShowDropdown(false); // Hide the dropdown to focus on the modal
      setShowNameDisclaimer(true);
  };

  // Step 2: Execute the change after confirmation
  const confirmNameChange = async () => {
      setIsUpdatingName(true);
      try {
          // 1. Update Auth Profile Display Name (Visual Name)
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { displayName: pendingName });
          }
          
          // 2. Update Firestore Username
          // We intentionally DO NOT update the email field in Firestore or Auth
          // so the login credential remains consistent.
          await updateDoc(doc(db, "users", user!.uid), { 
              username: pendingName
          });

          setEditingName(false);
          setNewName('');
          setShowNameDisclaimer(false);

      } catch (e: any) {
          console.error("Name update failed", e);
          alert("Error updating display name: " + e.message);
      } finally {
          setIsUpdatingName(false);
      }
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth.currentUser) return;
    const confirmDelete = window.confirm("Are you sure you want to PERMANENTLY delete your account? This cannot be undone.");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(auth.currentUser);
      setUser(null);
      setShowDropdown(false);
      alert("Account deleted successfully.");
    } catch (e: any) {
      if (e.code === 'auth/requires-recent-login') {
          alert("Security: Please Log Out and Log In again to delete your account.");
          signOut(auth);
          setShowDropdown(false);
      } else {
          alert("Error deleting account: " + e.message);
      }
    }
  };

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden font-sans">
      {/* Background */}
      <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_center,_#0f2e40_0%,_#000000_100%)]" />

      {/* Header */}
      <div className="absolute top-10 right-10 flex items-center gap-5 z-50">
        <div className="relative">
          <button 
            onClick={() => {
                if(user) {
                    setShowDropdown(!showDropdown);
                    setEditingName(false);
                    setNewName(user.username);
                } else {
                    setShowAuth(true);
                }
            }}
            className={`w-[50px] h-[50px] rounded-full border flex items-center justify-center overflow-hidden transition-all duration-300 backdrop-blur-md ${user ? 'border-teal-400 bg-teal-400/10' : 'border-white/10 bg-slate-900/60 hover:bg-teal-400/10 hover:border-teal-400'}`}
          >
            {user ? (
               <img 
                 src={user.photoURL || getDefaultAvatar(user.username)} 
                 alt="Profile" 
                 className="w-full h-full object-cover" 
               />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[60%] h-[60%]">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            )}
          </button>

          {/* Dropdown */}
          {showDropdown && user && (
            <div className="absolute top-[60px] right-0 w-[240px] bg-slate-900/95 border border-teal-400/15 rounded-xl backdrop-blur-xl p-2 flex flex-col gap-1 shadow-2xl">
              
              {/* Change Picture */}
              <label className="flex items-center gap-2 p-3 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors text-sm font-medium">
                <Camera size={16} /> Change Picture
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </label>

              {/* Change Username */}
              {editingName ? (
                  <div className="p-2 flex gap-2 items-center bg-black/20 rounded-lg mx-1 border border-teal-500/30">
                      <input 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-white outline-none min-w-0"
                        placeholder="New Name"
                        autoFocus
                      />
                      <button 
                        onClick={initiateNameChange} 
                        className="text-teal-400 hover:text-white"
                      >
                        <Check size={16}/>
                      </button>
                  </div>
              ) : (
                  <div 
                    onClick={() => setEditingName(true)}
                    className="flex items-center gap-2 p-3 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors text-sm font-medium"
                  >
                    <UserPen size={16} /> Change Username
                  </div>
              )}

              <div className="h-px bg-white/5 my-1 mx-2"></div>

              <div 
                onClick={() => { signOut(auth); setShowDropdown(false); }}
                className="flex items-center gap-2 p-3 rounded-lg text-slate-300 hover:bg-white/5 cursor-pointer transition-colors text-sm font-medium"
              >
                <LogOut size={16} /> Log out
              </div>
              <div 
                onClick={handleDeleteAccount}
                className="flex items-center gap-2 p-3 rounded-lg text-rose-400 hover:bg-rose-900/20 cursor-pointer transition-colors text-sm font-bold mt-1"
              >
                <Trash2 size={16} /> Delete Account
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setShowFeed(true)}
          className="px-8 py-4 bg-slate-900/60 border border-teal-400/15 rounded-2xl text-slate-200 font-bold text-lg backdrop-blur-md hover:border-teal-400 hover:text-white hover:shadow-[0_0_20px_rgba(45,212,191,0.4)] transition-all"
        >
          Feed
        </button>
      </div>

      {/* Main Content */}
      <div className="text-center flex flex-col items-center gap-[4vh] z-10 p-5 w-full">
        <h1 className="text-[clamp(3rem,10vw,7.5rem)] font-black text-transparent bg-clip-text bg-gradient-to-b from-teal-50 to-teal-400 drop-shadow-[0_0_75px_rgba(45,212,191,0.6)] m-0">
          Oasis
        </h1>
        <div className={`text-sm -mt-5 mb-2 font-medium transition-colors ${status.includes('Ready') ? 'text-teal-400' : 'text-slate-500'}`}>
          {status}
        </div>

        <button 
          onClick={handleLaunch}
          className="px-[clamp(40px,5vw,90px)] py-[clamp(15px,2vh,24px)] text-[clamp(1rem,2vw,1.5rem)] font-extrabold tracking-[3px] text-slate-300 bg-slate-900/60 border border-teal-400/20 rounded-full cursor-pointer uppercase backdrop-blur-md transition-all duration-300 hover:bg-teal-400/10 hover:border-teal-400 hover:text-white hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(45,212,191,0.4)]"
        >
          ENTER
        </button>

        <UpdateCard isAdmin={['Owner', 'Developer'].includes(user?.role || '')} />
      </div>

      {/* Auth Modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      
      {/* Feed Modal */}
      {showFeed && <FeedModal onClose={() => setShowFeed(false)} currentUserUid={user?.uid || null} currentUserRole={user?.role || 'Guest'} />}
    
      {/* Name Change Disclaimer Modal */}
      {showNameDisclaimer && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-slate-900 border border-slate-600 rounded-2xl w-[450px] max-w-full shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                  {/* Modal Header */}
                  <div className="bg-slate-800/50 p-6 border-b border-white/5 flex items-start gap-4">
                      <div className="bg-amber-500/10 p-3 rounded-full shrink-0">
                          <AlertTriangle className="text-amber-500" size={24} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white mb-1">Update Display Name</h3>
                          <p className="text-sm text-slate-400">Please review before confirming.</p>
                      </div>
                  </div>
                  
                  {/* Modal Content */}
                  <div className="p-6 space-y-4">
                      <p className="text-slate-300 text-sm leading-relaxed">
                          You are about to change your public display name to <span className="font-bold text-teal-400">"{pendingName}"</span>.
                      </p>
                      
                      <div className="bg-slate-950/50 border border-amber-500/20 rounded-lg p-4">
                           <p className="text-amber-200/90 text-xs font-medium leading-relaxed">
                               <span className="font-bold uppercase tracking-wide text-amber-500 block mb-1">Important Disclaimer</span>
                               This is a <span className="underline decoration-amber-500/50">visual change only</span>. 
                               For security purposes, your login credentials will remain unchanged. 
                               You must continue to use your original username (<span className="text-white font-mono">{user?.username}</span>) to access your account.
                           </p>
                      </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 bg-slate-950/30 border-t border-white/5 flex justify-end gap-3">
                      <button 
                          onClick={() => { setShowNameDisclaimer(false); setEditingName(true); setShowDropdown(true); }}
                          className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      >
                          Cancel
                      </button>
                      <button 
                          onClick={confirmNameChange}
                          disabled={isUpdatingName}
                          className="px-6 py-2 rounded-lg text-sm font-bold bg-teal-500 text-black hover:bg-teal-400 transition-colors shadow-[0_0_15px_rgba(45,212,191,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                          {isUpdatingName ? 'Updating...' : 'Confirm Change'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}