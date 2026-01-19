import React, { useEffect, useState, useRef } from 'react';
import { X, MessageCircle, ArrowLeft, Search, Users, Trash2, Pin, Minus, BarChart2, Edit2, Check, Shield, Undo2, RefreshCw, Lock, Hash } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, deleteDoc, getDocs, where, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Post, Comment, UserData } from "../types";
import { getDefaultAvatar } from '../utils/avatarUtils';
import { Logger } from '../utils/logger';
import { Diagnostics } from '../utils/diagnostics';

/* 
   === FIRESTORE RULES REFERENCE ===
   The app logic matches these rules active in your Firebase Console:

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // --- HELPER FUNCTIONS ---
       function isAuth() { return request.auth != null; }
       function isOwner(userId) { return isAuth() && request.auth.uid == userId; }
       function getUserRole() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role; }
       function isDevOrOwner() { return isAuth() && (getUserRole() == 'Owner' || getUserRole() == 'Developer'); }

       // --- COLLECTIONS ---
       match /users/{userId} {
         allow read: if true; 
         allow create: if isOwner(userId);
         allow update: if isOwner(userId) || isDevOrOwner(); 
         allow delete: if isOwner(userId) || isDevOrOwner();
       }

       match /games/{gameId} { allow read: if true; allow write: if isDevOrOwner(); }
       match /groups/{groupId} { allow read: if true; allow write: if isDevOrOwner(); }
       match /system/{docId} { allow read: if true; allow write: if isDevOrOwner(); }

       // COMMUNITY FEED
       match /suggestions/{postId} {
         allow read: if true; allow create: if isAuth();
         allow update, delete: if isAuth() && (request.auth.uid == resource.data.authorUid || isDevOrOwner());
         match /comments/{commentId} {
           allow read: if true; allow create: if isAuth();
           allow update, delete: if isAuth() && (request.auth.uid == resource.data.authorUid || isDevOrOwner());
         }
       }
       
       match /bugs/{postId} {
         allow read: if true; allow create: if isAuth();
         allow update, delete: if isAuth() && (request.auth.uid == resource.data.authorUid || isDevOrOwner());
         match /comments/{commentId} {
           allow read: if true; allow create: if isAuth();
           allow update, delete: if isAuth() && (request.auth.uid == resource.data.authorUid || isDevOrOwner());
         }
       }
       
       match /general_chat/{postId} {
          allow read: if true; 
          // Restrict chat creation to non-Guest users (must be logged in)
          allow create: if isAuth() && getUserRole() != 'Guest';
          allow update, delete: if isAuth() && (request.auth.uid == resource.data.authorUid || isDevOrOwner());
       }

       match /admin_chat/{postId} { allow read, write: if isDevOrOwner(); }
     }
   }
*/

interface FeedModalProps {
  onClose: () => void;
  currentUserUid: string | null;
  currentUserRole: string;
}

const RoleBadge: React.FC<{ role: string }> = ({ role }) => {
  const styles: Record<string, string> = {
    Owner: "bg-rose-900/30 text-rose-300 border-rose-700",
    Developer: "bg-yellow-900/30 text-yellow-300 border-yellow-600",
    Member: "bg-slate-700/30 text-slate-400 border-slate-600",
    Guest: "bg-slate-800/30 text-slate-500 border-slate-700",
    Banned: "bg-red-950 text-red-500 border-red-900"
  };
  const style = styles[role] || styles.Member;
  return (
    <span className={`text-[9px] font-extrabold px-1 py-0 rounded border ${style} ml-1.5 align-middle`}>
      {role.toUpperCase()}
    </span>
  );
};

