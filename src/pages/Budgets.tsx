import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { PieChart, Plus, Trash2, Target, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Budgets({ user }: { user: any }) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newBudget, setNewBudget] = useState({
    category: 'Food & Dining',
    amount: ''
  });

  const currentTheme = user?.theme || 'dark';
  const isPink = currentTheme === 'pink';
  const isWhite = currentTheme === 'light';
  const isDark = currentTheme === 'dark';

  const primaryColor = isWhite ? 'bg-black text-white shadow-lg' : (isPink ? 'bg-black text-white shadow-lg' : 'bg-white/10 backdrop-blur-md border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20');
  const primaryText = isPink ? 'text-black' : 'text-white';
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1e1e1e]');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-black/10' : 'border-white/10');
  const textColor = isWhite ? 'text-black font-bold' : (isPink ? 'text-black font-bold' : 'text-white');
  const mutedText = isWhite ? 'text-black font-bold' : (isPink ? 'text-black/60 font-bold' : 'text-white/60');
  const boldTextColor = isWhite ? 'text-black font-bold' : (isPink ? 'text-black font-bold' : 'text-white');

  const categories = [
    'Food & Dining', 'Shopping', 'Transportation', 'Entertainment',
    'Bills & Utilities', 'Health & Fitness', 'Travel', 'Education',
    'Gifts & Donations', 'Investments', 'Others'
  ];

  useEffect(() => {
    if (!user) return;

    const monthStr = format(currentMonth, 'yyyy-MM');
    const bQuery = query(
      collection(db, 'budgets'),
      where('partnerId', 'in', [user.uid, user.partnerId || '']),
      where('month', '==', monthStr)
    );

    const unsubscribeBudgets = onSnapshot(bQuery, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error listening to budgets:", error);
    });

    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    const eQuery = query(
      collection(db, 'expenses'),
      where('partnerId', 'in', [user.uid, user.partnerId || '']),
      where('date', '>=', start),
      where('date', '<=', end)
    );

    const unsubscribeExpenses = onSnapshot(eQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => doc.data()));
    }, (error) => {
      console.error("Error listening to expenses in budgets:", error);
    });

    return () => {
      unsubscribeBudgets();
      unsubscribeExpenses();
    };
  }, [user, currentMonth]);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.amount) return;

    try {
      await addDoc(collection(db, 'budgets'), {
        userId: user.uid,
        partnerId: user.partnerId || user.uid,
        category: newBudget.category,
        amount: parseFloat(newBudget.amount),
        month: format(currentMonth, 'yyyy-MM'),
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewBudget({ category: 'Food & Dining', amount: '' });
    } catch (err) {
      console.error('Error adding budget:', err);
    }
  };

  const deleteBudget = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'budgets', deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error('Error deleting budget:', err);
    }
  };

  const getCategorySpending = (category: string) => {
    return expenses
      .filter(e => e.category === category)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpending = budgets.reduce((sum, b) => sum + getCategorySpending(b.category), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-bold ${boldTextColor} flex items-center gap-3`}>
            <Wallet className="w-8 h-8 text-emerald-500" />
            Monthly Budgets
          </h2>
          <p className={mutedText}>Plan your spending and track category limits</p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${cardBg} p-1 rounded-xl border ${borderCol}`}>
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className={`p-2 ${isWhite ? 'bg-black text-white' : 'bg-white/10 backdrop-blur-md border border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]'} rounded-lg transition-all hover:opacity-80`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className={`px-4 font-bold ${boldTextColor}`}>
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className={`p-2 ${isWhite ? 'bg-black text-white' : 'bg-white/10 backdrop-blur-md border border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]'} rounded-lg transition-all hover:opacity-80`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className={`flex items-center gap-2 px-6 py-3 ${isWhite ? 'bg-black text-white' : 'bg-white/10 backdrop-blur-md border border-white/30 text-white shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20'} rounded-2xl font-bold hover:opacity-80 transition-all`}
          >
            <Plus className="w-5 h-5" />
            Set Budget
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${cardBg} p-6 rounded-3xl border ${borderCol} shadow-sm`}>
          <p className={`text-sm font-bold ${mutedText} uppercase mb-1`}>Total Budget</p>
          <p className={`text-3xl font-bold ${boldTextColor}`}>₹{totalBudget.toLocaleString()}</p>
        </div>
        <div className={`${cardBg} p-6 rounded-3xl border ${borderCol} shadow-sm`}>
          <p className={`text-sm font-bold ${mutedText} uppercase mb-1`}>Total Spent</p>
          <p className={`text-3xl font-bold ${boldTextColor}`}>₹{totalSpending.toLocaleString()}</p>
        </div>
        <div className={`${cardBg} p-6 rounded-3xl border ${borderCol} shadow-sm`}>
          <p className={`text-sm font-bold ${mutedText} uppercase mb-1`}>Remaining</p>
          <p className={`text-3xl font-bold ${totalBudget - totalSpending < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
            ₹{(totalBudget - totalSpending).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {budgets.length === 0 ? (
          <div className={`${cardBg} col-span-full p-12 rounded-3xl border ${borderCol} text-center space-y-4`}>
            <Target className="w-16 h-16 text-white/20 mx-auto" />
            <h3 className={`text-xl font-bold ${boldTextColor}`}>No budgets set for this month</h3>
            <p className={mutedText}>Start by setting a spending limit for a category.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className={`inline-flex items-center gap-2 px-6 py-3 ${primaryColor} text-white rounded-2xl font-bold hover:opacity-90 transition-all`}
            >
              <Plus className="w-5 h-5" />
              Set First Budget
            </button>
          </div>
        ) : (
          budgets.map((budget) => {
            const spent = getCategorySpending(budget.category);
            const percent = Math.min((spent / budget.amount) * 100, 100);
            const isOver = spent > budget.amount;

            return (
              <motion.div
                layout
                key={budget.id}
                className={`${cardBg} p-6 rounded-3xl border ${borderCol} shadow-sm space-y-4`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`text-lg font-bold ${boldTextColor}`}>{budget.category}</h3>
                    <p className={`text-sm ${mutedText}`}>Limit: ₹{budget.amount.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setDeleteId(budget.id)}
                    className={`p-2 ${mutedText} hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-bold">
                    <span className={isOver ? 'text-red-500' : 'text-emerald-500'}>
                      Spent: ₹{spent.toLocaleString()}
                    </span>
                    <span className={mutedText}>{Math.round(percent)}%</span>
                  </div>
                  <div className={`h-3 ${isPink ? 'bg-black/10' : 'bg-white/5'} rounded-full overflow-hidden`}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      className={`h-full transition-colors ${
                        percent > 90 ? 'bg-red-500' :
                        percent > 70 ? 'bg-orange-500' :
                        (isPink ? 'bg-black' : 'bg-emerald-500')
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {isOver ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Over budget by ₹{(spent - budget.amount).toLocaleString()}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      ₹{(budget.amount - spent).toLocaleString()} remaining
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`${cardBg} w-full max-w-md rounded-3xl p-8 shadow-2xl border ${borderCol}`}
            >
              <h3 className={`text-2xl font-bold mb-6 ${boldTextColor}`}>Set Category Budget</h3>
              <form onSubmit={handleAddBudget} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${mutedText}`}>CATEGORY</label>
                  <select
                    className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-stone-50' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                    value={newBudget.category}
                    onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  >
                    {categories.map(c => <option key={c} value={c} className={`${cardBg} ${textColor}`}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${mutedText}`}>MONTHLY LIMIT (₹)</label>
                  <input
                    required
                    type="number"
                    className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-stone-50' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                    placeholder="e.g. 5000"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`flex-1 py-4 rounded-xl font-bold ${isPink ? 'bg-black/10 text-black/60' : 'bg-white/5 text-stone-400'} hover:opacity-80 transition-all`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-4 ${primaryColor} text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg`}
                  >
                    Save Budget
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Budget?"
        message="Are you sure you want to delete this budget limit? This action cannot be undone."
        confirmText="Delete"
        onConfirm={deleteBudget}
        onCancel={() => setDeleteId(null)}
        isDanger={true}
        theme={currentTheme}
      />
    </div>
  );
}
