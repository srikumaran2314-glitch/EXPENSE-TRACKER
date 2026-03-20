import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { collection, query, where, onSnapshot, orderBy, or, limit, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, IndianRupee, Users, Calendar, HandCoins, ArrowRight, Receipt, Target, Heart, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, amount, icon: Icon, trend, color, cardBg, textColor, mutedText, borderCol, isBalance, isWhite }: any) => (
  <div className={`${cardBg} p-6 rounded-2xl shadow-sm border ${borderCol}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className={`w-6 h-6 ${isWhite ? 'text-white' : (color === 'bg-white' ? 'text-black' : 'text-white')}`} />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className={`text-sm ${mutedText} font-medium`}>{title}</p>
    <h3 className={`text-2xl font-bold mt-1 ${textColor}`}>
      {isBalance && amount > 0 ? '+' : ''}₹{amount.toLocaleString()}
    </h3>
    {isBalance && (
      <p className={`text-[10px] mt-1 font-bold ${amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {amount >= 0 ? 'Owed to you' : 'You owe partner'}
      </p>
    )}
  </div>
);

export default function Dashboard({ user, partner }: { user: any, partner: any }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [recentExpenseFilter, setRecentExpenseFilter] = useState<'All' | 'Me' | 'Partner'>('All');
  const [chartFilter, setChartFilter] = useState<'Me' | 'Partner' | 'Both'>('Me');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [salaryData, setSalaryData] = useState<any>(null);
  const [partnerSalaryData, setPartnerSalaryData] = useState<any>(null);

  const currentTheme = user?.theme || 'dark';
  const isPink = currentTheme === 'pink';
  const isWhite = currentTheme === 'light';
  const isDark = currentTheme === 'dark';

  const primaryColor = isWhite ? '#000000' : (isPink ? '#000000' : '#FFFFFF');
  const primaryBg = 'bg-white/10 backdrop-blur-md border border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20';
  const primaryText = isPink ? 'text-black' : 'text-white';
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1e1e1e]');
  const textColor = isWhite ? 'text-black font-bold' : (isPink ? 'text-black font-bold' : 'text-white');
  const mutedText = isWhite ? 'text-black font-bold' : (isPink ? 'text-black/60 font-bold' : 'text-white/60');
  const boldTextColor = isWhite ? 'text-black font-bold' : (isPink ? 'text-black font-bold' : 'text-white');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-black/10' : 'border-white/10');

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, 'expenses'),
      or(
        where('userId', '==', user.uid),
        where('partnerId', '==', user.uid)
      ),
      orderBy('date', 'desc')
    );

    const unsubscribeExpenses = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(docs);
      setLoading(false);
    });

    const monthStr = format(now, 'yyyy-MM');
    const bQuery = query(
      collection(db, 'budgets'),
      where('partnerId', 'in', [user.uid, user.partnerId || '']),
      where('month', '==', monthStr)
    );
    const unsubscribeBudgets = onSnapshot(bQuery, (snapshot) => {
      setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const wQuery = query(
      collection(db, 'wishlist'),
      where('partnerId', 'in', [user.uid, user.partnerId || '']),
      where('isCompleted', '==', false),
      limit(3)
    );
    const unsubscribeWishlist = onSnapshot(wQuery, (snapshot) => {
      setWishlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSalary = onSnapshot(doc(db, 'salaries', user.uid), (docSnap) => {
      if (docSnap.exists()) setSalaryData(docSnap.data());
    });

    let unsubPartnerSalary: () => void;
    if (partner?.uid) {
      unsubPartnerSalary = onSnapshot(doc(db, 'salaries', partner.uid), (docSnap) => {
        if (docSnap.exists()) setPartnerSalaryData(docSnap.data());
      });
    }

    return () => {
      unsubscribeExpenses();
      unsubscribeBudgets();
      unsubscribeWishlist();
      unsubSalary();
      if (unsubPartnerSalary) unsubPartnerSalary();
    };
  }, [user?.uid, partner?.uid]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const filteredRecentExpenses = expenses
    .filter(e => {
      if (recentExpenseFilter === 'All') return true;
      if (recentExpenseFilter === 'Me') return e.userId === user.uid;
      if (recentExpenseFilter === 'Partner') return e.userId !== user.uid;
      return true;
    })
    .slice(0, 5);

  const monthlyExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }));
  
  const filteredChartExpenses = monthlyExpenses.filter(e => {
    if (chartFilter === 'Both') return true;
    if (chartFilter === 'Me') return e.userId === user.uid;
    if (chartFilter === 'Partner') return e.userId !== user.uid;
    return true;
  });

  const totalMonthly = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const myMonthly = monthlyExpenses.filter(e => e.userId === user.uid).reduce((sum, e) => sum + e.amount, 0);
  const partnerMonthly = monthlyExpenses.filter(e => e.userId !== user.uid).reduce((sum, e) => sum + e.amount, 0);

  const totalOwedToMe = expenses
    .filter(e => e.receivableFrom && e.userId === user.uid)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIOwe = expenses
    .filter(e => e.receivableFrom && e.userId !== user.uid)
    .reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const categoryData = Object.entries(
    filteredChartExpenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const userSplitData = [
    { name: 'Me', value: myMonthly, color: isPink ? '#FF8DA1' : '#10b981' },
    { name: partner?.name || 'Partner', value: partnerMonthly, color: '#ffffff' }
  ];

  const pieData = chartFilter === 'Both' ? userSplitData : categoryData;

  const dailyData = Object.entries(
    monthlyExpenses.reduce((acc: any, e) => {
      const day = format(parseISO(e.date), 'dd');
      if (!acc[day]) acc[day] = { me: 0, partner: 0 };
      if (e.userId === user.uid) {
        acc[day].me += e.amount;
      } else {
        acc[day].partner += e.amount;
      }
      return acc;
    }, {})
  ).map(([day, data]: any) => ({ 
    day, 
    me: data.me, 
    partner: data.partner 
  })).sort((a, b) => Number(a.day) - Number(b.day));

  if (loading) return (
    <div className="h-full flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin opacity-20"></div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${textColor}`}>Financial Overview</h2>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${user?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
              <span className={`text-xs font-bold ${boldTextColor}`}>Me: {user?.status === 'online' ? 'Online' : 'Offline'}</span>
            </div>
            {partner && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${partner?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                <span className={`text-xs font-bold ${isPink ? 'bg-black/10 text-black px-2 py-0.5 rounded' : (isWhite ? 'text-black' : boldTextColor)}`}>
                  {partner.name}: {partner?.status === 'online' ? 'Online' : 'Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`${cardBg} px-4 py-2 rounded-xl border ${borderCol} flex items-center gap-2 text-sm font-medium ${textColor}`}>
            <Calendar className={`w-4 h-4 ${mutedText}`} />
            {format(now, 'MMM dd, yyyy')}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Monthly Income" 
          amount={salaryData?.amount || 0} 
          icon={Wallet} 
          color={isPink ? 'bg-black/10' : 'bg-emerald-500'} 
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
          isWhite={isWhite}
        />
        <StatCard 
          title="Monthly Spending" 
          amount={myMonthly} 
          icon={TrendingUp} 
          color="bg-blue-500"
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
          isWhite={isWhite}
        />
        <StatCard 
          title="Net Balance" 
          amount={netBalance} 
          icon={HandCoins} 
          color={netBalance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
          isBalance
          isWhite={isWhite}
        />
        <StatCard 
          title="Remaining Budget" 
          amount={(salaryData?.amount || 0) - myMonthly} 
          icon={Target} 
          color="bg-rose-500"
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
          isWhite={isWhite}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-xl font-bold ${textColor}`}>Spending Insights</h3>
          <div className={`${isWhite ? 'bg-stone-100' : 'bg-white/5'} p-1 rounded-xl flex items-center gap-2`}>
            {(['Me', 'Partner', 'Both'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setChartFilter(f)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  chartFilter === f
                    ? (isWhite ? 'bg-black text-white shadow-lg' : 'bg-white/20 backdrop-blur-md text-white border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)] ring-1 ring-white/30')
                    : (isWhite ? 'text-stone-400 hover:text-black' : 'text-white/40 hover:text-white/60')
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} lg:col-span-1`}>
          <h3 className={`text-lg font-bold mb-6 ${textColor}`}>
            {chartFilter === 'Both' ? 'User Split' : 'Categories'}
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || (chartFilter === 'Me' ? (isPink ? '#000000' : '#10b981') : chartFilter === 'Partner' ? (isPink ? '#ffffff' : '#ffffff') : COLORS[index % COLORS.length])} 
                      stroke={entry.color === '#ffffff' || (chartFilter === 'Partner' && index === 0) ? (isPink ? '#00000020' : '#ffffff20') : 'none'}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isWhite ? 'white' : (isPink ? '#FF8DA1' : '#1c1917'), 
                    borderColor: isWhite ? '#e7e5e4' : (isPink ? 'rgba(0,0,0,0.1)' : '#292524'),
                    color: isWhite ? '#1c1917' : (isPink ? '#000000' : 'white'),
                    borderRadius: '12px',
                    border: '1px solid ' + (isWhite ? '#e7e5e4' : (isPink ? 'rgba(0,0,0,0.1)' : '#292524'))
                  }}
                  itemStyle={{ color: isWhite ? '#1c1917' : (isPink ? '#000000' : 'white') }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {pieData.slice(0, 4).map((item: any, i) => (
              <div key={item.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-2 h-2 rounded-full border ${isPink ? 'border-black/20' : 'border-white/20'}`} 
                    style={{ backgroundColor: item.color || (chartFilter === 'Me' ? (isPink ? '#000000' : '#000000') : chartFilter === 'Partner' ? '#ffffff' : COLORS[i % COLORS.length]) }} 
                  />
                  <span className={mutedText}>{item.name}</span>
                </div>
                <span className={`font-bold ${textColor}`}>₹{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} lg:col-span-2`}>
          <h3 className={`text-lg font-bold mb-6 ${textColor}`}>Daily Spending Trend</h3>
          <div className={`h-[350px] ${isWhite ? 'bg-stone-50' : (isPink ? 'bg-black/5' : 'bg-white/5')} rounded-2xl p-4 border ${borderCol}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isWhite ? '#e7e5e4' : (isPink ? 'rgba(0,0,0,0.1)' : '#ffffff10')} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isWhite ? '#000000' : (isPink ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)'), fontSize: 12, fontWeight: 700}} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: isWhite ? '#000000' : (isPink ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)'), fontSize: 12, fontWeight: 700}} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isWhite ? 'white' : (isPink ? '#FF8DA1' : '#1c1917'), 
                    borderColor: isWhite ? '#e7e5e4' : (isPink ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
                    color: isWhite ? '#1c1917' : (isPink ? '#000000' : 'white'),
                    borderRadius: '16px', 
                    border: '1px solid ' + (isWhite ? '#e7e5e4' : (isPink ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')), 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  itemStyle={{ fontWeight: 'bold', color: isWhite ? '#1c1917' : (isPink ? '#000000' : 'white') }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => <span className={`${isWhite ? 'text-black' : (isPink ? 'text-black' : 'text-white/80')} font-bold text-xs uppercase tracking-wider`}>{value}</span>}
                />
                {(chartFilter === 'Me' || chartFilter === 'Both') && (
                  <Line 
                    type="monotone" 
                    dataKey="me" 
                    name="Me" 
                    stroke={isWhite ? '#000000' : (isPink ? '#000000' : '#10b981')} 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: isWhite ? '#000000' : (isPink ? '#000000' : '#10b981'), stroke: isPink ? '#FF8DA1' : '#ffffff', strokeWidth: 2 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                )}
                {(chartFilter === 'Partner' || chartFilter === 'Both') && (
                  <Line 
                    type="monotone" 
                    dataKey="partner" 
                    name={partner?.name || 'Partner'} 
                    stroke={isWhite ? '#000000' : (isPink ? '#ffffff' : '#3b82f6')} 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: isWhite ? '#000000' : (isPink ? '#ffffff' : '#3b82f6'), stroke: isPink ? '#FF8DA1' : '#ffffff', strokeWidth: 2 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xl font-bold ${textColor} flex items-center gap-2`}>
              <Target className="w-5 h-5 text-emerald-500" />
              Budget Status
            </h3>
            <Link to="/budgets" className={`text-sm font-bold ${isPink ? 'text-black/60' : (isWhite ? 'text-black' : 'text-white/40')}`}>View All</Link>
          </div>
          <div className="space-y-6">
            {budgets.length === 0 ? (
              <p className={`text-center py-4 ${mutedText}`}>No budgets set for this month.</p>
            ) : (
              budgets.slice(0, 3).map(budget => {
                const spent = monthlyExpenses.filter(e => e.category === budget.category).reduce((sum, e) => sum + e.amount, 0);
                const percent = Math.min((spent / budget.amount) * 100, 100);
                return (
                  <div key={budget.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className={textColor}>{budget.category}</span>
                      <span className={mutedText}>₹{spent.toLocaleString()} / ₹{budget.amount.toLocaleString()}</span>
                    </div>
                    <div className={`h-2 ${isPink ? 'bg-black/10' : 'bg-white/5'} rounded-full overflow-hidden`}>
                      <div 
                        className={`h-full ${percent > 90 ? 'bg-red-500' : (isPink ? 'bg-black' : 'bg-emerald-500')}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className={`text-xl font-bold ${textColor} flex items-center gap-2`}>
              <Heart className="w-5 h-5 text-red-500" />
              Wishlist Progress
            </h3>
            <Link to="/wishlist" className={`text-sm font-bold ${isPink ? 'text-black/60' : (isWhite ? 'text-black' : 'text-white/40')}`}>View All</Link>
          </div>
          <div className="space-y-6">
            {wishlist.length === 0 ? (
              <p className={`text-center py-4 ${mutedText}`}>Your wishlist is empty.</p>
            ) : (
              wishlist.map(item => {
                const percent = Math.min((item.savedAmount / item.estimatedAmount) * 100, 100);
                return (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className={textColor}>{item.title}</span>
                      <span className={mutedText}>{Math.round(percent)}%</span>
                    </div>
                    <div className={`h-2 ${isPink ? 'bg-black/10' : 'bg-white/5'} rounded-full overflow-hidden`}>
                      <div 
                        className={`h-full ${isPink ? 'bg-black' : 'bg-blue-500'}`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h3 className={`text-xl font-bold ${textColor}`}>Recent Expenses</h3>
          <div className={`${isWhite ? 'bg-stone-100' : (isPink ? 'bg-black/5' : 'bg-white/5')} p-1 rounded-xl flex items-center gap-2`}>
            {(['All', 'Me', 'Partner'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setRecentExpenseFilter(f)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  recentExpenseFilter === f
                    ? (isWhite ? 'bg-black text-white shadow-lg' : (isPink ? 'bg-black text-white shadow-lg' : 'bg-white/20 backdrop-blur-md text-white border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)] ring-1 ring-white/30'))
                    : (isWhite ? 'text-stone-400 hover:text-black' : (isPink ? 'text-black/40 hover:text-black/60' : 'text-white/40 hover:text-white/60'))
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Link 
            to="/expenses" 
            className={`flex items-center gap-2 text-sm font-bold ${isPink ? 'text-black/60 hover:text-black' : (isWhite ? 'text-black hover:opacity-80' : 'text-white/40 hover:text-white')} transition-colors`}
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {filteredRecentExpenses.map((expense) => (
            <div 
              key={expense.id} 
              className={`flex items-center justify-between p-4 rounded-2xl border ${borderCol} ${isPink ? 'hover:bg-black/5' : 'hover:bg-white/5'} transition-all`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPink ? 'bg-black/10 text-black' : 'bg-white/10 text-white/40'}`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-bold ${textColor}`}>
                    {expense.paidTo || expense.paid_to}
                    {expense.mealType && (
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-md ${isPink ? 'bg-black/10 text-black' : 'bg-white/10 text-white/40'}`}>
                        {expense.mealType}
                      </span>
                    )}
                  </p>
                  <p className={`text-xs ${mutedText}`}>{format(parseISO(expense.date), 'MMM dd, yyyy')} • {expense.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${textColor}`}>₹{expense.amount.toLocaleString()}</p>
                <p className={`text-[10px] ${mutedText}`}>Paid by {expense.paidBy || expense.paid_by}</p>
              </div>
            </div>
          ))}
          {filteredRecentExpenses.length === 0 && (
            <div className={`text-center py-8 ${mutedText}`}>
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
