/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Map, 
  Info, 
  Calendar, 
  User, 
  Phone,
  ArrowUpRight,
  Filter,
  Plus,
  X,
  Loader2,
  Trash2,
  Edit,
  Upload
} from 'lucide-react';
import { Project, Plot, PlotStatus, EmployeeRole } from '../types';
import { COLORS, PLOT_FACINGS } from '../constants';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  doc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { useFirebase } from '../lib/FirebaseProvider';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { employee, isAdmin } = useFirebase();
  
  const [project, setProject] = useState<Project | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlot, setSelectedPlot] = useState<Plot | null>(null);
  const [filter, setFilter] = useState<string>('All');
  
  // Modals
  const [showAddPlotModal, setShowAddPlotModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  // Edit Project Form
  const [projectForm, setProjectForm] = useState({
    name: '',
    location: '',
    description: '',
    imageUrl: '',
    layoutUrl: '',
    totalPlots: 0,
  });
  const [newPlot, setNewPlot] = useState({
    plotNumber: '',
    size: '200 Sq. Yds',
    status: PlotStatus.AVAILABLE,
    facing: 'East',
    price: 0,
  });

  const [isReserving, setIsReserving] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [saleDetails, setSaleDetails] = useState({ name: '', contact: '' });

  useEffect(() => {
    if (!id) return;

    // Fetch Project
    const projectRef = doc(db, 'projects', id);
    const unsubProject = onSnapshot(projectRef, (snap) => {
      if (snap.exists()) {
        setProject({ id: snap.id, ...snap.data() } as Project);
      } else {
        navigate('/projects');
      }
    });

    // Fetch Plots
    const plotsRef = collection(db, 'projects', id, 'plots');
    const qPlots = query(plotsRef, orderBy('plotNumber', 'asc'));
    const unsubPlots = onSnapshot(qPlots, (snap) => {
      const plotsList = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Plot));
      setPlots(plotsList);
      setLoading(false);
      
      // Keep selected plot in sync if it exists
      setSelectedPlot(prev => {
        if (!prev) return null;
        const updated = plotsList.find(p => p.id === prev.id);
        return updated || null;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${id}/plots`);
    });

    return () => {
      unsubProject();
      unsubPlots();
    };
  }, [id, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'imageUrl' | 'layoutUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("Image is too large. Please select an image under 800KB to stay within sync limits.");
      return;
    }

    setUploadingImage(field);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProjectForm(prev => ({ ...prev, [field]: reader.result as string }));
      setUploadingImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !project) return;
    setIsSubmitting(true);
    try {
      const projectRef = doc(db, 'projects', id);
      await updateDoc(projectRef, {
        ...projectForm,
        updatedAt: serverTimestamp(),
      });
      setShowEditProjectModal(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!project) return;
    setProjectForm({
      name: project.name,
      location: project.location,
      description: project.description,
      imageUrl: project.imageUrl || '',
      layoutUrl: project.layoutUrl || '',
      totalPlots: project.totalPlots,
    });
    setShowEditProjectModal(true);
  };

  const handleAddPlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'projects', id, 'plots'), {
        ...newPlot,
        price: newPlot.price * 1000, // Store full value, but input was in thousands
        projectId: id,
        updatedBy: employee?.employeeId || 'Unknown',
        updatedAt: serverTimestamp(),
      });
      setShowAddPlotModal(false);
      setNewPlot({
        plotNumber: '',
        size: '200 Sq. Yds',
        status: PlotStatus.AVAILABLE,
        facing: 'East',
        price: 0,
      });

      // Update project total count
      const projectRef = doc(db, 'projects', id);
      const projSnap = await getDoc(projectRef);
      if (projSnap.exists()) {
        const data = projSnap.data();
        const statsUpdate: any = {
          totalPlots: (data.totalPlots || 0) + 1,
          updatedAt: serverTimestamp()
        };
        
        if (newPlot.status === PlotStatus.AVAILABLE) {
          statsUpdate.availablePlots = (data.availablePlots || 0) + 1;
        }
        
        await updateDoc(projectRef, statsUpdate);
      }

    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${id}/plots`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [actionError, setActionError] = useState<string | null>(null);

  const handleUpdateStatus = async (status: PlotStatus, customerDetails?: any) => {
    if (!id || !selectedPlot) return;
    setActionError(null);
    console.log(`Updating status for ${selectedPlot.plotNumber} to ${status}`, customerDetails);

    try {
      const plotRef = doc(db, 'projects', id, 'plots', selectedPlot.id);
      const projectRef = doc(db, 'projects', id);

      const updateData: any = {
        status,
        updatedBy: employee?.employeeId || 'Unknown',
        updatedAt: serverTimestamp(),
        customerName: customerDetails?.name || null,
        customerContact: customerDetails?.contact || null,
      };

      // Read project first to calculate inventory diff
      const projSnap = await getDoc(projectRef);
      if (!projSnap.exists()) throw new Error("Parent project record missing.");
      const projectData = projSnap.data();

      // Atomic batch update
      const batch = writeBatch(db);

      // 1. Update plot status
      batch.update(plotRef, updateData);

      // 2. Adjust available plots counter
      let diff = 0;
      if (selectedPlot.status === PlotStatus.AVAILABLE && status !== PlotStatus.AVAILABLE) diff = -1;
      if (selectedPlot.status !== PlotStatus.AVAILABLE && status === PlotStatus.AVAILABLE) diff = 1;

      if (diff !== 0) {
        batch.update(projectRef, {
          availablePlots: (projectData.availablePlots || 0) + diff,
          updatedAt: serverTimestamp()
        });
      }

      await batch.commit();
      console.log("Batch update successful");

      setIsSelling(false);
      setIsReserving(false);
      setSaleDetails({ name: '', contact: '' });
      // Optimistic update for UI feel, though onSnapshot will handle it properly
      setSelectedPlot(prev => prev ? { ...prev, ...updateData } : null);
    } catch (error: any) {
      console.error("Status update error:", error);
      const message = error.message?.includes('permission') 
        ? "Access Denied: You do not have permissions to modify inventory status."
        : "Operational Failure: Could not synchronize status with server.";
      setActionError(message);
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}/plots/${selectedPlot.id}`);
    }
  };

  const filteredPlots = plots.filter(p => filter === 'All' || p.status === filter);

  if (loading || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
        <p className="mt-4 font-bold text-slate-400">Loading project data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Banner */}
      {project.imageUrl && (
        <div className="aspect-[21/6] rounded-xl overflow-hidden shadow-sm border border-slate-200 relative">
          <img 
            src={project.imageUrl} 
            alt={project.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/60 to-transparent flex items-end p-8">
            <div className="text-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mb-1">Premier Portfolio</p>
              <h1 className="text-3xl font-black italic">{project.name}</h1>
              <p className="text-xs font-medium opacity-90 mt-2 max-w-md line-clamp-2">{project.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/projects')}
            className="p-2 hover:bg-slate-200 bg-white border border-slate-200 text-slate-600 rounded-lg transition-all shadow-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 italic">{project.name}</h2>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider">Operational</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div className="flex flex-col text-right">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Global Availability</span>
            <span className="font-bold text-slate-900">{project.availablePlots} / {project.totalPlots} Units</span>
          </div>
          <div className="h-10 w-[1px] bg-slate-200"></div>
          {isAdmin && (
            <div className="flex gap-2">
              <button 
                onClick={openEditModal}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded font-medium text-xs hover:bg-slate-50 shadow-sm flex items-center gap-2"
              >
                <Edit className="w-3 h-3" /> Edit Project
              </button>
              <button 
                onClick={() => setShowAddPlotModal(true)}
                className="px-4 py-2 bg-slate-900 text-white rounded font-medium text-xs hover:bg-slate-800 shadow-sm"
              >
                + Add New Unit
              </button>
            </div>
          )}
        </div>
      </div>

      {project.layoutUrl && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-1"
        >
          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Site Map</span>
            <button className="text-[10px] text-blue-600 font-bold hover:underline">Download Master Plan</button>
          </div>
          <div className="aspect-[21/9] bg-slate-100 relative overflow-hidden rounded-lg group">
             <img 
               src={project.layoutUrl} 
               alt="Site Plan" 
               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Layout Selection */}
        <section className="col-span-12 lg:col-span-9 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div className="flex space-x-4">
              <span className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2"></div>Available
              </span>
              <span className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 bg-rose-500 rounded-full mr-2"></div>Sold
              </span>
              <span className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-2"></div>On Hold
              </span>
            </div>
            <div className="flex items-center gap-2">
              {['All', PlotStatus.AVAILABLE, PlotStatus.SOLD, PlotStatus.RESERVED].map((f) => (
                <button
                  key={`filter-${f}`}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded text-[10px] font-bold transition-all border ${
                    filter === f 
                    ? 'bg-slate-900 text-white border-slate-900' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {f === 'All' ? 'View: Masterplan Grid' : f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-3">
            {filteredPlots.map((plot) => (
              <button
                key={`plot-btn-${plot.id}`}
                onClick={() => setSelectedPlot(plot)}
                className={`border-2 rounded p-2 flex flex-col justify-between transition-all group ${
                  selectedPlot?.id === plot.id
                  ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md transform scale-105 z-10'
                  : 'hover:border-slate-400'
                } ${
                  plot.status === PlotStatus.AVAILABLE ? 'bg-emerald-50 border-emerald-200' :
                  plot.status === PlotStatus.SOLD ? 'bg-rose-50 border-rose-200' :
                  'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold ${
                    plot.status === PlotStatus.AVAILABLE ? 'text-emerald-800' :
                    plot.status === PlotStatus.SOLD ? 'text-rose-800' : 'text-amber-800'
                  }`}>{plot.plotNumber}</span>
                  {selectedPlot?.id === plot.id && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
                </div>
                <div className={`w-full h-1 rounded ${
                  plot.status === PlotStatus.AVAILABLE ? 'bg-emerald-200' :
                  plot.status === PlotStatus.SOLD ? 'bg-rose-200' : 'bg-amber-100'
                }`}></div>
              </button>
            ))}
          </div>
        </section>

        {/* Details Aside */}
        <aside className="col-span-12 lg:col-span-3 space-y-6">
          <AnimatePresence mode="wait">
            {selectedPlot ? (
              <motion.div
                key={`plot-details-${selectedPlot.id}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"
              >
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Unit Profile: {selectedPlot.plotNumber}</h3>
                
                {actionError && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-600 font-bold flex items-center gap-2">
                    <Info className="w-3 h-3" /> {actionError}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Lifecycle Status</span>
                    <span className={`text-xs font-bold uppercase ${
                      selectedPlot.status === PlotStatus.AVAILABLE ? 'text-emerald-600' :
                      selectedPlot.status === PlotStatus.SOLD ? 'text-rose-600' : 'text-amber-600'
                    }`}>{selectedPlot.status}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Mapped Area</span>
                    <span className="text-xs font-bold text-slate-900">{selectedPlot.size}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Structural Aspect</span>
                    <span className="text-xs font-bold text-slate-900">{selectedPlot.facing}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs text-slate-500 font-medium">Value Assessment</span>
                    <span className="text-xs font-bold text-slate-900 font-mono">₹{(selectedPlot.price / 1000).toLocaleString()} K</span>
                  </div>

                  {selectedPlot.customerName && (
                    <div className="mt-6 pt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Ownership Intent</label>
                      <div className="mt-2 space-y-2">
                        <div className="text-[10px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                          <User className="w-3 h-3 text-blue-500" /> {selectedPlot.customerName}
                        </div>
                        <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border border-slate-100 flex items-center gap-2">
                          <Phone className="w-3 h-3" /> {selectedPlot.customerContact}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-6 space-y-3">
                    {isSelling || isReserving ? (
                      <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase">
                            {isSelling ? "Sale Finalization" : "Unit Hold / Reservation"}
                          </h4>
                          <span className={`${isSelling ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'} px-2 py-0.5 rounded text-[9px] font-bold`}>
                            {isSelling ? "SOLD" : "RESERVED"}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</label>
                          <input 
                            type="text" 
                            className="input text-xs py-1.5"
                            value={saleDetails.name}
                            onChange={(e) => setSaleDetails({...saleDetails, name: e.target.value})}
                            placeholder={isSelling ? "Legal Owner Name" : "Reservation Name"}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">Contact Number</label>
                          <input 
                            type="text" 
                            className="input text-xs py-1.5"
                            value={saleDetails.contact}
                            onChange={(e) => setSaleDetails({...saleDetails, contact: e.target.value})}
                            placeholder="Phone Reference"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => {
                              setIsSelling(false);
                              setIsReserving(false);
                            }}
                            className="flex-1 px-3 py-2 bg-white border border-slate-200 text-slate-500 rounded text-xs font-bold"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => {
                              if (isSelling && (!saleDetails.name || !saleDetails.contact)) {
                                alert("Sale requires legal name and contact.");
                                return;
                              }
                              handleUpdateStatus(
                                isSelling ? PlotStatus.SOLD : PlotStatus.RESERVED, 
                                saleDetails.name || saleDetails.contact ? saleDetails : null
                              );
                            }}
                            className={`flex-2 px-3 py-2 ${isSelling ? 'bg-rose-600' : 'bg-amber-500'} text-white rounded text-xs font-bold`}
                          >
                            {isSelling ? "Finalize Sale" : "Confirm Hold"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectedPlot.status !== PlotStatus.AVAILABLE && (
                          <button 
                            onClick={() => handleUpdateStatus(PlotStatus.AVAILABLE)}
                            className="col-span-2 bg-slate-100 text-slate-700 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200"
                          >
                            Reset to Available
                          </button>
                        )}
                        
                        {selectedPlot.status === PlotStatus.AVAILABLE && (
                          <button 
                            onClick={() => setIsReserving(true)}
                            className="w-full bg-amber-500 text-white py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-amber-600 transition-all"
                          >
                            Place On Hold
                          </button>
                        )}

                        {selectedPlot.status !== PlotStatus.SOLD && (
                          <button 
                            onClick={() => setIsSelling(true)}
                            className={`${selectedPlot.status === PlotStatus.AVAILABLE ? 'w-full' : 'col-span-2'} bg-rose-600 text-white py-2.5 rounded-lg text-xs font-bold shadow-sm hover:bg-rose-700 transition-all`}
                          >
                            Mark as Sold
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white p-10 rounded-xl border border-dashed border-slate-300 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <Map className="w-6 h-6" />
                </div>
                <p className="text-xs text-slate-400 font-medium italic">Pending Unit Selection</p>
              </div>
            )}
            
            <div className="bg-slate-900 p-5 rounded-xl text-white shadow-xl border border-slate-800">
              <p className="text-xs text-blue-300 font-bold mb-1 italic">Operations Protocol</p>
              <p className="text-[11px] leading-relaxed opacity-80">
                All status modifications are logged with employee ID. Ensure client verification is complete before initiating transfers.
              </p>
            </div>
          </AnimatePresence>
        </aside>
      </div>

      {/* Add Plot Modal */}
      <AnimatePresence>
        {showAddPlotModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddPlotModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Define New Unit</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inventory Management System</p>
                </div>
                <button 
                  onClick={() => setShowAddPlotModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddPlot} className="p-6 space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Asset ID / Plot #</label>
                       <input 
                         required
                         type="text"
                         value={newPlot.plotNumber}
                         onChange={(e) => setNewPlot({...newPlot, plotNumber: e.target.value})}
                         className="input"
                         placeholder="e.g. 101"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Total Square Footage</label>
                       <input 
                         required
                         type="text"
                         value={newPlot.size}
                         onChange={(e) => setNewPlot({...newPlot, size: e.target.value})}
                         className="input"
                         placeholder="200 Sq. Yds"
                       />
                    </div>
                 </div>

                  <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Initial Status</label>
                      <select 
                        value={newPlot.status}
                        onChange={(e) => setNewPlot({...newPlot, status: e.target.value as PlotStatus})}
                        className="input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                      >
                        <option value={PlotStatus.AVAILABLE}>Available</option>
                        <option value={PlotStatus.RESERVED}>On Hold</option>
                        <option value={PlotStatus.SOLD}>Sold</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Orientation</label>
                      <select 
                        value={newPlot.facing}
                        onChange={(e) => setNewPlot({...newPlot, facing: e.target.value})}
                        className="input appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2010%2010%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
                      >
                        {PLOT_FACINGS.map((f, idx) => <option key={`${f}-${idx}`} value={f}>{f}</option>)}
                      </select>
                   </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valuation (In Thousands ₹)</label>
                    <input 
                      required
                      type="number"
                      placeholder="e.g. 500 for 500,000"
                      value={newPlot.price}
                      onChange={(e) => setNewPlot({...newPlot, price: Number(e.target.value)})}
                      className="input"
                    />
                 </div>

                 <div className="pt-4 flex gap-3">
                   <button 
                      type="button"
                      onClick={() => setShowAddPlotModal(false)}
                      className="flex-1 btn btn-secondary text-xs uppercase"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] btn btn-primary text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Inventory Add'}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Project Modal */}
      <AnimatePresence>
        {showEditProjectModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditProjectModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Update Project Profile</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Core Data Management</p>
                </div>
                <button 
                  onClick={() => setShowEditProjectModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateProject} className="p-6 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Name</label>
                    <input 
                      required
                      type="text"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                      className="input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Location</label>
                    <input 
                      required
                      type="text"
                      value={projectForm.location}
                      onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                      className="input"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea 
                    rows={3}
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                    className="input resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {/* Banner Image */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Banner Image</label>
                    <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative group">
                      {projectForm.imageUrl ? (
                        <>
                          <img src={projectForm.imageUrl} className="w-full h-full object-cover" alt="Banner" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => setProjectForm({...projectForm, imageUrl: ''})}
                              className="p-2 bg-rose-600 text-white rounded-lg shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                          {uploadingImage === 'imageUrl' ? (
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          ) : (
                            <>
                              <Upload className="w-6 h-6 text-slate-400 mb-2" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Upload Banner</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'imageUrl')} 
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Layout Image */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Master Layout Plan</label>
                    <div className="aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden relative group">
                      {projectForm.layoutUrl ? (
                        <>
                          <img src={projectForm.layoutUrl} className="w-full h-full object-cover" alt="Layout" />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button 
                              type="button"
                              onClick={() => setProjectForm({...projectForm, layoutUrl: ''})}
                              className="p-2 bg-rose-600 text-white rounded-lg shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                          {uploadingImage === 'layoutUrl' ? (
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                          ) : (
                            <>
                              <Map className="w-6 h-6 text-slate-400 mb-2" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Upload Site Layout</span>
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, 'layoutUrl')} 
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowEditProjectModal(false)}
                    className="flex-1 btn btn-secondary text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting || uploadingImage !== null}
                    className="flex-[2] btn btn-primary text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Commit Changes'}
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
