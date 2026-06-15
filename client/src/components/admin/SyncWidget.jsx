import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  Clock, 
  Database, 
  X, 
  Info, 
  Trash2, 
  CheckCircle,
  Eye,
  ArrowRight
} from 'lucide-react';
import offlineDb from '../../utils/offlineDb.js';
import { 
  getConnectionState, 
  registerConnectionListener, 
  triggerSync, 
  pingServer 
} from '../../utils/syncEngine.js';
import { getDeviceDetails } from '../../utils/deviceInfo.js';
import toast from 'react-hot-toast';

export default function SyncWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [connState, setConnState] = useState(getConnectionState());
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'queue', 'conflicts'
  
  // Data states
  const [operations, setOperations] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [deviceInfo] = useState(getDeviceDetails());
  
  // UI states
  const [selectedOp, setSelectedOp] = useState(null);
  const [pinging, setPinging] = useState(false);

  // Stable close handler
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Cleanup on unmount (handles logout — SyncWidget unmounts, drawer must close)
  useEffect(() => {
    return () => {
      setIsOpen(false);
    };
  }, []);

  useEffect(() => {
    // Listen for global connection changes from syncEngine
    const unsubscribe = registerConnectionListener((state) => {
      setConnState(state);
      loadData();
    });

    loadData();
    const interval = setInterval(loadData, 5000); // Poll local IndexedDB for changes

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadData = async () => {
    try {
      const ops = await offlineDb.getOperations();
      const confs = await offlineDb.getConflicts();
      setOperations(ops);
      setConflicts(confs);
    } catch (err) {
      console.error('Failed to load IndexedDB data:', err);
    }
  };

  const handlePing = async () => {
    setPinging(true);
    const reachable = await pingServer();
    setPinging(false);
    if (reachable) {
      toast.success('Backend server is reachable!');
    } else {
      toast.error('Backend server is unreachable. Offline mode active.');
    }
    loadData();
  };

  const handleForceSync = async () => {
    await triggerSync();
    loadData();
  };

  const handleDeleteOp = async (id) => {
    if (window.confirm('Are you sure you want to discard this offline action?')) {
      await offlineDb.deleteOperation(id);
      toast.success('Offline operation discarded.');
      loadData();
      if (selectedOp?.id === id) setSelectedOp(null);
    }
  };

  const handleRetryOp = async (op) => {
    // Reset op status to pending and reset retry count
    const updatedOp = { ...op, status: 'pending', retryCount: 0, errorMessage: '' };
    await offlineDb.saveOperation(updatedOp);
    toast.success('Retrying operation...');
    await triggerSync();
    loadData();
  };

  // Conflict Resolution handlers
  const handleKeepServer = async (conflict) => {
    // Discard local operation, keep server state as source of truth
    await offlineDb.deleteOperation(conflict.id);
    await offlineDb.deleteConflict(conflict.id);
    toast.success('Resolved: Keeping Server State. Offline mutation discarded.');
    loadData();
  };

  const handleKeepClient = async (conflict) => {
    // Keep local changes: Update the expected version of the operation to match the current server version
    // and set status to pending so it replays cleanly.
    const op = conflict.operation;
    const updatedOp = {
      ...op,
      expectedVersion: conflict.serverVersion,
      status: 'pending',
      retryCount: 0,
      errorMessage: ''
    };
    await offlineDb.saveOperation(updatedOp);
    await offlineDb.deleteConflict(conflict.id);
    toast.success('Resolved: Client version queued. Replaying update...');
    await triggerSync();
    loadData();
  };

  // Render floating connection state badge
  const getBadgeStyles = () => {
    if (!connState.isOnline) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 focus:ring-amber-500 animate-pulse';
    }
    if (connState.syncStatus === 'syncing') {
      return 'bg-primary-500/10 text-primary-400 border-primary-500/30 hover:bg-primary-500/20 focus:ring-primary-500';
    }
    if (conflicts.length > 0) {
      return 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20 focus:ring-red-500';
    }
    return 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20 focus:ring-green-500';
  };

  const getStatusIcon = () => {
    if (connState.syncStatus === 'syncing') {
      return <RefreshCw className="w-[18px] h-[18px] md:w-5 md:h-5 animate-spin text-primary-400" />;
    }
    if (!connState.isOnline) {
      return <WifiOff className="w-[18px] h-[18px] md:w-5 md:h-5 text-amber-400" />;
    }
    if (conflicts.length > 0) {
      return <AlertTriangle className="w-[18px] h-[18px] md:w-5 md:h-5 text-red-400" />;
    }
    return <Wifi className="w-[18px] h-[18px] md:w-5 md:h-5 text-green-400" />;
  };

  // Portal target — renders outside React tree to avoid stacking context issues
  const portalRoot = document.getElementById('sync-drawer-root');

  return (
    <>
      {/* Floating State Badge Trigger */}
      <motion.button
        onClick={() => setIsOpen(true)}
        aria-label="Online and Sync Console"
        className={`fixed right-[64px] md:right-[76px] lg:right-[84px] bottom-3 md:bottom-4 lg:bottom-6 z-[9998] flex items-center justify-center gap-2 px-4 rounded-full border backdrop-blur-md shadow-lg shadow-black/40 cursor-pointer font-medium text-sm transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg h-10 md:h-[44px] lg:h-12 ${getBadgeStyles()}`}
        layoutId="sync-badge"
      >
        {getStatusIcon()}
        <span>
          {connState.syncStatus === 'syncing'
            ? 'Syncing Operations...'
            : !connState.isOnline
            ? `Offline (${operations.length} pending)`
            : conflicts.length > 0
            ? `${conflicts.length} Concurrency Conflicts`
            : 'Online & Synced'}
        </span>
      </motion.button>

      {/* Slide-over Sync Panel — rendered via Portal, outside <nav> and React tree */}
      {portalRoot && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleClose}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
              />

              {/* Sidebar container */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed right-0 top-0 bottom-0 w-[90%] md:w-[75%] lg:w-[50%] lg:max-w-[720px] z-[10000] shadow-2xl flex flex-col overflow-hidden"
                style={{ background: 'var(--dark-bg, #080c14)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              >

                {/* ── Self-Contained Drawer Header ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border/30 bg-dark-bg/95 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-3">
                    <Database className="text-primary-500 w-5 h-5 shrink-0 animate-pulse" />
                    <div>
                      <h2 className="font-display font-bold text-dark-text text-sm sm:text-base leading-none">
                        <span className="hidden sm:inline">Offline Sync Console</span>
                        <span className="sm:hidden">Sync Console</span>
                      </h2>
                      <p className="text-[9px] sm:text-[10px] text-dark-muted font-mono tracking-wide mt-0.5">
                        ID: {deviceInfo.sessionId}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close Sync Console"
                    onClick={handleClose}
                    className="w-9 h-9 rounded-xl border border-dark-border/60 hover:bg-dark-border/30 text-dark-muted hover:text-dark-text transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Navigation Tabs */}
                <div className="px-6 border-b border-dark-border/20 flex gap-2 pt-2 bg-dark-bg/60 shrink-0">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: Wifi },
                    { id: 'queue', label: `Pending Queue (${operations.length})`, icon: Clock },
                    { id: 'conflicts', label: `Conflicts (${conflicts.length})`, icon: AlertTriangle }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setSelectedOp(null);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                          isActive
                            ? 'border-primary-500 text-primary-500'
                            : 'border-transparent text-dark-muted hover:text-dark-text'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tab Contents */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-dark-bg/80">
                  {/* --- DASHBOARD TAB --- */}
                  {activeTab === 'dashboard' && (
                    <div className="flex flex-col gap-6">
                      {/* Status Card */}
                      <div className={`p-5 rounded-2xl border flex flex-col gap-4 ${
                        !connState.isOnline 
                          ? 'bg-amber-500/5 border-amber-500/20' 
                          : 'bg-green-500/5 border-green-500/20'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-dark-muted font-medium">Connection Status</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            !connState.isOnline
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                              : 'bg-green-500/10 text-green-400 border-green-500/20'
                          }`}>
                            {connState.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {connState.isOnline ? (
                            <Wifi className="w-8 h-8 text-green-400 animate-pulse" />
                          ) : (
                            <WifiOff className="w-8 h-8 text-amber-400" />
                          )}
                          <div>
                            <p className="font-semibold text-sm text-dark-text">
                              {connState.isOnline ? 'Network Link Available' : 'Offline Mode Active'}
                            </p>
                            <p className="text-xs text-dark-muted">
                              {connState.isOnline 
                                ? 'Pending modifications will sync automatically.'
                                : 'All updates are queued securely in IndexedDB.'}
                            </p>
                          </div>
                        </div>
                        
                        {/* Connection Actions */}
                        <div className="flex gap-2 pt-2 border-t border-dark-border/20">
                          <button
                            onClick={handlePing}
                            disabled={pinging}
                            className="btn-outline flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-dark-border"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
                            Ping Server
                          </button>
                          <button
                            onClick={handleForceSync}
                            disabled={connState.syncStatus === 'syncing' || !connState.isOnline}
                            className="btn-primary flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${connState.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                            Force Sync
                          </button>
                        </div>
                      </div>

                      {/* Queue Statistics */}
                      <div className="card p-5 border-dark-border/40 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-dark-muted">Pending Operations</p>
                          <p className="font-display font-bold text-2xl text-dark-text mt-1">{operations.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-muted">Active Conflicts</p>
                          <p className={`font-display font-bold text-2xl mt-1 ${conflicts.length > 0 ? 'text-red-400' : 'text-dark-text'}`}>
                            {conflicts.length}
                          </p>
                        </div>
                      </div>

                      {/* Metadata Card */}
                      <div className="card p-5 border-dark-border/40 flex flex-col gap-3">
                        <h3 className="font-semibold text-xs text-dark-text flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-primary-400" />
                          Device Identification Details
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Operating System</span>
                            <span className="text-dark-text font-medium">{deviceInfo.os}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Browser Engine</span>
                            <span className="text-dark-text font-medium">{deviceInfo.browser}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Platform Architecture</span>
                            <span className="text-dark-text font-medium font-mono text-[10px]">{deviceInfo.platform}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-dark-muted">Session Token</span>
                            <span className="text-dark-text font-mono text-[10px]">{deviceInfo.sessionId}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- PENDING QUEUE TAB --- */}
                  {activeTab === 'queue' && (
                    <div className="flex flex-col gap-4">
                      {operations.length === 0 ? (
                        <div className="text-center py-12 text-dark-muted text-xs flex flex-col items-center gap-3">
                          <CheckCircle className="w-8 h-8 text-green-400" />
                          <p>No operations queued. All changes synchronized!</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {operations.map((op) => (
                            <div 
                              key={op.id}
                              className={`p-4 rounded-xl border flex flex-col gap-3 transition-colors ${
                                op.status === 'conflict'
                                  ? 'bg-red-500/5 border-red-500/20'
                                  : op.status === 'failed'
                                  ? 'bg-amber-500/5 border-amber-500/20'
                                  : 'bg-dark-card/40 border-dark-border/60 hover:bg-dark-card/80'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                                  op.operationType === 'CREATE'
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : op.operationType === 'UPDATE'
                                    ? 'bg-primary-500/10 text-primary-400 border-primary-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                  {op.operationType} {op.entity}
                                </span>
                                <span className="text-[10px] text-dark-muted font-mono">
                                  {new Date(op.timestamp).toLocaleTimeString()}
                                </span>
                              </div>
                              
                              <p className="text-xs font-mono text-dark-muted break-all bg-dark-bg/40 p-2 rounded border border-dark-border/30">
                                {op.url}
                              </p>

                              {op.errorMessage && (
                                <p className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/10 p-2 rounded">
                                  {op.errorMessage}
                                </p>
                              )}

                              <div className="flex justify-between items-center text-xs mt-1">
                                <span className="text-dark-muted">Retries: {op.retryCount || 0}/5</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedOp(op)}
                                    className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 cursor-pointer font-medium"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Payload
                                  </button>
                                  {op.status === 'failed' && (
                                    <button
                                      onClick={() => handleRetryOp(op)}
                                      className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 cursor-pointer font-medium"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" /> Retry
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteOp(op.id)}
                                    className="p-1 text-red-400 hover:bg-red-500/10 rounded cursor-pointer"
                                    title="Discard Operation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- CONFLICTS CENTER TAB --- */}
                  {activeTab === 'conflicts' && (
                    <div className="flex flex-col gap-4">
                      {conflicts.length === 0 ? (
                        <div className="text-center py-12 text-dark-muted text-xs flex flex-col items-center gap-3">
                          <CheckCircle className="w-8 h-8 text-green-400" />
                          <p>No active data concurrency conflicts found!</p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-2 text-amber-400 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <p className="text-[10px] leading-relaxed">
                              Conflicts occur when a document was modified on the server since this device was offline. Please pick which state to keep.
                            </p>
                          </div>
                          
                          {conflicts.map((conflict) => (
                            <div key={conflict.id} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex flex-col gap-3">
                              <h4 className="font-bold text-xs text-dark-text flex items-center justify-between">
                                <span>Conflict in {conflict.operation.entity}</span>
                                <span className="text-[10px] text-dark-muted font-mono">ID: {conflict.operation.entityId?.slice(-8)}</span>
                              </h4>

                              {/* Comparison Box */}
                              <div className="grid grid-cols-2 gap-3 mt-1 bg-dark-bg/60 p-3 rounded-lg border border-dark-border/40 text-[10px]">
                                {/* Server State */}
                                <div className="flex flex-col gap-1 border-r border-dark-border/40 pr-2">
                                  <p className="font-bold text-purple-400 uppercase tracking-widest text-[8px]">Server State</p>
                                  <p className="text-dark-text font-medium">Version: {conflict.serverVersion}</p>
                                  <pre className="font-mono text-[9px] text-dark-muted h-32 overflow-y-auto whitespace-pre-wrap break-all mt-1">
                                    {JSON.stringify(conflict.serverState, null, 2)}
                                  </pre>
                                </div>
                                {/* Pending State */}
                                <div className="flex flex-col gap-1 pl-2">
                                  <p className="font-bold text-primary-400 uppercase tracking-widest text-[8px]">Pending Client</p>
                                  <p className="text-dark-text font-medium">Version: {conflict.clientVersion}</p>
                                  <pre className="font-mono text-[9px] text-dark-muted h-32 overflow-y-auto whitespace-pre-wrap break-all mt-1">
                                    {JSON.stringify(conflict.operation.payload, null, 2)}
                                  </pre>
                                </div>
                              </div>

                              {/* Reconciliation Actions */}
                              <div className="flex gap-2 justify-end mt-1 pt-2 border-t border-dark-border/20">
                                <button
                                  onClick={() => handleKeepServer(conflict)}
                                  className="px-3 py-1.5 rounded-lg border border-dark-border text-dark-text hover:bg-dark-border/40 text-xs font-semibold cursor-pointer"
                                >
                                  Keep Server Version
                                </button>
                                <button
                                  onClick={() => handleKeepClient(conflict)}
                                  className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Keep Client Version
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        portalRoot
      )}

      {/* JSON Payload viewer modal */}
      <AnimatePresence>
        {selectedOp && (
          <div className="fixed inset-0 z-[10001] bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-lg card p-6 flex flex-col gap-4 border-dark-border bg-dark-card">
              <div className="flex justify-between items-center border-b border-dark-border/40 pb-3">
                <h3 className="font-bold text-sm text-dark-text">Operation Payload Detail</h3>
                <button 
                  onClick={() => setSelectedOp(null)}
                  className="p-1 rounded hover:bg-dark-border/40 text-dark-muted hover:text-dark-text cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-dark-bg/60 p-4 rounded-xl border border-dark-border/40 text-xs">
                <pre className="font-mono h-80 overflow-y-auto whitespace-pre-wrap text-dark-muted">
                  {JSON.stringify(selectedOp.payload, null, 2)}
                </pre>
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setSelectedOp(null)}
                  className="btn-outline py-2 px-4 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
