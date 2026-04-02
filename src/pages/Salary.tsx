import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Save, Edit2, IndianRupee, TrendingUp, ArrowRight, CheckCircle2, AlertCircle, Clock, Plus, Trash2, History } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { collection, query, where, addDoc, deleteDoc, orderBy } from 'firebase/firestore';

interface SalaryData {
  amount: number;
  breakdown: {
    Rent: number;
    Food: number;
    Travel: number;
    Bills: number;
    Savings: number;
    Personal: number;
    Entertainment: number;
    Others: number;
  };
  updatedAt?: any;
}

const CATEGORIES = ['Rent', 'Food', 'Travel', 'Bills', 'Savings', 'Personal', 'Entertainment', 'Others'] as const;

export default function Salary({ user, partner }: { user: any; partner: any }) {
  const navigate = useNavigate();
  const [salary, setSalary] = useState<number>(0);
  const [partnerSalary, setPartnerSalary] = useState<number | null>(null);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
  const [newIncome, setNewIncome] = useState({ amount: 0, type: 'Salary', source: '' });
  const [isAddingIncome, setIsAddingIncome] = useState(false);

  const currentTheme = user.theme || 'dark';
  const isWhite = currentTheme === 'light';
  const isPink = currentTheme === 'pink';
  
  const textColor = isWhite ? 'text-stone-900' : (isPink ? 'text-black font-bold' : 'text-white');
  const mutedText = isWhite ? 'text-stone-500' : (isPink ? 'text-black/60 font-bold' : 'text-white/60');
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1a1a1a]');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-black/10' : 'border-white/10');
  const inputBg = isWhite ? 'bg-stone-50' : (isPink ? 'bg-black/5' : 'bg-white/5');

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to current user's salary
    const unsub = onSnapshot(doc(db, 'salaries', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SalaryData;
        setSalaryData(data);
        setSalary(data.amount || 0);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to salary:", error);
      setLoading(false);
    });

    // Listen to partner's salary if linked
    let unsubPartner: (() => void) | undefined;
    if (partner?.uid) {
      unsubPartner = onSnapshot(doc(db, 'salaries', partner.uid), (docSnap) => {
        if (docSnap.exists()) {
          setPartnerSalary(docSnap.data().amount || 0);
        }
      }, (error) => {
        console.error("Error listening to partner salary:", error);
      });
    }

    return () => {
      unsub();
      if (unsubPartner) unsubPartner();
    };
  }, [user?.uid, partner?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    const q = query(
      collection(db, 'income_entries'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end),
      orderBy('date', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setIncomeEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user?.uid]);

  const handleAddIncome = async () => {
    if (!user?.uid || newIncome.amount <= 0) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'income_entries'), {
        userId: user.uid,
        amount: newIncome.amount,
        type: newIncome.type,
        source: newIncome.source || newIncome.type,
        date: format(new Date(), 'yyyy-MM-dd'),
        createdAt: serverTimestamp()
      });
      setNewIncome({ amount: 0, type: 'Salary', source: '' });
      setIsAddingIncome(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error adding income:", error);
      setError("Failed to add income entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'income_entries', id));
    } catch (error) {
      console.error("Error deleting income:", error);
    }
  };

  const totalIncomeThisMonth = incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);

  const handleSave = async () => {
    if (!user?.uid) return;
    setError(null);
    
    if (salary <= 0) {
      setError("Please enter a valid salary amount.");
      return;
    }

    setSaving(true);
    try {
      const salaryRef = doc(db, 'salaries', user.uid);
      const docSnap = await getDoc(salaryRef);
      
      const existingData = docSnap.exists() ? docSnap.data() : {
        breakdown: {
          Rent: 0,
          Food: 0,
          Travel: 0,
          Bills: 0,
          Savings: 0,
          Personal: 0,
          Entertainment: 0,
          Others: 0
        }
      };

      await setDoc(salaryRef, {
        userId: user.uid,
        amount: salary,
        breakdown: existingData.breakdown || {
          Rent: 0,
          Food: 0,
          Travel: 0,
          Bills: 0,
          Savings: 0,
          Personal: 0,
          Entertainment: 0,
          Others: 0
        },
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving salary:", error);
      setError("Failed to save salary. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <div className={`h-10 ${isWhite ? 'bg-stone-100' : 'bg-white/10'} rounded-xl w-64 animate-pulse`} />
            <div className={`h-4 ${isWhite ? 'bg-stone-100' : 'bg-white/10'} rounded-lg w-48 animate-pulse`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${cardBg} h-64 rounded-3xl border ${borderCol} animate-pulse`} />
            <div className={`${cardBg} h-64 rounded-3xl border ${borderCol} animate-pulse`} />
          </div>
          <div className={`${cardBg} h-24 rounded-3xl border ${borderCol} animate-pulse`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className={`text-4xl font-black tracking-tight ${textColor}`}>
            Salary Management
          </h1>
          <p className={mutedText}>Manage your monthly income and partner's salary</p>
        </div>

        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl ${isPink ? 'bg-black/10 border-black/20 text-black' : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'} flex items-center gap-3`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Salary updated successfully!</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Salary Card (Base/Expected) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-8 rounded-3xl border ${cardBg} ${borderCol} relative overflow-hidden group`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Wallet className="w-32 h-32" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isWhite ? 'bg-stone-100' : 'bg-white/5'}`}>
                    <Wallet className={`w-6 h-6 ${isWhite ? 'text-stone-600' : (isPink ? 'text-black' : 'text-white')}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${textColor}`}>Expected Salary</h3>
                    <p className={`text-xs ${mutedText}`}>Base Monthly Income</p>
                  </div>
                </div>
                {!isEditing && salary > 0 && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-2 rounded-xl transition-all ${isWhite ? 'hover:bg-stone-100 text-stone-600' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {isEditing || salary === 0 ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <IndianRupee className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${mutedText}`} />
                      <input
                        type="number"
                        value={salary || ''}
                        onChange={(e) => setSalary(Number(e.target.value))}
                        onFocus={() => setIsEditing(true)}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold text-2xl ${inputBg} ${borderCol} ${textColor} focus:ring-2 focus:ring-emerald-500/50`}
                        placeholder="Expected Salary"
                      />
                    </div>
                    {(isEditing || salary > 0) && (
                      <div className="flex gap-3">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className={`flex-1 relative flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]')}`}
                        >
                          <AnimatePresence mode="wait">
                            {showSuccess ? (
                              <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center gap-2"
                              >
                                <CheckCircle2 className="w-5 h-5" />
                                <span>Saved!</span>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="normal"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-2"
                              >
                                <Save className="w-5 h-5" />
                                <span>{saving ? 'Saving...' : (salary === 0 ? 'Add Salary' : 'Save Changes')}</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </button>
                        {salary > 0 && (
                          <button
                            onClick={() => setIsEditing(false)}
                            className={`px-6 py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : (isPink ? 'bg-black/5 text-black hover:bg-black/10' : 'bg-white/5 text-white hover:bg-white/10')}`}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-black tracking-tight ${textColor}`}>
                      ₹{salary.toLocaleString()}
                    </span>
                    <span className={`text-sm font-medium ${mutedText}`}>/ month</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Actual Received Income Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-8 rounded-3xl border ${cardBg} ${borderCol} relative overflow-hidden group`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-32 h-32" />
            </div>

            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isWhite ? 'bg-stone-100' : 'bg-white/5'}`}>
                    <IndianRupee className={`w-6 h-6 ${isWhite ? 'text-stone-600' : (isPink ? 'text-black' : 'text-white')}`} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${textColor}`}>Actual Received</h3>
                    <p className={`text-xs ${mutedText}`}>Total for {format(new Date(), 'MMMM')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddingIncome(true)}
                  className={`p-2 rounded-xl transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90' : 'bg-emerald-500 text-white hover:bg-emerald-600')}`}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className={`text-5xl font-black tracking-tight ${textColor}`}>
                    ₹{totalIncomeThisMonth.toLocaleString()}
                  </span>
                  <span className={`text-sm font-medium ${mutedText}`}>received</span>
                </div>
                
                {salary > 0 && (
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isPink ? 'bg-black' : 'bg-emerald-500'} transition-all duration-1000`}
                      style={{ width: `${Math.min((totalIncomeThisMonth / salary) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Add Income Form */}
        <AnimatePresence>
          {isAddingIncome && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6 overflow-hidden`}
            >
              <h3 className={`text-xl font-black ${textColor}`}>Record New Income</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${mutedText}`}>Amount</label>
                  <div className="relative">
                    <IndianRupee className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
                    <input
                      type="number"
                      value={newIncome.amount || ''}
                      onChange={(e) => setNewIncome({ ...newIncome, amount: Number(e.target.value) })}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none font-bold ${inputBg} ${borderCol} ${textColor}`}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${mutedText}`}>Type</label>
                  <select
                    value={newIncome.type}
                    onChange={(e) => setNewIncome({ ...newIncome, type: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${inputBg} ${borderCol} ${textColor}`}
                  >
                    <option value="Salary">Salary</option>
                    <option value="Gift">Gift / Pocket Money</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-widest ${mutedText}`}>Source / Note</label>
                  <input
                    type="text"
                    value={newIncome.source}
                    onChange={(e) => setNewIncome({ ...newIncome, source: e.target.value })}
                    className={`w-full px-4 py-3 rounded-xl border outline-none font-bold ${inputBg} ${borderCol} ${textColor}`}
                    placeholder="e.g. Dad, Company"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddIncome}
                  disabled={saving || newIncome.amount <= 0}
                  className={`flex-1 py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90' : 'bg-emerald-500 text-white hover:bg-emerald-600')}`}
                >
                  {saving ? 'Recording...' : 'Record Income'}
                </button>
                <button
                  onClick={() => setIsAddingIncome(false)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : (isPink ? 'bg-black/5 text-black hover:bg-black/10' : 'bg-white/5 text-white hover:bg-white/10')}`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Income History */}
        <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-black ${textColor} flex items-center gap-2`}>
              <History className="w-6 h-6" />
              Income History
            </h3>
            <span className={`text-xs font-bold uppercase tracking-widest ${mutedText}`}>
              {format(new Date(), 'MMMM yyyy')}
            </span>
          </div>
          
          <div className="space-y-4">
            {incomeEntries.length === 0 ? (
              <div className={`py-12 text-center border-2 border-dashed ${borderCol} rounded-3xl`}>
                <IndianRupee className={`w-12 h-12 mx-auto mb-3 opacity-20 ${textColor}`} />
                <p className={`font-bold ${mutedText}`}>No income recorded this month</p>
              </div>
            ) : (
              incomeEntries.map((entry) => (
                <div key={entry.id} className={`flex items-center justify-between p-5 rounded-2xl border ${borderCol} ${isWhite ? 'bg-stone-50' : 'bg-white/5'} group`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isPink ? 'bg-black text-white' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-bold ${textColor}`}>{entry.source}</p>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${mutedText}`}>
                        {entry.type} • {format(parseISO(entry.date), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`text-xl font-black ${textColor}`}>₹{entry.amount.toLocaleString()}</p>
                    <button
                      onClick={() => handleDeleteIncome(entry.id)}
                      className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/20 hover:text-rose-500 ${mutedText}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Action to Breakdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-3xl border ${isWhite ? 'bg-stone-50 border-stone-200' : (isPink ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10')} flex items-center justify-between group cursor-pointer`}
          onClick={() => navigate('/breakdown')}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isWhite ? 'bg-white shadow-sm' : 'bg-white/10'}`}>
              <TrendingUp className={`w-6 h-6 ${isWhite ? 'text-stone-600' : (isPink ? 'text-black' : 'text-white')}`} />
            </div>
            <div>
              <h4 className={`font-bold ${textColor}`}>Allocate Salary</h4>
              <p className={`text-sm ${mutedText}`}>Break down your income into categories</p>
            </div>
          </div>
          <ArrowRight className={`w-6 h-6 ${mutedText} group-hover:translate-x-1 transition-transform`} />
        </motion.div>

        {salaryData?.updatedAt && (
          <div className="flex items-center justify-center gap-2 opacity-40">
            <Clock className="w-3 h-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Last updated: {format(salaryData.updatedAt.toDate(), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
