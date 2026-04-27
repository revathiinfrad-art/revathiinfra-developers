/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, 
  CheckCircle2, 
  Clock, 
  CircleDollarSign, 
  TrendingUp,
  MapPin,
  Loader2
} from 'lucide-react';
import { Project, PlotStatus } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Project));
      setProjects(projectsList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, []);

  const totalProjects = projects.length;
  const totalAvailable = projects.reduce((acc, p) => acc + (p.availablePlots || 0), 0);
  const totalPlots = projects.reduce((acc, p) => acc + (p.totalPlots || 0), 0);
  const percentSold = totalPlots > 0 ? Math.round(((totalPlots - totalAvailable) / totalPlots) * 100) : 0;

  const stats = [
    { label: 'Total Projects', value: totalProjects.toString(), icon: Building, color: 'bg-indigo-500' },
    { label: 'Available Plots', value: totalAvailable.toString(), icon: CheckCircle2, color: 'bg-emerald-500' },
    { label: 'Sold Units (%)', value: `${percentSold}%`, icon: Clock, color: 'bg-amber-500' },
    { label: 'Active Employees', value: 'Live', icon: CircleDollarSign, color: 'bg-rose-500' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50 min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
        <p className="mt-4 font-bold text-slate-900">Calculating stats...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Portfolio Analytics</h2>
          <p className="text-slate-500 text-sm">Real-time status of active projects and units.</p>
        </div>
        <button 
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-xs hover:bg-slate-800 transition-all shadow-sm"
        >
          + Add Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={`stat-${stat.label}`} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.color.replace('500', '600')} w-10 h-10 rounded-lg flex items-center justify-center shadow-inner`}>
                <stat.icon className="text-white w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">Live</span>
            </div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Activity List */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-widest text-slate-500">Recent Portfolio Activity</h3>
            <button 
              onClick={() => navigate('/projects')}
              className="text-blue-600 text-xs font-bold hover:text-blue-700 transition-colors"
            >
              Advanced Search
            </button>
          </div>
          <div className="flex-1 divide-y divide-slate-100">
            {projects.length === 0 ? (
               <div className="p-12 text-center text-slate-400 italic text-sm">No active projects found.</div>
            ) : projects.map((project) => {
              const progress = project.totalPlots > 0 
                ? Math.round(((project.totalPlots - (project.availablePlots || 0)) / project.totalPlots) * 100) 
                : 0;
              return (
                <div 
                  key={`recent-project-${project.id}`} 
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                      <Building className="w-6 h-6 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{project.name}</h4>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {project.location.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-4 mb-2">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{progress}% Allocated</span>
                       <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full rounded-full ${progress > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${progress}%` }}
                          />
                       </div>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Valid until {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions / Internal Note */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 p-6 rounded-xl text-white shadow-xl flex flex-col justify-between h-48 border border-slate-800">
            <div>
              <p className="text-xs text-blue-400 font-bold mb-2 italic tracking-wide">Internal Operational Note</p>
              <p className="text-[11px] leading-relaxed text-slate-300 opacity-90">
                Quarterly report cycles end this Friday. Ensure all pending reservations are confirmed or released to avoid inventory locks.
              </p>
            </div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-[11px] transition-all shadow-lg shadow-blue-900/30">
              Download Quarterly PDF
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Task Portal</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Verification Queue</span>
                <span className="bg-rose-100 text-rose-600 text-[9px] font-black px-2 py-0.5 rounded">12</span>
              </button>
              <button className="w-full flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Sales Dashboard</span>
                <TrendingUp className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
