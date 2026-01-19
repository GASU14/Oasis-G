import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserData } from '../types';

export const useOasisAuth = () => {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    let userUnsub: () => void;

    const authUnsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try { await authUser.reload(); } catch(e) { /* ignore */ }

        const userRef = doc(db, "users", authUser.uid);
        
        userUnsub = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserData;
                if (data.role === 'Banned') {
                    await signOut(auth);
                    alert("This account has been banned.");
                    return;
                }
                setUser({ ...data, uid: authUser.uid });
            } else {
                // Initialize new user
                const now = Date.now();
                const creationTime = authUser.metadata.creationTime ? new Date(authUser.metadata.creationTime).getTime() : now;
                const isJustCreated = (now - creationTime) < 10000; 

                if (!isJustCreated) {
                     const newUser = {
                        uid: authUser.uid,
                        username: authUser.displayName || "User",
                        email: authUser.email || "",
                        photoURL: authUser.photoURL || "",
                        role: "Member" as const
                      };
                      await setDoc(userRef, newUser, { merge: true });
                }
            }
        });

      } else {
        if (userUnsub) userUnsub();
        setUser(null);
      }
    });

    return () => {
        authUnsub();
        if (userUnsub) userUnsub();
    };
  }, []);

  return { user, setUser };
};