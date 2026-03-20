import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  PiggyBank, 
  ArrowRight,
  User,
  Heart,
  IndianRupee,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

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
  userId: string;
}

export default function CoupleOverview({ user, partner }: { user: any; partner: any }) {
  const [mySalary, setMySalary] = useState<SalaryData | null>(null);
  const [partnerSalary, setPartnerSalary] = useState<SalaryData | null>(null);
  const [myExpenses, setMyExpenses] = useState<Expense[]>([]);
  const [partnerExpenses, setPartnerExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const currentTheme = user.theme || 'dark';
  const isWhite = currentTheme === 'light';
  const isPink = currentTheme === 'pink';
  
  const textColor = isWhite ? 'text-stone-900' : (isPink ? 'text-black font-bold' : 'text-white');
  const mutedText = isWhite ? 'text-stone-500' : (isPink ? 'text-black/60 font-bold' : 'text-white/60');
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1a1a1a]');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-black/10' : 'border-white/10');

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to current user's salary
    const unsubMySalary = onSnapshot(doc(db, 'salaries', user.uid), (docSnap) => {
      if (docSnap.exists()) setMySalary(docSnap.data() as SalaryData);
    });

    // Listen to partner's salary
    let unsubPartnerSalary: () => void;
    if (partner?.uid) {
      unsubPartnerSalary = onSnapshot(doc(db, 'salaries', partner.uid), (docSnap) => {
        if (docSnap.exists()) setPartnerSalary(docSnap.data() as SalaryData);
      });
    }

    // Listen to current month's expenses
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    
    const qMy = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    );

    const unsubMyExpenses = onSnapshot(qMy, (snapshot) => {
      setMyExpenses(snapshot.docs.map(doc => doc.data() as Expense));
    });

    let unsubPartnerExpenses: () => void;
    if (partner?.uid) {
      const qPartner = query(
        collection(db, 'expenses'),
        where('userId', '==', partner.uid),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      unsubPartnerExpenses = onSnapshot(qPartner, (snapshot) => {
        setPartnerExpenses(snapshot.docs.map(doc => doc.data() as Expense));
      });
    }

    setLoading(false);

    return () => {
      unsubMySalary();
      if (unsubPartnerSalary) unsubPartnerSalary();
      unsubMyExpenses();
      if (unsubPartnerExpenses) unsubPartnerExpenses();
    };
  }, [user?.uid, partner?.uid]);

  const stats = useMemo(() => {
    const myTotalSalary = mySalary?.amount || 0;
    const partnerTotalSalary = partnerSalary?.amount || 0;
    const combinedSalary = myTotalSalary + partnerTotalSalary;

    const myTotalSpent = myExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const partnerTotalSpent = partnerExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const combinedSpent = myTotalSpent + partnerTotalSpent;

    const myAllocatedSavings = mySalary?.breakdown?.Savings || 0;
    const partnerAllocatedSavings = partnerSalary?.breakdown?.Savings || 0;
    const combinedSavings = myAllocatedSavings + partnerAllocatedSavings;

    return {
      myTotalSalary, partnerTotalSalary, combinedSalary,
      myTotalSpent, partnerTotalSpent, combinedSpent,
      myAllocatedSavings, partnerAllocatedSavings, combinedSavings,
      combinedRemaining: combinedSalary - combinedSpent
    };
  }, [mySalary, partnerSalary, myExpenses, partnerExpenses]);

  const comparisonData = [
    { name: 'Income', Me: stats.myTotalSalary, Partner: stats.partnerTotalSalary },
    { name: 'Spending', Me: stats.myTotalSpent, Partner: stats.partnerTotalSpent },
    { name: 'Savings', Me: stats.myAllocatedSavings, Partner: stats.partnerAllocatedSavings }
  ];

  const combinedPieData = [
    { name: 'Spent', value: stats.combinedSpent, color: '#ef4444' },
    { name: 'Savings', value: stats.combinedSavings, color: '#10b981' },
    { name: 'Remaining', value: Math.max(0, stats.combinedRemaining - stats.combinedSavings), color: '#3b82f6' }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} text-center space-y-4 max-w-md`}>
          <div className={`w-16 h-16 rounded-2xl ${isWhite ? 'bg-stone-100' : 'bg-white/5'} flex items-center justify-center mx-auto`}>
            <Heart className={`w-8 h-8 ${textColor}`} />
          </div>
          <h2 className={`text-2xl font-bold ${textColor}`}>No Partner Linked</h2>
          <p className={mutedText}>Link a partner in your profile to see combined finance overviews and comparisons.</p>
          <button
            onClick={() => window.location.href = '/profile'}
            className={`w-full py-4 rounded-2xl font-bold transition-all ${isWhite ? 'bg-stone-900 text-white hover:bg-stone-800' : (isPink ? 'bg-black text-white hover:bg-black/90 shadow-lg' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.3)]')}`}
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className={`text-4xl font-black tracking-tight ${textColor} flex items-center gap-3`}>
            <Users className="w-10 h-10" />
            Couple Finance Overview
          </h1>
          <p className={mutedText}>Combined financial health and partner comparisons</p>
        </div>

        {/* Combined Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <Wallet className="w-4 h-4" />
              Combined Income
            </div>
            <p className={`text-3xl font-black ${textColor}`}>₹{stats.combinedSalary.toLocaleString()}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <Receipt className="w-4 h-4" />
              Combined Spending
            </div>
            <p className={`text-3xl font-black text-red-500`}>₹{stats.combinedSpent.toLocaleString()}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <PiggyBank className="w-4 h-4" />
              Combined Savings
            </div>
            <p className={`text-3xl font-black text-emerald-500`}>₹{stats.combinedSavings.toLocaleString()}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className={`p-6 rounded-3xl border ${cardBg} ${borderCol} space-y-2`}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
              <TrendingUp className="w-4 h-4" />
              Combined Balance
            </div>
            <p className={`text-3xl font-black ${stats.combinedRemaining < 0 ? 'text-red-500' : 'text-blue-500'}`}>
              ₹{stats.combinedRemaining.toLocaleString()}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Comparison Bar Chart */}
          <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6`}>
            <h3 className={`text-xl font-bold ${textColor} flex items-center gap-2`}>
              <BarChart3 className="w-5 h-5" />
              Me vs Partner
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isWhite ? '#e5e7eb' : (isPink ? 'rgba(0,0,0,0.1)' : '#ffffff1a')} vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke={isWhite ? '#78716c' : (isPink ? 'rgba(0,0,0,0.6)' : '#ffffff66')} 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke={isWhite ? '#78716c' : (isPink ? 'rgba(0,0,0,0.6)' : '#ffffff66')} 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `₹${value/1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: isWhite ? '#f5f5f4' : (isPink ? 'rgba(0,0,0,0.05)' : '#ffffff05') }}
                    contentStyle={{ 
                      backgroundColor: isWhite ? '#fff' : (isPink ? '#FF8DA1' : '#1a1a1a'),
                      border: `1px solid ${isWhite ? '#e5e7eb' : (isPink ? 'rgba(0,0,0,0.1)' : '#ffffff1a')}`,
                      borderRadius: '12px',
                      color: isWhite ? '#000' : (isPink ? '#000' : '#fff')
                    }}
                    itemStyle={{ color: isWhite ? '#000' : (isPink ? '#000' : '#fff') }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="Me" fill={isPink ? '#000000' : '#3b82f6'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Partner" fill={isPink ? '#ffffff' : '#ec4899'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Combined Allocation Pie */}
          <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6`}>
            <h3 className={`text-xl font-bold ${textColor} flex items-center gap-2`}>
              <PieChartIcon className="w-5 h-5" />
              Combined Allocation
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={combinedPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {combinedPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: isWhite ? '#fff' : (isPink ? '#FF8DA1' : '#1a1a1a'),
                      border: `1px solid ${isWhite ? '#e5e7eb' : (isPink ? 'rgba(0,0,0,0.1)' : '#ffffff1a')}`,
                      borderRadius: '12px',
                      color: isWhite ? '#000' : (isPink ? '#000' : '#fff')
                    }}
                    itemStyle={{ color: isWhite ? '#000' : (isPink ? '#000' : '#fff') }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6">
              {combinedPieData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className={`text-sm font-medium ${textColor}`}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Spending Comparison */}
          <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-bold ${textColor}`}>Spending Comparison</h3>
              <Receipt className={`w-6 h-6 ${mutedText}`} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${isWhite ? 'bg-stone-100' : 'bg-white/5'} flex items-center justify-center`}>
                    <User className={`w-5 h-5 ${textColor}`} />
                  </div>
                  <span className={`font-bold ${textColor}`}>Me</span>
                </div>
                <span className={`font-black ${textColor}`}>₹{stats.myTotalSpent.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${isWhite ? 'bg-pink-50' : 'bg-pink-500/10'} flex items-center justify-center`}>
                    <Heart className={`w-5 h-5 text-pink-500`} />
                  </div>
                  <span className={`font-bold ${textColor}`}>Partner</span>
                </div>
                <span className={`font-black ${textColor}`}>₹{stats.partnerTotalSpent.toLocaleString()}</span>
              </div>
              <div className={`h-2 rounded-full ${isWhite ? 'bg-stone-100' : 'bg-white/5'} overflow-hidden flex`}>
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${(stats.myTotalSpent / (stats.combinedSpent || 1)) * 100}%` }} 
                />
                <div 
                  className="h-full bg-pink-500" 
                  style={{ width: `${(stats.partnerTotalSpent / (stats.combinedSpent || 1)) * 100}%` }} 
                />
              </div>
              <p className={`text-center text-xs font-bold ${mutedText} uppercase tracking-wider`}>
                {stats.myTotalSpent > stats.partnerTotalSpent ? 'I spent more this month' : 'Partner spent more this month'}
              </p>
            </div>
          </div>

          {/* Savings Comparison */}
          <div className={`p-8 rounded-3xl border ${cardBg} ${borderCol} space-y-6`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xl font-bold ${textColor}`}>Savings Comparison</h3>
              <PiggyBank className={`w-6 h-6 ${mutedText}`} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${isWhite ? 'bg-stone-100' : 'bg-white/5'} flex items-center justify-center`}>
                    <User className={`w-5 h-5 ${textColor}`} />
                  </div>
                  <span className={`font-bold ${textColor}`}>Me</span>
                </div>
                <span className={`font-black ${textColor}`}>₹{stats.myAllocatedSavings.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${isWhite ? 'bg-pink-50' : 'bg-pink-500/10'} flex items-center justify-center`}>
                    <Heart className={`w-5 h-5 text-pink-500`} />
                  </div>
                  <span className={`font-bold ${textColor}`}>Partner</span>
                </div>
                <span className={`font-black ${textColor}`}>₹{stats.partnerAllocatedSavings.toLocaleString()}</span>
              </div>
              <div className={`h-2 rounded-full ${isWhite ? 'bg-stone-100' : 'bg-white/5'} overflow-hidden flex`}>
                <div 
                  className="h-full bg-emerald-500" 
                  style={{ width: `${(stats.myAllocatedSavings / (stats.combinedSavings || 1)) * 100}%` }} 
                />
                <div 
                  className="h-full bg-emerald-300" 
                  style={{ width: `${(stats.partnerAllocatedSavings / (stats.combinedSavings || 1)) * 100}%` }} 
                />
              </div>
              <p className={`text-center text-xs font-bold ${mutedText} uppercase tracking-wider`}>
                {stats.myAllocatedSavings > stats.partnerAllocatedSavings ? 'I saved more this month' : 'Partner saved more this month'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
