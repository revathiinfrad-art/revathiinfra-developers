/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Employee, EmployeeRole } from '../types';

interface FirebaseContextType {
  user: User | null;
  employee: Employee | null;
  loading: boolean;
  isAdmin: boolean;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'employees', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setEmployee({ id: docSnap.id, ...docSnap.data() } as Employee);
          } else {
            // Check if this is the bootstrap user (owner email)
            const isOwner = firebaseUser.email === 'revathiinfrad@gmail.com';
            
            const newEmployee: Partial<Employee> = {
              employeeId: isOwner ? 'ADMIN-001' : 'PENDING',
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              name: firebaseUser.displayName || 'Unnamed',
              email: firebaseUser.email || '',
              role: isOwner ? EmployeeRole.ADMIN : EmployeeRole.STAFF,
              photoUrl: firebaseUser.photoURL || undefined,
            };

            await setDoc(docRef, newEmployee);
            setEmployee({ id: firebaseUser.uid, ...newEmployee } as Employee);
          }
        } catch (error) {
          console.error("Error fetching employee profile:", error);
          handleFirestoreError(error, OperationType.GET, `employees/${firebaseUser.uid}`);
        }
      } else {
        setEmployee(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    employee,
    loading,
    isAdmin: employee?.role === EmployeeRole.ADMIN,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {!loading && children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
