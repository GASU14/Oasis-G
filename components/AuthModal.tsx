import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebase"; // Added db import
import { doc, setDoc } from "firebase/firestore"; // Added firestore imports

interface AuthModalProps {
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      setError("Please fill all fields");
      return;
    }
    setError('');
    const email = `${username}@oasis.fake`;

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        
        // Save user to Firestore immediately to prevent "User" fallback race condition
        // RULES REQUIRE: Role must be "Member" on creation.
        await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            username: username,
            email: email,
            photoURL: "",
            role: "Member" 
        }, { merge: true });
      }
      onClose();
    } catch (e: any) {
      setError(e.message.replace("Firebase: ", ""));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-10 w-[380px] max-w-[90%] relative shadow-2xl flex flex-col gap-5">
        <button onClick={onClose} className="absolute top-4 right-6 text-slate-400 hover:text-white">
          <X size={28} />
        </button>
        
        <h2 className="text-2xl font-bold text-white text-center">
          {isLogin ? "Log in" : "Create Account"}
        </h2>
        
        <input 
          type="text" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username" 
          className="bg-slate-200 text-slate-900 font-semibold p-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-400"
        />
        
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password" 
          className="bg-slate-200 text-slate-900 font-semibold p-4 rounded-xl outline-none focus:ring-2 focus:ring-teal-400"
        />
        
        {error && <div className="text-red-400 text-sm text-center font-bold">{error}</div>}
        
        <button 
          onClick={handleSubmit}
          className="bg-white text-slate-900 font-extrabold p-4 rounded-xl text-lg hover:bg-teal-50 transition-colors"
        >
          {isLogin ? "Log In" : "Sign Up"}
        </button>
        
        <div className="text-center text-slate-400 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-teal-400 font-bold cursor-pointer hover:underline"
          >
            {isLogin ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  );
};