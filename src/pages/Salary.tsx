import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Wallet, Save, Edit2, IndianRupee, TrendingUp, ArrowRight } from 'lucide-react';

interface SalaryData {
  amount: number;
  breakdown: {
    Rent: number;
    Food: number;
    Travel: number;
    Bills: number;
    Savings: number;
    Personal: number;
    Others: number;
  };
}

const CATEGORIES = ['Rent', 'Food', 'Travel', 'Bills', 'Savings', 'Personal', 'Others'] as const;

export default function Salary({ user, partner }: { user: any; partner: any }) {
  const [salary, setSalary] = useState<number>(0);
  const [partnerSalary, setPartnerSalary] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        setSalary(docSnap.data().amount || 0);
      }
      setLoading(false);
    });

    // Listen to partner's salary if linked
    let unsubPartner: () => void;
    if (partner?.uid) {
      unsubPartner = onSnapshot(doc(db, 'salaries', partner.uid), (docSnap) => {
        if (docSnap.exists()) {
          setPartnerSalary(docSnap.data().amount || 0);
        }
      });
    }

    return () => {
      unsub();
      if (unsubPartner) unsubPartner();
    };
  }, [user?.uid, partner?.uid]);

  const handleSave = async () => {
    if (!user?.uid) return;
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
          Others: 0
        }
      };

      await setDoc(salaryRef, {
        userId: user.uid,
        amount: salary,
        breakdown: existingData.breakdown,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving salary:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Salary Card */}
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
                    <h3 className={`font-bold ${textColor}`}>My Salary</h3>
                    <p className={`text-xs ${mutedText}`}>Monthly Income</p>
                  </div>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={`p-2 rounded-xl transition-all ${isWhite ? 'hover:bg-stone-100 text-stone-600' : 'hover:bg-white/10 text-white/60 hover:text-white'}`}
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="relative">
                      <IndianRupee className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${mutedText}`} />
                      <input
                        type="number"
                        value={salary}
                        onChange={(e) => setSalary(Number(e.target.value))}
                        className={`w-full pl-12 pr-4 py-4 rounded-2xl border outline-none transition-all font-bold text-2xl ${inputBg} ${borderCol} ${textColor} focus:ring-2 focus:ring-emerald-500/50`}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]')}`}
                      >
                        <Save className="w-5 h-5" />
                        {saving ? 'Saving...' : 'Save Salary'}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className={`px-6 py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' : (isPink ? 'bg-black/5 text-black hover:bg-black/10' : 'bg-white/5 text-white hover:bg-white/10')}`}
                      >
                        Cancel
                      </button>
                    </div>
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

          {/* Partner Salary Card */}
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
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl ${isWhite ? 'bg-stone-100' : 'bg-white/5'}`}>
                  <TrendingUp className={`w-6 h-6 ${isWhite ? 'text-stone-600' : (isPink ? 'text-black' : 'text-white')}`} />
                </div>
                <div>
                  <h3 className={`font-bold ${textColor}`}>Partner Salary</h3>
                  <p className={`text-xs ${mutedText}`}>Linked Account</p>
                </div>
              </div>

              <div className="space-y-4">
                {partner ? (
                  partnerSalary !== null ? (
                    <div className="flex items-baseline gap-2">
                      <span className={`text-5xl font-black tracking-tight ${textColor}`}>
                        ₹{partnerSalary.toLocaleString()}
                      </span>
                      <span className={`text-sm font-medium ${mutedText}`}>/ month</span>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-2xl border border-dashed ${borderCol} ${mutedText} text-sm`}>
                      Partner hasn't added their salary yet
                    </div>
                  )
                ) : (
                  <div className={`p-4 rounded-2xl border border-dashed ${borderCol} ${mutedText} text-sm`}>
                    No partner linked. Link a partner in Profile to see their salary.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Action to Breakdown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-3xl border ${isWhite ? 'bg-stone-50 border-stone-200' : (isPink ? 'bg-black/5 border-black/10' : 'bg-white/5 border-white/10')} flex items-center justify-between group cursor-pointer`}
          onClick={() => window.location.href = '/breakdown'}
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
      </div>
    </div>
  );
}
