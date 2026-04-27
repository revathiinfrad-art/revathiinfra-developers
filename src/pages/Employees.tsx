/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Mail, User as UserIcon, Phone, Briefcase, Loader2, Trash2, Edit2 } from 'lucide-react';
import { Employee, EmployeeRole } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirebase } from '../lib/FirebaseProvider';

export default function Employees() {
  const { isAdmin } = useFirebase();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'employees'), orderBy('role', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const empList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(empList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'employees');
    });

    return () => unsubscribe();
  }, []);

  const handleToggleRole = async (emp: Employee) => {
    if (!isAdmin) return;
    try {
      const newRole = emp.role === EmployeeRole.ADMIN ? EmployeeRole.STAFF : EmployeeRole.ADMIN;
      if (emp.email === 'revathiinfrad@gmail.com') {
         alert("Cannot change role of primary admin.");
         return;
      }
      await updateDoc(doc(db, 'employees', emp.id), {
        role: newRole
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `employees/${emp.id}`);
    }
  };

  const handleDeleteEmployee = async (id: string, email: string) => {
    if (!isAdmin) return;
    if (email === 'revathiinfrad@gmail.com') {
        alert("Cannot delete primary admin.");
        return;
    }
    if (!confirm("Are you sure you want to remove this employee access?")) return;
    try {
      await deleteDoc(doc(db, 'employees', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `employees/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="mt-4 font-bold text-slate-400">Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personnel Directory</h1>
        <p className="text-slate-500 text-sm">Manage enterprise access and security permissions.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em] border-b border-slate-100">
              <td className="px-6 py-4">Identity</td>
              <td className="px-6 py-4">Credential & Role</td>
              <td className="px-6 py-4">Security Status</td>
              <td className="px-6 py-4 text-right">Administrative</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    {emp.photoUrl ? (
                      <img src={emp.photoUrl || undefined} alt="" className="w-9 h-9 rounded-lg border border-slate-200 shadow-inner" />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{emp.name || emp.username}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <Mail className="w-3 h-3" />
                        {emp.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <p className="text-xs font-mono font-bold text-slate-500">{emp.employeeId || 'IDX-PENDING'}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {emp.role === EmployeeRole.ADMIN ? (
                      <span className="bg-blue-50 text-blue-700 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" /> Administrator
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                        <Briefcase className="w-2.5 h-2.5" /> Field Staff
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active session</span>
                   </div>
                </td>
                <td className="px-6 py-5 text-right">
                  {isAdmin && (
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleToggleRole(emp)}
                        className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                        title="Modify Credentials"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteEmployee(emp.id, emp.email)}
                        className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Revoke Permission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