export const FeedModal: React.FC<FeedModalProps> = ({ onClose, currentUserUid, currentUserRole }) => {
  // Navigation State
  const [context, setContext] = useState<'community' | 'admin'>('community');
  const [category, setCategory] = useState<'chat' | 'suggestions' | 'bugs'>('chat');
  const [adminView, setAdminView] = useState<'chat' | 'garbage'>('chat');
  
  // Data State
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeThread, setActiveThread] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [garbageItems, setGarbageItems] = useState<Post[]>([]);
  const [isLoadingGarbage, setIsLoadingGarbage] = useState(false);
  
  // Inputs
  const [inputText, setInputText] = useState('');
  const [commentText, setCommentText] = useState('');
  
  // Admin Features
  const [isPollMode, setIsPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['Yes', 'No']);
  const [isAdminPinned, setIsAdminPinned] = useState(false);
  const [isAdminLocked, setIsAdminLocked] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTextInput, setEditTextInput] = useState('');

  // Users & Search
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userCache, setUserCache] = useState<Record<string, UserData>>({});

  // UI
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'user' | 'post', data: any } | null>(null);
  const [guestId, setGuestId] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let id = localStorage.getItem('oasis_guest_id');
    if (!id) {
      id = 'guest_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('oasis_guest_id', id);
    }
    setGuestId(id);
    Logger.debug("Feed", "Feed initialized", { context, category, role: currentUserRole });
  }, []);

  // Auto-scroll for chat
  useEffect(() => {
      // Only auto-scroll if we are in a chat context
      const isChatContext = (context === 'community' && category === 'chat') || (context === 'admin' && adminView === 'chat');
      if (isChatContext && scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [posts, category, context, adminView]);

  const effectiveUid = currentUserUid || guestId;
  // Guest check: Not logged in OR explicit Guest role
  const isGuest = !currentUserUid || currentUserRole === 'Guest';
  const isAdmin = ['Owner', 'Developer'].includes(currentUserRole);

  // Determine Collection
  const getActiveCollection = () => {
    if (context === 'admin') return 'admin_chat'; 
    if (category === 'chat') return 'general_chat';
    return category === 'suggestions' ? 'suggestions' : 'bugs';
  };
  const activeCollection = getActiveCollection();

  // --- LISTENERS ---

  // 1. Fetch Users
  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const users: UserData[] = [];
      const cache: Record<string, UserData> = {};
      snapshot.forEach(d => {
          const u = { ...d.data(), uid: d.id } as UserData;
          // Filter out Banned and Guest users from sidebar
          if (u.role !== 'Banned' && u.role !== 'Guest') users.push(u);
          cache[u.uid] = u;
      });
      setAllUsers(users);
      setUserCache(prev => ({...prev, ...cache}));
    });
    return () => unsub();
  }, []);

  // 2. Fetch Feed (or Chat)
  useEffect(() => {
    if (context === 'admin' && !isAdmin) { 
        Logger.warn("Feed", "Access Denied: Admin", { role: currentUserRole });
        setContext('community'); return; 
    }
    
    // Garbage View is manual fetch
    if (context === 'admin' && adminView === 'garbage') {
        refreshGarbage();
        return;
    }

    let q;
    if (category === 'chat' && context === 'community') {
         // Chat: Get 50 newest (desc), then we will reverse them for display
         q = query(collection(db, activeCollection), orderBy("timestamp", "desc"), limit(50));
    } else {
         // Feed: Descending order
         q = query(collection(db, activeCollection), orderBy("timestamp", "desc"));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      let raw = snapshot.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          _collection: activeCollection 
      } as Post));
      
      // CRITICAL: Filter out soft-deleted posts
      raw = raw.filter(p => !p.isDeleted);

      if (category === 'chat') {
          // Reverse to show Oldest -> Newest (Discord style)
          raw.reverse();
      } else {
        // Sort Pinned first only for feeds
        raw.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            // Descending timestamp fallback (already from query but safe to keep)
            return (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0);
        });
      }

      setPosts(raw);
    }, (error) => {
        const diag = Diagnostics.analyze('FeedListener', error, { userRole: currentUserRole, targetCollection: activeCollection });
        Logger.error("Feed", diag.userMessage, diag);
    });
    return () => unsub();
  }, [activeCollection, context, adminView, isAdmin, category]);

  // 3. Fetch Comments
  useEffect(() => {
    if (!activeThread) return;
    const unsub = onSnapshot(query(collection(db, activeCollection, activeThread.id, "comments"), orderBy("timestamp", "asc")), (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return () => unsub();
  }, [activeThread, activeCollection]);

  // --- ACTIONS ---

  const refreshGarbage = async () => {
    setIsLoadingGarbage(true);
    setGarbageItems([]); // Clear previous
    try {
        const collections = ['suggestions', 'bugs', 'general_chat', 'admin_chat'];
        let trash: Post[] = [];
        
        for (const col of collections) {
            try {
                // Try each collection independently so one permission error doesn't break all
                const q = query(collection(db, col), where("isDeleted", "==", true));
                const snap = await getDocs(q);
                const items = snap.docs.map(d => ({ ...d.data(), id: d.id, _collection: col } as Post));
                trash = [...trash, ...items];
            } catch (innerErr) {
                Logger.warn("Feed", `Failed to fetch garbage from ${col}`, innerErr);
            }
        }
        trash.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setGarbageItems(trash);
        Logger.info("Feed", "Garbage refreshed", { count: trash.length });
    } catch (e) {
        const diag = Diagnostics.analyze('RefreshGarbage', e, { userRole: currentUserRole });
        Logger.error("Feed", diag.userMessage, diag);
        alert(`Error fetching garbage: ${diag.userMessage}`);
    } finally {
        setIsLoadingGarbage(false);
    }
  };

  const handleSubmitPost = async () => {
    if (!effectiveUid) return;
    
    // Safety check for guests in chat
    if (isGuest && category === 'chat') {
        alert("You must log in to chat.");
        return;
    }

    if(!inputText.trim()) {
        alert("Please enter a message.");
        return;
    }

    try {
        const newPost: any = {
          text: inputText,
          timestamp: serverTimestamp(),
          authorUid: effectiveUid,
          replyCount: 0,
          isPinned: isAdmin && isAdminPinned,
          isLocked: isAdmin && isAdminLocked,
          isDeleted: false,
          type: isPollMode ? 'poll' : 'text'
        };

        if (isPollMode) {
            const opts = pollOptions.filter(o => o.trim());
            if (opts.length < 2) return alert("Min 2 options required");
            newPost.pollOptions = opts.map((t, i) => ({ id: i, text: t, votes: 0 }));
            newPost.votedUsers = {};
        }

        await addDoc(collection(db, activeCollection), newPost);
        setInputText('');
        setPollOptions(['Yes', 'No']);
        setIsPollMode(false);
        Logger.info("Feed", "Post created", { collection: activeCollection });
    } catch (e) {
        const diag = Diagnostics.analyze('SubmitPost', e, { 
            userRole: currentUserRole, 
            targetCollection: activeCollection,
            uid: effectiveUid
        });
        Logger.error("Feed", diag.userMessage, diag);
        alert(diag.userMessage);
    }
  };

  const handleSoftDelete = async (post: Post) => {
    if (!post) {
      Logger.warn("Feed", "SoftDelete called with no post data");
      return;
    }
    
    const targetCollection = post._collection || activeCollection;
    
    // Optimistic check: Ensure user is confirmed
    if (!window.confirm("Move this message/thread to the Garbage Bin? Admins can restore it later.")) return;

    try {
        await updateDoc(doc(db, targetCollection, post.id), { isDeleted: true });
        
        // Optimistic UI update: Remove from local state immediately
        setPosts(prev => prev.filter(p => p.id !== post.id));
        setContextMenu(null);
        if (activeThread?.id === post.id) setActiveThread(null);
        
        Logger.info("Feed", "Thread moved to garbage", { id: post.id, collection: targetCollection });
    } catch(e: any) { 
        const diag = Diagnostics.analyze('SoftDeletePost', e, { 
            userRole: currentUserRole, 
            targetCollection: targetCollection,
            uid: effectiveUid
        });
        
        Logger.error("Feed", diag.userMessage, diag);
        alert("Error: " + diag.userMessage + "\n\nReason: " + (e.message || "Unknown"));
    }
  };

  const handleRestore = async (post: Post) => {
    if (!post._collection) return Logger.error("Feed", "Cannot restore: Collection missing", post);
    try {
        await updateDoc(doc(db, post._collection, post.id), { isDeleted: false });
        setGarbageItems(prev => prev.filter(p => p.id !== post.id));
        Logger.info("Feed", "Thread restored", { id: post.id });
    } catch(e) { 
        const diag = Diagnostics.analyze('RestorePost', e, { userRole: currentUserRole, targetCollection: post._collection });
        Logger.error("Feed", diag.userMessage, diag);
        alert(diag.userMessage);
    }
  };

  const handlePurge = async (post: Post) => {
    if (!post._collection) return Logger.error("Feed", "Cannot purge: Collection missing", post);
    if (!confirm("DELETE PERMANENTLY? This cannot be undone.")) return;
    try {
        await deleteDoc(doc(db, post._collection, post.id));
        setGarbageItems(prev => prev.filter(p => p.id !== post.id));
        Logger.info("Feed", "Thread permanently deleted", { id: post.id });
    } catch(e) { 
        const diag = Diagnostics.analyze('PurgePost', e, { userRole: currentUserRole, targetCollection: post._collection });
        Logger.error("Feed", diag.userMessage, diag);
        alert(diag.userMessage);
    }
  };

  const handleTogglePin = async (post: Post) => {
      if (!isAdmin) return;
      try {
          const targetCollection = post._collection || activeCollection;
          await updateDoc(doc(db, targetCollection, post.id), { isPinned: !post.isPinned });
          setContextMenu(null);
          Logger.info("Feed", "Toggled pin", { id: post.id, newState: !post.isPinned });
      } catch (e) {
          Logger.error("Feed", "Failed to toggle pin", e);
      }
  };

  const handleToggleLock = async (post: Post) => {
      if (!isAdmin) return;
      try {
          const targetCollection = post._collection || activeCollection;
          await updateDoc(doc(db, targetCollection, post.id), { isLocked: !post.isLocked });
          setContextMenu(null);
          Logger.info("Feed", "Toggled lock", { id: post.id, newState: !post.isLocked });
      } catch (e) {
          Logger.error("Feed", "Failed to toggle lock", e);
      }
  };

  const handleVote = async (post: Post, optId: number) => {
    if (!effectiveUid) return;
    try {
        const ref = doc(db, activeCollection, post.id);
        const votes = post.votedUsers || {};
        const prev = votes[effectiveUid];
        if (prev === optId) return;

        const newOpts = [...(post.pollOptions || [])];
        if (prev !== undefined) {
            const oldOpt = newOpts.find(o => o.id === prev);
            if (oldOpt && oldOpt.votes > 0) oldOpt.votes--;
        }
        const target = newOpts.find(o => o.id === optId);
        if (target) target.votes++;

        await updateDoc(ref, { pollOptions: newOpts, votedUsers: { ...votes, [effectiveUid]: optId } });
    } catch (e) {
        Logger.error("Feed", "Voting failed", e);
    }
  };

  const startEditing = (post: Post) => {
    setEditingPostId(post.id);
    setEditTextInput(post.text);
    setContextMenu(null);
  };

  const saveEdit = async () => {
    if (editingPostId && editTextInput.trim()) {
        try {
            await updateDoc(doc(db, activeCollection, editingPostId), { text: editTextInput });
            setEditingPostId(null);
            Logger.info("Feed", "Post edited", { id: editingPostId });
        } catch (e) {
            const diag = Diagnostics.analyze('EditPost', e, { userRole: currentUserRole, targetCollection: activeCollection });
            Logger.error("Feed", diag.userMessage, diag);
            alert(diag.userMessage);
        }
    }
  };

  const handleSubmitComment = async () => {
    if (!effectiveUid || !commentText.trim() || !activeThread) return;
    try {
        await updateDoc(doc(db, activeCollection, activeThread.id), { replyCount: increment(1) });
        await addDoc(collection(db, activeCollection, activeThread.id, "comments"), {
            text: commentText, timestamp: serverTimestamp(), authorUid: effectiveUid
        });
        setCommentText('');
    } catch (e) {
        const diag = Diagnostics.analyze('SubmitComment', e, { userRole: currentUserRole, targetCollection: activeCollection });
        Logger.error("Feed", diag.userMessage, diag);
        alert(diag.userMessage);
    }
  };

  // --- HELPERS ---
  const getUser = (uid: string) => userCache[uid] || { uid, username: "Guest", role: "Guest", photoURL: "", email: "" };
  
  const handleUserCtx = (e: React.MouseEvent, u: UserData) => {
      if(!isAdmin) return;
      e.preventDefault(); e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, type: 'user', data: u });
  };

  const handlePostCtx = (e: React.MouseEvent, p: Post) => {
      // Allow if author OR Admin
      if(p.authorUid === effectiveUid || isAdmin) {
          e.preventDefault(); e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY, type: 'post', data: p });
      }
  };

  // --- RENDER ---
  const isGarbageView = context === 'admin' && adminView === 'garbage';
  // Check if we are in a chat context (Community Chat or Admin Team Chat)
  const isChatContext = (context === 'community' && category === 'chat') || (context === 'admin' && adminView === 'chat');
  const displayList = isGarbageView ? garbageItems : posts;

  const ProfileImage = ({ url, username }: { url?: string, username: string }) => (
    <img src={url || getDefaultAvatar(username)} alt={username} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-[1000px] max-w-full h-[85vh] bg-slate-950/95 border border-teal-400/15 rounded-3xl flex overflow-hidden shadow-[0_0_100px_rgba(45,212,191,0.15)] relative">
        
        {/* === LEFT COLUMN: FEED === */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
            {/* Header */}
            <div className="h-32 px-8 flex flex-col justify-center bg-slate-900/60 border-b border-white/5 shrink-0 gap-3">
                {activeThread ? (
                    <div className="flex items-center gap-3 h-full">
                        <button onClick={() => setActiveThread(null)} className="text-slate-400 hover:text-white flex items-center gap-1 font-bold"><ArrowLeft size={18} /> Back</button>
                        <span className="text-slate-200 font-bold">Thread</span>
                    </div>
                ) : (
                    <>
                        <div className="flex bg-black/30 p-1 rounded-lg w-fit">
                            <button onClick={() => setContext('community')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${context === 'community' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}><Users size={14}/> Community</button>
                            {isAdmin && <button onClick={() => setContext('admin')} className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${context === 'admin' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-rose-400'}`}><Shield size={14}/> Admin</button>}
                        </div>
                        
                        <div className="flex gap-4 border-b border-white/5 mt-1">
                            {context === 'admin' ? (
                                <>
                                    <button onClick={() => setAdminView('chat')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${adminView === 'chat' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Team Chat</button>
                                    <button onClick={() => setAdminView('garbage')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${adminView === 'garbage' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>Garbage Bin</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setCategory('chat')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${category === 'chat' ? 'border-teal-400 text-teal-400' : 'border-transparent text-slate-500'}`}>Chat</button>
                                    <button onClick={() => setCategory('suggestions')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${category === 'suggestions' ? 'border-teal-400 text-teal-400' : 'border-transparent text-slate-500'}`}>Suggestions</button>
                                    <button onClick={() => setCategory('bugs')} className={`pb-2 text-sm font-bold border-b-2 transition-colors ${category === 'bugs' ? 'border-teal-400 text-teal-400' : 'border-transparent text-slate-500'}`}>Bugs</button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Content Area */}
            {!activeThread ? (
                <>
                    {/* CHANGED: Remove space-y-4 in chat context to allow custom margin control */}
                    <div ref={scrollRef} className={`flex-1 overflow-y-auto p-8 ${isChatContext ? '' : 'space-y-4'}`}>
                        {/* Loading / Empty States */}
                        {isLoadingGarbage && isGarbageView && (
                             <div className="text-center text-slate-600 mt-10 animate-pulse">Scanning database...</div>
                        )}
                        
                        {!isLoadingGarbage && displayList.length === 0 && (
                             <div className="text-center text-slate-600 mt-10 font-bold flex flex-col items-center gap-2">
                                 {isGarbageView ? <Trash2 size={40} className="opacity-50"/> : <MessageCircle size={40} className="opacity-50"/>}
                                 <span>{isGarbageView ? "Garbage is empty" : "No messages yet"}</span>
                                 {isGarbageView && <button onClick={refreshGarbage} className="text-xs text-rose-400 flex items-center gap-1 mt-2 hover:underline"><RefreshCw size={12}/> Refresh</button>}
                             </div>
                        )}

                        {displayList.map((post, index) => {
                            const author = getUser(post.authorUid);
                            const isEditing = editingPostId === post.id;
                            
                            // Garbage Item Render
                            if(isGarbageView) {
                                return (
                                    <div key={post.id} className="bg-rose-950/10 border border-rose-500/20 p-4 rounded-xl flex justify-between items-center group hover:bg-rose-900/20 transition-colors">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-bold uppercase">
                                                <span>{post._collection}</span>
                                                <span className="text-slate-600">• {new Date(post.timestamp?.toDate()).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-slate-300 truncate font-medium">{post.text}</div>
                                            <div className="text-xs text-slate-600 mt-1">Author: {author.username}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleRestore(post)} className="bg-slate-800 text-teal-400 hover:bg-teal-500 hover:text-black p-2 rounded-lg transition-colors" title="Restore"><Undo2 size={16}/></button>
                                            <button onClick={() => handlePurge(post)} className="bg-slate-800 text-rose-500 hover:bg-rose-600 hover:text-white p-2 rounded-lg transition-colors" title="Delete Forever"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                );
                            }

                            // Chat View Render (Discord Style)
                            if (isChatContext) {
                                const prevPost = displayList[index - 1];
                                
                                // Fix for flicker: Handle null timestamp (pending writes) by defaulting to now
                                const currentSeconds = post.timestamp?.seconds || Date.now() / 1000;
                                const prevSeconds = prevPost?.timestamp?.seconds || 0;
                                
                                const isCompact = prevPost && 
                                                  prevPost.authorUid === post.authorUid && 
                                                  (currentSeconds - prevSeconds < 300);

                                return (
                                    // CHANGED: Fixed margins. mt-4 for new group, mt-0.5 for compact (tight). py-0.5 for hover consistency.
                                    <div key={post.id} className={`group hover:bg-white/5 pr-2 rounded -ml-2 pl-2 ${isCompact ? 'mt-0.5 py-0.5' : 'mt-4 py-0.5'}`} onContextMenu={(e) => handlePostCtx(e, post)}>
                                        {isEditing ? (
                                             <div className="flex gap-2 ml-10">
                                                <input value={editTextInput} onChange={e => setEditTextInput(e.target.value)} className="flex-1 bg-black/50 border border-teal-500/50 rounded px-2 py-1 text-white text-sm" autoFocus/>
                                                <button onClick={saveEdit} className="bg-teal-500 text-black px-2 rounded"><Check size={14}/></button>
                                                <button onClick={() => setEditingPostId(null)} className="bg-slate-700 text-white px-2 rounded"><X size={14}/></button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3 items-start">
                                                {!isCompact ? (
                                                    <div className="cursor-pointer shrink-0" onContextMenu={(e) => handleUserCtx(e, author)}>
                                                        <ProfileImage url={author.photoURL} username={author.username} />
                                                    </div>
                                                ) : <div className="w-8 h-0 shrink-0"/>}
                                                
                                                <div className="flex-1 min-w-0">
                                                    {!isCompact && (
                                                        <div className="flex items-center mb-0.5 leading-none">
                                                            <span className="font-bold text-white text-[12px] hover:underline cursor-pointer" onContextMenu={(e) => handleUserCtx(e, author)}>{author.username}</span>
                                                            <RoleBadge role={author.role} />
                                                            <span className="text-[10px] text-slate-500 ml-2">
                                                                {post.timestamp ? post.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "Sending..."}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className={`text-slate-300 text-[0.9rem] leading-snug whitespace-pre-wrap ${isCompact ? '-mt-1' : ''}`}>{post.text}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            // Standard Post Render (Suggestions / Bugs)
                            return (
                                <div key={post.id} onClick={() => !isEditing && setActiveThread(post)} onContextMenu={(e) => handlePostCtx(e, post)} className={`relative border p-5 rounded-2xl transition-all ${!isEditing && 'cursor-pointer hover:translate-x-1'} ${post.isPinned ? 'bg-teal-900/10 border-teal-500/30' : 'bg-slate-900/40 border-white/5'} hover:border-teal-400/30`}>
                                    <div className="absolute top-4 right-4 flex gap-4">
                                        {post.isLocked && <Lock size={16} className="text-rose-400"/>}
                                        {post.isPinned && <Pin size={16} className="text-teal-400 fill-teal-400"/>}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-2" onContextMenu={(e) => handleUserCtx(e, author)}>
                                        <ProfileImage url={author.photoURL} username={author.username} />
                                        <span className="font-bold text-sm text-white">{author.username}</span>
                                        <RoleBadge role={author.role} />
                                        <span className="text-xs text-slate-500 ml-auto mr-8">{post.timestamp?.toDate().toLocaleDateString()}</span>
                                    </div>

                                    {isEditing ? (
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            <input value={editTextInput} onChange={e => setEditTextInput(e.target.value)} className="flex-1 bg-black/50 border border-teal-500/50 rounded px-2 py-1 text-white" autoFocus/>
                                            <button onClick={saveEdit} className="bg-teal-500 text-black px-3 rounded"><Check size={16}/></button>
                                            <button onClick={() => setEditingPostId(null)} className="bg-slate-700 text-white px-3 rounded"><X size={16}/></button>
                                        </div>
                                    ) : (
                                        <div className="text-slate-200 text-lg leading-relaxed flex items-start gap-2">
                                            {post.type === 'poll' && <BarChart2 size={16} className="mt-1 text-teal-400"/>}
                                            <span>{post.text}</span>
                                        </div>
                                    )}

                                    {post.type === 'poll' && !isEditing && (
                                        <div className="mt-3 space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                                            {post.pollOptions?.map(opt => {
                                                const total = post.pollOptions?.reduce((a,b) => a + b.votes, 0) || 0;
                                                const pct = total ? Math.round((opt.votes/total)*100) : 0;
                                                const voted = post.votedUsers?.[effectiveUid] === opt.id;
                                                return (
                                                    <div key={opt.id} onClick={(e) => {e.stopPropagation(); handleVote(post, opt.id)}} className={`relative h-8 rounded overflow-hidden border border-white/10 flex items-center px-3 cursor-pointer hover:bg-white/5 ${voted ? 'ring-1 ring-teal-400' : ''}`}>
                                                        <div className={`absolute inset-0 ${voted ? 'bg-teal-400/20' : 'bg-white/5'}`} style={{width: `${pct}%`}}/>
                                                        <span className="relative z-10 text-xs font-bold text-slate-200 flex justify-between w-full"><span>{opt.text}</span><span>{pct}% ({opt.votes})</span></span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                                        <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><MessageCircle size={14}/> {post.replyCount}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Post Input (Hidden in Garbage) */}
                    {!isGarbageView && (
                        <div className="p-6 bg-slate-950/80 border-t border-white/10 shrink-0">
                            {/* Chat Restriction for Guests */}
                            {isGuest && category === 'chat' ? (
                                <div className="h-[44px] flex items-center justify-center bg-slate-900/50 border border-white/5 rounded-xl text-slate-500 text-sm font-bold italic">
                                    Log in to join the chat
                                </div>
                            ) : (
                                <>
                                    {isAdmin && context !== 'admin' && category !== 'chat' && (
                                        <div className="flex gap-4 mb-2 text-xs font-bold text-slate-400 select-none">
                                            <label className="flex gap-1 items-center cursor-pointer hover:text-white"><input type="checkbox" checked={isPollMode} onChange={e => setIsPollMode(e.target.checked)} className="accent-teal-400"/> Poll</label>
                                            <label className="flex gap-1 items-center cursor-pointer hover:text-teal-400"><input type="checkbox" checked={isAdminPinned} onChange={e => setIsAdminPinned(e.target.checked)} className="accent-teal-400"/> Pin</label>
                                            <label className="flex gap-1 items-center cursor-pointer hover:text-rose-400"><input type="checkbox" checked={isAdminLocked} onChange={e => setIsAdminLocked(e.target.checked)} className="accent-teal-400"/> Lock</label>
                                        </div>
                                    )}
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1 space-y-2">
                                            <textarea 
                                                value={inputText} 
                                                onChange={e => setInputText(e.target.value)} 
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && !e.shiftKey && category === 'chat') {
                                                        e.preventDefault();
                                                        handleSubmitPost();
                                                    }
                                                }}
                                                placeholder={context === 'admin' ? "Message Admin Team..." : category === 'chat' ? `Message #${category}` : "Share something..."} 
                                                className={`w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-teal-500/50 resize-none ${category === 'chat' ? 'h-[44px] py-2.5' : 'h-12'}`}
                                            />
                                            {isPollMode && category !== 'chat' && (
                                                <div className="pl-2 border-l-2 border-teal-500/30 space-y-2">
                                                    {pollOptions.map((opt, i) => (
                                                        <div key={i} className="flex gap-2"><input value={opt} onChange={e => {const n=[...pollOptions]; n[i]=e.target.value; setPollOptions(n)}} placeholder={`Option ${i+1}`} className="flex-1 bg-slate-900 border border-white/10 rounded px-2 py-1 text-xs text-white"/>{pollOptions.length>2 && <button onClick={() => setPollOptions(pollOptions.filter((_,x)=>x!==i))}><Minus size={12}/></button>}</div>
                                                    ))}
                                                    {pollOptions.length < 5 && <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-teal-400 font-bold">+ Add Option</button>}
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={handleSubmitPost} className={`px-6 rounded-xl font-bold ${category === 'chat' ? 'h-[44px]' : 'h-12'} ${context === 'admin' ? 'bg-rose-600 text-white' : 'bg-teal-400 text-black'}`}>Post</button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            ) : (
                /* THREAD VIEW */
                <div className="flex-1 overflow-y-auto flex flex-col">
                    <div className="p-8 border-b border-white/10 bg-white/5">
                        <div className="flex items-center gap-3 mb-4">
                            <ProfileImage url={getUser(activeThread.authorUid).photoURL} username={getUser(activeThread.authorUid).username}/>
                            <div>
                                <div className="flex items-center gap-2"><span className="font-bold text-white">{getUser(activeThread.authorUid).username}</span><RoleBadge role={getUser(activeThread.authorUid).role}/></div>
                                <div className="text-xs text-slate-500">{activeThread.timestamp?.toDate().toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="text-xl text-white">{activeThread.text}</div>
                    </div>
                    <div className="p-8 space-y-4">
                        {comments.map(c => (
                            <div key={c.id} className="flex gap-3">
                                <ProfileImage url={getUser(c.authorUid).photoURL} username={getUser(c.authorUid).username}/>
                                <div className="bg-white/5 p-3 rounded-xl flex-1">
                                    <div className="flex gap-2 items-center mb-1"><span className="text-sm font-bold text-slate-300">{getUser(c.authorUid).username}</span><RoleBadge role={getUser(c.authorUid).role}/></div>
                                    <div className="text-slate-300 text-sm">{c.text}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {(!activeThread.isLocked || isAdmin) && (
                        <div className="p-6 border-t border-white/10 bg-slate-950/80 flex gap-4 shrink-0">
                            <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Reply..." className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 text-white h-12"/>
                            <button onClick={handleSubmitComment} className="bg-teal-400 text-black px-6 rounded-xl font-bold h-12">Reply</button>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* === RIGHT COLUMN: USERS === */}
        <div className="w-[280px] bg-slate-950/50 flex flex-col shrink-0 border-l border-white/5">
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/5">
                <span className="font-bold text-slate-400 text-sm">Members ({allUsers.length})</span>
                <button onClick={onClose}><X size={20} className="text-slate-500 hover:text-white"/></button>
            </div>
            <div className="p-3 border-b border-white/5">
                <div className="relative"><Search size={14} className="absolute left-3 top-2.5 text-slate-500"/><input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Find user..." className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 py-2 text-sm text-white"/></div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {allUsers.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                    <div key={u.uid} onContextMenu={e => handleUserCtx(e, u)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                        <ProfileImage url={u.photoURL} username={u.username}/>
                        <div className="min-w-0"><div className="text-sm font-bold text-slate-200 truncate">{u.username}</div><RoleBadge role={u.role}/></div>
                    </div>
                ))}
            </div>
        </div>

        {/* === CONTEXT MENU === */}
        {contextMenu && (
            <div className="fixed bg-slate-900 border border-teal-500/30 rounded-lg shadow-xl py-1 w-48 z-[100]" style={{top: contextMenu.y, left: contextMenu.x}} onClick={e => e.stopPropagation()}>
                {contextMenu.type === 'user' ? (
                    <>
                        <div className="px-4 py-2 border-b border-white/10 text-xs font-bold text-slate-500 uppercase">Manage User</div>
                        {currentUserRole === 'Owner' && ['Member', 'Developer', 'Owner'].map(r => (
                            <button key={r} onClick={() => {updateDoc(doc(db,"users",contextMenu.data.uid),{role:r}); setContextMenu(null)}} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-teal-500 hover:text-black">{r}</button>
                        ))}
                        {isAdmin && <button onClick={() => {if(confirm("Ban user?")){updateDoc(doc(db,"users",contextMenu.data.uid),{role:'Banned'}); setContextMenu(null)}}} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500 hover:text-white border-t border-white/10">Ban User</button>}
                    </>
                ) : (
                    <>
                        <div className="px-4 py-2 border-b border-white/10 text-xs font-bold text-slate-500 uppercase">Manage {category === 'chat' ? 'Message' : 'Thread'}</div>
                        <button onClick={() => {startEditing(contextMenu.data)}} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-teal-500 hover:text-black flex gap-2 items-center"><Edit2 size={14}/> Edit</button>
                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); console.log("Delete clicked for:", contextMenu.data.id); handleSoftDelete(contextMenu.data); }} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500 hover:text-white flex gap-2 items-center"><Trash2 size={14}/> Move to Garbage</button>
                        
                        {/* New Pin/Lock Options for Admins */}
                        {isAdmin && category !== 'chat' && (
                            <>
                                <button onClick={(e) => { e.stopPropagation(); handleTogglePin(contextMenu.data); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-teal-500 hover:text-black flex gap-2 items-center border-t border-white/10">
                                    <Pin size={14}/> {contextMenu.data.isPinned ? "Unpin Post" : "Pin Post"}
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleToggleLock(contextMenu.data); }} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-teal-500 hover:text-black flex gap-2 items-center">
                                    <Lock size={14}/> {contextMenu.data.isLocked ? "Unlock Thread" : "Lock Thread"}
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>
        )}
      </div>
      
      {/* Click Outside Listener for Context Menu */}
      {contextMenu && <div className="fixed inset-0 z-[99]" onClick={() => setContextMenu(null)}/>}
    </div>
  );
}