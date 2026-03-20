import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart as PieChartIcon, 
  Save, 
  IndianRupee, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Home,
  Utensils,
  Car,
  FileText,
  PiggyBank,
  User,
  MoreHorizontal
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORIES = [
  { name: 'Rent', icon: Home, color: '#3b82f6' },
  { name: 'Food', icon: Utensils, color: '#ef4444' },
  { name: 'Travel', icon: Car, color: '#f59e0b' },
  { name: 'Bills', icon: FileText, color: '#8b5cf6' },
  { name: 'Savings', icon: PiggyBank, color: '#10b981' },
  { name: 'Personal', icon: User, color: '#ec4899' },
  { name: 'Others', icon: MoreHorizontal, color: '#6b7280' }
] as const;

interface SalaryData {
  amount: number;
  breakdown: {
    [key: string]: number;
  };
}

interface Expense {
  amount: number;
  category: string;
  date: any;
}

export default function Breakdown({ user, partner }: { user: any; partner: any }) {
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [breakdown, setBreakdown] = useState<{ [key: string]: number }>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

    // Listen to salary data
    const unsubSalary = onSnapshot(doc(db, 'salaries', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SalaryData;
        setSalaryData(data);
        setBreakdown(data.breakdown || {});
      }
      setLoading(false);
    });

    // Listen to current month's expenses
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    );

    const unsubExpenses = onSnapshot(q, (snapshot) => {
      const exps = snapshot.docs.map(doc => doc.data() as Expense);
      setExpenses(exps);
    });

    return () => {
      unsubSalary();
      unsubExpenses();
    };
  }, [user?.uid]);

  const totalAllocated = useMemo(() => {
    return Object.values(breakdown).reduce((sum: number, val: number) => sum + (val || 0), 0);
  }, [breakdown]);

  const remainingBalance = (salaryData?.amount || 0) - totalAllocated;

  const categorySpending = useMemo(() => {
    const spending: { [key: string]: number } = {};
    expenses.forEach(exp => {
      spending[exp.category] = (spending[exp.category] || 0) + exp.amount;
    });
    return spending;
  }, [expenses]);

  const handleSave = async () => {
    if (!user?.uid || !salaryData) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'salaries', user.uid), {
        breakdown,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving breakdown:", error);
    } finally {
      setSaving(false);
    }
  };

  const chartData = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat.name,
      value: breakdown[cat.name] || 0,
      color: cat.color
    })).filter(item => item.value > 0);
  }, [breakdown]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!salaryData) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} text-center space-y-4 max-w-md`}>
          <div className={`w-16 h-16 rounded-2xl ${isWhite ? 'bg-stone-100' : 'bg-white/5'} flex items-center justify-center mx-auto`}>
            <IndianRupee className={`w-8 h-8 ${textColor}`} />
          </div>
          <h2 className={`text-2xl font-bold ${textColor}`}>No Salary Set</h2>
          <p className={mutedText}>Please set your monthly salary first to start the breakdown.</p>
          <button
            onClick={() => window.location.href = '/salary'}
            className={`w-full py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]')}`}
          >
            Set Salary Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className={`text-4xl font-black tracking-tight ${textColor}`}>
              Salary Breakdown
            </h1>
            <p className={mutedText}>Allocate your ₹{salaryData.amount.toLocaleString()} monthly income</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]')}`}
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Breakdown'}
            </button>
          </div>
        </div>

        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-2xl ${isPink ? 'bg-black/10 border-black/20 text-black' : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'} flex items-center gap-3`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold">Breakdown saved successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Monthly Salary</p>
            <p className={`text-3xl font-black ${textColor}`}>₹{salaryData.amount.toLocaleString()}</p>
          </div>
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Total Allocated</p>
            <p className={`text-3xl font-black ${totalAllocated > salaryData.amount ? 'text-red-500' : textColor}`}>
              ₹{totalAllocated.toLocaleString()}
            </p>
          </div>
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Remaining Balance</p>
            <p className={`text-3xl font-black ${remainingBalance < 0 ? 'text-red-500' : (isPink ? 'text-black' : 'text-emerald-500')}`}>
              ₹{remainingBalance.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Allocation Inputs */}
          <div className="space-y-4">
            <h3 className={`text-xl font-bold ${textColor} flex items-center gap-2`}>
              <TrendingUp className="w-5 h-5" />
              Category Allocation
            </h3>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const allocated = breakdown[cat.name] || 0;
                const spent = categorySpending[cat.name] || 0;
                const percentage = allocated > 0 ? (spent / allocated) * 100 : 0;
                const isOverBudget = spent > allocated && allocated > 0;
                const isNearLimit = percentage >= 80 && percentage <= 100;

                return (
                  <motion.div
                    key={cat.name}
                    layout
                    className={`p-4 rounded-2xl border ${cardBg} ${borderCol} space-y-3`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                          <cat.icon className="w-5 h-5" />
                        </div>
                        <span className={`font-bold ${textColor}`}>{cat.name}</span>
                      </div>
                      <div className="relative max-w-[150px]">
                        <IndianRupee className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
                        <input
                          type="number"
                          value={breakdown[cat.name] || ''}
                          onChange={(e) => setBreakdown({ ...breakdown, [cat.name]: Number(e.target.value) })}
                          className={`w-full pl-9 pr-3 py-2 rounded-xl border outline-none transition-all font-bold ${inputBg} ${borderCol} ${textColor} focus:ring-2 focus:ring-emerald-500/50`}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Budget Progress */}
                    {allocated > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={mutedText}>Spent: ₹{spent.toLocaleString()}</span>
                          <span className={isOverBudget ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500'}>
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                        <div className={`h-2 rounded-full ${isWhite ? 'bg-stone-100' : (isPink ? 'bg-black/10' : 'bg-white/5')} overflow-hidden`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            className={`h-full rounded-full ${isOverBudget ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : (isPink ? 'bg-black' : 'bg-emerald-500')}`}
                          />
                        </div>
                        {isOverBudget && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" />
                            Budget Exceeded
                          </div>
                        )}
                        {isNearLimit && !isOverBudget && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                            <AlertCircle className="w-3 h-3" />
                            Approaching Limit
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Visualization */}
          <div className="space-y-6">
            <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} flex flex-col items-center justify-center min-h-[400px]`}>
              <h3 className={`text-xl font-bold ${textColor} mb-8`}>Allocation Overview</h3>
              {chartData.length > 0 ? (
                <div className="w-full h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: isWhite ? '#fff' : (isPink ? '#FF8DA1' : '#1a1a1a'),
                          border: `1px solid ${isWhite ? '#e5e7eb' : (isPink ? 'rgba(0,0,0,0.1)' : '#ffffff1a')}`,
                          borderRadius: '12px',
                          color: isWhite ? '#000' : (isPink ? '#000000' : '#fff')
                        }}
                        itemStyle={{ color: isWhite ? '#000' : (isPink ? '#000000' : '#fff') }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <PieChartIcon className={`w-16 h-16 ${mutedText} mx-auto opacity-20`} />
                  <p className={mutedText}>No allocations yet</p>
                </div>
              )}

              {/* Legend */}
              <div className="grid grid-cols-2 gap-4 mt-8 w-full">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className={`text-sm font-medium ${textColor}`}>{item.name}</span>
                    <span className={`text-xs ${mutedText}`}>({((item.value / totalAllocated) * 100).toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Insights */}
            <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-4`}>
              <h4 className={`font-bold ${textColor}`}>Quick Insights</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isWhite ? 'bg-emerald-50' : 'bg-emerald-500/10'}`}>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className={`text-sm ${textColor}`}>
                    You have <span className="font-bold">₹{remainingBalance.toLocaleString()}</span> unallocated.
                  </p>
                </div>
                {totalAllocated > salaryData.amount && (
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isWhite ? 'bg-red-50' : 'bg-red-500/10'}`}>
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    </div>
                    <p className={`text-sm ${textColor}`}>
                      Your allocations exceed your salary by <span className="font-bold text-red-500">₹{(totalAllocated - salaryData.amount).toLocaleString()}</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
