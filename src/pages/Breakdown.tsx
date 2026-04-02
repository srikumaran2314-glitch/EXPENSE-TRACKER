import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot, collection, query, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
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
  Gamepad2,
  MoreHorizontal,
  ArrowRight,
  Zap,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORIES = [
  { name: 'Rent', icon: Home, color: '#3b82f6' },
  { name: 'Food', icon: Utensils, color: '#ef4444' },
  { name: 'Travel', icon: Car, color: '#f59e0b' },
  { name: 'Bills', icon: FileText, color: '#8b5cf6' },
  { name: 'Savings', icon: PiggyBank, color: '#10b981' },
  { name: 'Personal', icon: User, color: '#ec4899' },
  { name: 'Entertainment', icon: Gamepad2, color: '#f43f5e' },
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
  const navigate = useNavigate();
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [breakdown, setBreakdown] = useState<{ [key: string]: number }>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lastMonthExpenses, setLastMonthExpenses] = useState<Expense[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
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
      } else {
        setSalaryData(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error listening to salary:", error);
      setLoading(false);
    });

    // Listen to current month's expenses
    const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    
    const q = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    );

    const unsubExpenses = onSnapshot(q, (snapshot) => {
      const exps = snapshot.docs.map(doc => doc.data() as Expense);
      setExpenses(exps);
    }, (error) => {
      console.error("Error listening to expenses:", error);
    });

    // Fetch last month's expenses for insights
    const lastMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const lastMonthEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const lastMonthQ = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('date', '>=', lastMonthStart),
      where('date', '<=', lastMonthEnd)
    );
    const unsubLastMonth = onSnapshot(lastMonthQ, (snapshot) => {
      setLastMonthExpenses(snapshot.docs.map(doc => doc.data() as Expense));
    });

    // Listen to income entries for current month
    const incomeQ = query(
      collection(db, 'income_entries'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const unsubIncome = onSnapshot(incomeQ, (snapshot) => {
      setIncomeEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubSalary();
      unsubExpenses();
      unsubLastMonth();
      unsubIncome();
    };
  }, [user?.uid]);

  const totalIncomeThisMonth = useMemo(() => {
    return incomeEntries.reduce((sum, entry) => sum + entry.amount, 0);
  }, [incomeEntries]);

  const totalAllocated = useMemo(() => {
    return Object.values(breakdown).reduce((sum: number, val: number) => sum + (val || 0), 0);
  }, [breakdown]);

  const remainingBalance = (salaryData?.amount || 0) - totalAllocated;

  const categorySpending = useMemo(() => {
    const spending: { [key: string]: number } = {};
    expenses.forEach(exp => {
      const catName = CATEGORIES.find(c => c.name.toLowerCase() === exp.category.toLowerCase())?.name || 'Others';
      spending[catName] = (spending[catName] || 0) + exp.amount;
    });
    return spending;
  }, [expenses]);

  const totalSpent = useMemo(() => {
    return Object.values(categorySpending).reduce((sum: number, val: number) => sum + val, 0);
  }, [categorySpending]);

  const netSavings = totalIncomeThisMonth - totalSpent;

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
      alert("Failed to save breakdown. Please try again.");
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
      <div className="flex-1 p-6 space-y-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col gap-2">
            <div className={`h-10 ${isWhite ? 'bg-stone-100' : 'bg-white/10'} rounded-xl w-64 animate-pulse`} />
            <div className={`h-4 ${isWhite ? 'bg-stone-100' : 'bg-white/10'} rounded-lg w-48 animate-pulse`} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`${cardBg} p-6 rounded-3xl border ${borderCol} h-32 animate-pulse`} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className={`${cardBg} h-[600px] rounded-3xl border ${borderCol} animate-pulse`} />
            <div className={`${cardBg} h-[600px] rounded-3xl border ${borderCol} animate-pulse`} />
          </div>
        </div>
      </div>
    );
  }

  if (!salaryData || salaryData.amount === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
        <div className={`p-10 rounded-[40px] border ${cardBg} ${borderCol} text-center space-y-6 max-w-lg shadow-2xl relative overflow-hidden`}>
          <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-5 ${isPink ? 'bg-black' : 'bg-white'}`} />
          <div className={`w-24 h-24 rounded-3xl ${isWhite ? 'bg-stone-100' : 'bg-white/5'} flex items-center justify-center mx-auto shadow-inner`}>
            <IndianRupee className={`w-12 h-12 ${textColor}`} />
          </div>
          <div className="space-y-2">
            <h2 className={`text-4xl font-black tracking-tight ${textColor}`}>Set your salary first</h2>
            <p className={`text-lg ${mutedText}`}>Add your monthly salary to begin breaking down your budget into categories and track spending in real-time.</p>
          </div>
          <button
            onClick={() => navigate('/salary')}
            className={`w-full py-5 rounded-3xl font-black text-lg transition-all flex items-center justify-center gap-3 group ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_30px_rgba(16,185,129,0.4)]')}`}
          >
            Go to Salary Page
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
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
              className={`relative flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]')}`}
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
                    <span>{saving ? 'Saving...' : 'Save Breakdown'}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Subtle floating particle animation on success */}
              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: -40 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="absolute top-0 text-emerald-400 text-xs font-black uppercase tracking-widest pointer-events-none"
                >
                  ✨ Saved
                </motion.div>
              )}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2 relative overflow-hidden group`}>
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <IndianRupee className="w-24 h-24" />
            </div>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Actual Income</p>
            <p className={`text-3xl font-black ${textColor}`}>₹{totalIncomeThisMonth.toLocaleString()}</p>
          </div>
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2 relative overflow-hidden group`}>
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-24 h-24" />
            </div>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Total Allocated</p>
            <p className={`text-3xl font-black ${totalAllocated > salaryData.amount ? 'text-red-500' : textColor}`}>
              ₹{totalAllocated.toLocaleString()}
            </p>
          </div>
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2 relative overflow-hidden group`}>
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown className="w-24 h-24" />
            </div>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Total Spent</p>
            <p className={`text-3xl font-black ${totalSpent > totalAllocated ? 'text-red-500' : textColor}`}>
              ₹{totalSpent.toLocaleString()}
            </p>
          </div>
          <div className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2 relative overflow-hidden group`}>
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <PiggyBank className="w-24 h-24" />
            </div>
            <p className={`text-sm font-bold ${mutedText} uppercase tracking-wider`}>Net Savings</p>
            <p className={`text-3xl font-black ${netSavings < 0 ? 'text-red-500' : (isPink ? 'text-black' : 'text-emerald-500')}`}>
              ₹{netSavings.toLocaleString()}
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
                        <div className="flex flex-col">
                          <span className={`font-bold ${textColor}`}>{cat.name}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-tighter ${isOverBudget ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-emerald-500/60'}`}>
                            {isOverBudget ? 'Over Budget' : isNearLimit ? 'Near Limit' : 'On Track'}
                          </span>
                        </div>
                      </div>
                      <div className="relative max-w-[150px]">
                        <IndianRupee className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${mutedText}`} />
                        <input
                          type="number"
                          value={breakdown[cat.name] || ''}
                          onChange={(e) => setBreakdown({ ...breakdown, [cat.name]: Number(e.target.value) })}
                          className={`w-full pl-9 pr-3 py-2 rounded-xl border outline-none transition-all font-bold ${inputBg} ${borderCol} ${textColor} focus:ring-2 focus:ring-emerald-500/50 ${isOverBudget ? 'border-red-500/50' : ''}`}
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
            <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} flex flex-col items-center justify-center min-h-[450px] relative overflow-hidden`}>
              <div className={`absolute -left-10 -bottom-10 w-40 h-40 rounded-full opacity-5 ${isPink ? 'bg-black' : 'bg-white'}`} />
              <h3 className={`text-xl font-black uppercase tracking-tight ${textColor} mb-8 relative z-10`}>Allocation Overview</h3>
              {chartData.length > 0 ? (
                <div className="w-full h-[300px] relative z-10">
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
                        animationBegin={0}
                        animationDuration={1500}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color} 
                            stroke={isPink ? '#FF8DA1' : (isWhite ? '#fff' : '#1a1a1a')}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className={`${cardBg} p-4 rounded-2xl border ${borderCol} shadow-2xl`}>
                                <p className={`text-xs font-black uppercase tracking-widest mb-1 ${mutedText}`}>{payload[0].name}</p>
                                <p className={`text-lg font-black ${textColor}`}>₹{payload[0].value.toLocaleString()}</p>
                                <p className={`text-[10px] font-bold ${isPink ? 'text-black/40' : 'text-white/40'}`}>
                                  {((payload[0].value / totalAllocated) * 100).toFixed(1)}% of budget
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center space-y-4 relative z-10">
                  <PieChartIcon className={`w-16 h-16 ${mutedText} mx-auto opacity-20`} />
                  <p className={`font-bold ${mutedText}`}>No allocations yet</p>
                </div>
              )}

              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 mt-8 w-full relative z-10">
                {chartData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                      <span className={`text-xs font-bold ${textColor} group-hover:opacity-80 transition-opacity`}>{item.name}</span>
                    </div>
                    <span className={`text-[10px] font-black ${mutedText}`}>₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Smart Insights */}
            <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6 relative overflow-hidden`}>
              <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full opacity-5 ${isPink ? 'bg-black' : 'bg-white'}`} />
              <div className="flex items-center justify-between relative z-10">
                <h4 className={`text-lg font-black uppercase tracking-tight ${textColor} flex items-center gap-2`}>
                  <Zap className="w-5 h-5 text-amber-500" />
                  Smart Insights
                </h4>
              </div>
              <div className="space-y-4 relative z-10">
                {/* Unallocated Insight */}
                {remainingBalance > 0 ? (
                  <div className={`flex items-start gap-4 p-4 rounded-2xl ${isWhite ? 'bg-emerald-50' : 'bg-emerald-500/10'} border ${isWhite ? 'border-emerald-100' : 'border-emerald-500/20'}`}>
                    <div className="p-2 rounded-xl bg-emerald-500/20">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm font-bold ${textColor}`}>Unallocated Funds</p>
                      <p className={`text-xs ${mutedText}`}>You have <span className="font-black text-emerald-500">₹{remainingBalance.toLocaleString()}</span> that hasn't been assigned to any category.</p>
                    </div>
                  </div>
                ) : remainingBalance < 0 ? (
                  <div className={`flex items-start gap-4 p-4 rounded-2xl ${isWhite ? 'bg-red-50' : 'bg-red-500/10'} border ${isWhite ? 'border-red-100' : 'border-red-500/20'}`}>
                    <div className="p-2 rounded-xl bg-red-500/20">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm font-bold ${textColor}`}>Budget Deficit</p>
                      <p className={`text-xs ${mutedText}`}>You've allocated <span className="font-black text-red-500">₹{Math.abs(remainingBalance).toLocaleString()}</span> more than your monthly salary.</p>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-start gap-4 p-4 rounded-2xl ${isWhite ? 'bg-blue-50' : 'bg-blue-500/10'} border ${isWhite ? 'border-blue-100' : 'border-blue-500/20'}`}>
                    <div className="p-2 rounded-xl bg-blue-500/20">
                      <ShieldCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm font-bold ${textColor}`}>Perfect Allocation</p>
                      <p className={`text-xs ${mutedText}`}>Your entire salary has been perfectly allocated across your categories.</p>
                    </div>
                  </div>
                )}

                {/* Overspending Insight */}
                {Object.entries(categorySpending).some(([cat, spent]) => spent > (breakdown[cat] || 0) && (breakdown[cat] || 0) > 0) && (
                  <div className={`flex items-start gap-4 p-4 rounded-2xl ${isWhite ? 'bg-rose-50' : 'bg-rose-500/10'} border ${isWhite ? 'border-rose-100' : 'border-rose-500/20'}`}>
                    <div className="p-2 rounded-xl bg-rose-500/20">
                      <TrendingDown className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm font-bold ${textColor}`}>Overspending Alert</p>
                      <p className={`text-xs ${mutedText}`}>
                        You've exceeded your budget in {Object.entries(categorySpending).filter(([cat, spent]) => spent > (breakdown[cat] || 0) && (breakdown[cat] || 0) > 0).length} categories.
                      </p>
                    </div>
                  </div>
                )}

                {/* Savings Insight */}
                {breakdown['Savings'] > 0 && (
                  <div className={`flex items-start gap-4 p-4 rounded-2xl ${isWhite ? 'bg-indigo-50' : 'bg-indigo-500/10'} border ${isWhite ? 'border-indigo-100' : 'border-indigo-500/20'}`}>
                    <div className="p-2 rounded-xl bg-indigo-500/20">
                      <PiggyBank className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="space-y-1">
                      <p className={`text-sm font-bold ${textColor}`}>Savings Rate</p>
                      <p className={`text-xs ${mutedText}`}>
                        You are aiming to save <span className="font-black text-indigo-500">{((breakdown['Savings'] / (totalIncomeThisMonth || salaryData.amount)) * 100).toFixed(1)}%</span> of your income this month.
                      </p>
                    </div>
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
