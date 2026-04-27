/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Layout as LayoutIcon,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  X,
  Loader2,
  Upload,
  Map as MapIcon
} from 'lucide-react';
import { Project, PlotStatus, EmployeeRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '../lib/FirebaseProvider';

export default function Projects() {
  const navigate = useNavigate();
  const { isAdmin } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Form State
  const [newProject, setNewProject] = useState({
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    layoutUrl: '',
    totalPlots: 0,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'layoutUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("Image is too large. Please select an image under 800KB.");
      return;
    }

    setUploadingImage(field);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewProject(prev => ({ ...prev, [field]: reader.result as string }));
      setUploadingImage(null);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      } as unknown as Project));
      setProjects(projectsList);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'projects');
    });

    return () => unsubscribe();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'projects'), {
        ...newProject,
        totalPlots: Number(newProject.totalPlots),
        availablePlots: Number(newProject.totalPlots),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setNewProject({
        name: '',
        location: '',
        description: '',
        imageUrl: 'https://images.unsplash.com/photo-1590247813693-5180c44365b6?q=80&w=600&auto=format&fit=crop',
        totalPlots: 0,
      });
    } catch (error) {
      console.error(error);
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Project Catalog</h2>
          <p className="text-slate-500 text-sm">Manage multi-phase property portfolios and site layouts.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all shadow-sm text-xs uppercase tracking-widest flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            + New Project
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, location, or Phase..." 
            className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border-none rounded-lg focus:ring-0 text-sm placeholder:text-slate-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-lg transition-all text-xs font-bold border border-slate-200 uppercase tracking-widest">
          <Filter className="w-3 h-3" />
          Filter
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-50">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="mt-4 font-bold text-[10px] uppercase tracking-widest text-slate-400">Loading portfolio...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center">
            <p className="text-slate-400 font-medium italic text-sm">No projects currently indexed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={`project-card-${project.id}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden group hover:shadow-md transition-all duration-300 flex flex-col"
            >
              <div className="aspect-[16/9] overflow-hidden relative">
                <img 
                  src={project.imageUrl || undefined} 
                  alt={project.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4">
                  <span className="bg-slate-900/80 backdrop-blur-md text-white text-[9px] font-black px-2.5 py-1 rounded uppercase tracking-[0.1em] flex items-center gap-1.5 shadow-sm">
                    {project.location.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 leading-none group-hover:text-blue-600 transition-colors">{project.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Operational Status: Verified</p>
                  </div>
                  <button 
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="p-2 border border-slate-100 hover:border-blue-200 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed mb-6">
                  {project.description}
                </p>

                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Allocation</span>
                    <span className="text-sm font-black text-slate-900 mt-0.5">{project.availablePlots} / {project.totalPlots} Units</span>
                  </div>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    (project.availablePlots || 0) > 20 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    <LayoutIcon className="w-4 h-4" />
                  </div>
                </div>

                <div className="mt-6">
                  <button 
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="w-full py-3 bg-slate-50 hover:bg-slate-900 text-slate-600 hover:text-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    Open Master Layout
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Add New Project</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Portfolio Expansion Module</p>
                </div>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddProject} className="p-6 overflow-y-auto space-y-5">
                 <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Official Name</label>
                      <input 
                        required
                        type="text"
                        value={newProject.name}
                        onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                        className="input"
                        placeholder="e.g. Revathi Meadows Phase II"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Initial Unit Count</label>
                        <input 
                          required
                          type="number"
                          value={newProject.totalPlots}
                          onChange={(e) => setNewProject({...newProject, totalPlots: Number(e.target.value)})}
                          className="input"
                          placeholder="100"
                        />
                      </div>
                      <div className="space-y-1.5">
                         <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Geographical Location</label>
                         <input 
                           required
                           type="text"
                           value={newProject.location}
                           onChange={(e) => setNewProject({...newProject, location: e.target.value})}
                           className="input"
                           placeholder="e.g. North Hyderabad, TS"
                         />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Banner Image */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Banner Image</label>
                        <div className="aspect-[16/9] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative group">
                          {newProject.imageUrl ? (
                            <>
                              <img src={newProject.imageUrl} className="w-full h-full object-cover" alt="Banner" />
                              <button 
                                type="button"
                                onClick={() => setNewProject({...newProject, imageUrl: ''})}
                                className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                              {uploadingImage === 'imageUrl' ? (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                              ) : (
                                <>
                                  <Upload className="w-5 h-5 text-slate-400 mb-1" />
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Banner</span>
                                </>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'imageUrl')} />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Layout Image */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Site Layout</label>
                        <div className="aspect-[16/9] bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative group">
                          {newProject.layoutUrl ? (
                            <>
                              <img src={newProject.layoutUrl} className="w-full h-full object-cover" alt="Layout" />
                              <button 
                                type="button"
                                onClick={() => setNewProject({...newProject, layoutUrl: ''})}
                                className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                              {uploadingImage === 'layoutUrl' ? (
                                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                              ) : (
                                <>
                                  <MapIcon className="w-5 h-5 text-slate-400 mb-1" />
                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Layout</span>
                                </>
                              )}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'layoutUrl')} />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Brief</label>
                       <textarea 
                         rows={2}
                         value={newProject.description}
                         onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                         className="input resize-none"
                         placeholder="Technical highlights and key selling points..."
                       />
                    </div>
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 btn btn-secondary text-xs uppercase"
                    >
                      Dismiss
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] btn btn-primary text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Authorize Creation'}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
