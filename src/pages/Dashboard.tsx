import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { collection, query, where, onSnapshot, orderBy, or, limit, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, IndianRupee, Users, Calendar, HandCoins, ArrowRight, Receipt, Target, Heart, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, amount, icon: Icon, trend, color, cardBg, textColor, mutedText, borderCol, isBalance, isWhite, isPink }: any) => (
  <div className={`${cardBg} p-6 rounded-2xl shadow-sm border ${borderCol} relative overflow-hidden group`}>
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 transition-transform group-hover:scale-110 ${isPink ? 'bg-black' : 'bg-white'}`} />
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3 rounded-xl ${color} shadow-lg`}>
        <Icon className={`w-6 h-6 ${isWhite ? 'text-white' : (color === 'bg-white' ? 'text-black' : 'text-white')}`} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend > 0 ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className={`text-sm ${mutedText} font-bold uppercase tracking-wider relative z-10`}>{title}</p>
    <h3 className={`text-3xl font-black mt-1 ${textColor} relative z-10`}>
      {isBalance && amount > 0 ? '+' : ''}₹{amount.toLocaleString()}
    </h3>
    {isBalance && (
      <p className={`text-[10px] mt-2 font-black uppercase tracking-widest relative z-10 ${amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {amount >= 0 ? 'Owed to you' : 'You owe partner'}
      </p>
    )}
  </div>
);

export default function Dashboard({ user, partner }: { user: any, partner: any }) {
  const now = new Date();
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
    }, (error) => {
      console.error("Error listening to dashboard expenses:", error);
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
    }, (error) => {
      console.error("Error listening to dashboard budgets:", error);
    });

    const wQuery = query(
      collection(db, 'wishlist'),
      where('partnerId', 'in', [user.uid, user.partnerId || '']),
      where('isCompleted', '==', false),
      limit(3)
    );
    const unsubscribeWishlist = onSnapshot(wQuery, (snapshot) => {
      setWishlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Error listening to dashboard wishlist:", error);
    });

    const unsubSalary = onSnapshot(doc(db, 'salaries', user.uid), (docSnap) => {
      if (docSnap.exists()) setSalaryData(docSnap.data());
    }, (error) => {
      console.error("Error listening to dashboard salary:", error);
    });

    let unsubPartnerSalary: () => void;
    if (partner?.uid) {
      unsubPartnerSalary = onSnapshot(doc(db, 'salaries', partner.uid), (docSnap) => {
        if (docSnap.exists()) setPartnerSalaryData(docSnap.data());
      }, (error) => {
        console.error("Error listening to dashboard partner salary:", error);
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
    { name: 'Me', value: myMonthly, color: isPink ? '#000000' : '#10b981' },
    { name: partner?.name || 'Partner', value: partnerMonthly, color: isPink ? '#FFFFFF' : '#3b82f6' }
  ];

  const pieData = chartFilter === 'Both' ? userSplitData : categoryData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${cardBg} p-4 rounded-2xl border ${borderCol} shadow-xl`}>
          <p className={`text-xs font-black uppercase tracking-widest mb-1 ${mutedText}`}>{payload[0].name}</p>
          <p className={`text-lg font-black ${textColor}`}>₹{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

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

  const SkeletonCard = () => (
    <div className={`${cardBg} p-6 rounded-2xl border ${borderCol} animate-pulse`}>
      <div className="w-12 h-12 bg-white/10 rounded-xl mb-4" />
      <div className="h-4 bg-white/10 rounded w-24 mb-2" />
      <div className="h-8 bg-white/10 rounded w-32" />
    </div>
  );

  if (loading) return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-8 bg-white/10 rounded w-48 animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
        </div>
        <div className="h-10 bg-white/10 rounded w-32 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${cardBg} h-[400px] rounded-3xl border ${borderCol} animate-pulse lg:col-span-1`} />
        <div className={`${cardBg} h-[400px] rounded-3xl border ${borderCol} animate-pulse lg:col-span-2`} />
      </div>
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
          color={isPink ? 'bg-black' : 'bg-emerald-500'} 
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
          isWhite={isWhite}
          isPink={isPink}
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
          isPink={isPink}
          trend={salaryData?.amount ? Math.round((myMonthly / salaryData.amount) * 100) : 0}
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
          isPink={isPink}
        />
        <StatCard 
          title="Remaining" 
          amount={(salaryData?.amount || 0) - myMonthly} 
          icon={Target} 
          color="bg-rose-500"
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
          isWhite={isWhite}
          isPink={isPink}
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
          <div className="h-[300px] relative">
            {pieData.length > 0 ? (
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
                    animationBegin={0}
                    animationDuration={1500}
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color || (chartFilter === 'Me' ? (isPink ? '#000000' : '#10b981') : chartFilter === 'Partner' ? (isPink ? '#ffffff' : '#3b82f6') : COLORS[index % COLORS.length])} 
                        stroke={entry.color === '#ffffff' || (chartFilter === 'Partner' && index === 0) ? (isPink ? '#00000020' : '#ffffff20') : 'none'}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <PieChartIcon className="w-12 h-12 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No data available</p>
              </div>
            )}
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
          <div className={`h-[350px] ${isWhite ? 'bg-stone-50' : (isPink ? 'bg-black/5' : 'bg-white/5')} rounded-2xl p-4 border ${borderCol} relative`}>
            {dailyData.length > 0 ? (
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
                  <Tooltip content={<CustomTooltip />} />
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
                      animationDuration={1500}
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
                      animationDuration={1500}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <TrendingUp className="w-12 h-12 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No trend data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} relative overflow-hidden`}>
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 ${isPink ? 'bg-black' : 'bg-white'}`} />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className={`text-xl font-black ${textColor} flex items-center gap-2 uppercase tracking-tight`}>
                <Target className="w-6 h-6 text-emerald-500" />
                Budget Status
              </h3>
              <Link to="/budgets" className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${isPink ? 'bg-black/10 text-black/60' : (isWhite ? 'bg-stone-100 text-black' : 'bg-white/5 text-white/40')} hover:opacity-80 transition-opacity`}>View All</Link>
            </div>
            <div className="space-y-8 relative z-10">
              {budgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <Target className="w-12 h-12 mb-2" />
                  <p className="text-sm font-bold">No budgets set</p>
                </div>
              ) : (
                budgets.slice(0, 3).map(budget => {
                  const spent = monthlyExpenses.filter(e => e.category === budget.category).reduce((sum, e) => sum + e.amount, 0);
                  const percent = Math.min((spent / budget.amount) * 100, 100);
                  const isOver = spent > budget.amount;
                  return (
                    <div key={budget.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <span className={`text-sm font-black uppercase tracking-wider ${textColor}`}>{budget.category}</span>
                          <p className={`text-[10px] font-bold ${mutedText}`}>
                            {isOver ? 'Exceeded by ' : 'Remaining: '}
                            <span className={isOver ? 'text-rose-500' : 'text-emerald-500'}>
                              ₹{Math.abs(budget.amount - spent).toLocaleString()}
                            </span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-black ${isOver ? 'text-rose-500' : textColor}`}>₹{spent.toLocaleString()}</span>
                          <span className={`text-[10px] font-bold ${mutedText} block`}>of ₹{budget.amount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className={`h-3 ${isPink ? 'bg-black/10' : 'bg-white/5'} rounded-full overflow-hidden p-0.5`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${percent > 90 ? 'bg-rose-500' : (isPink ? 'bg-black' : 'bg-emerald-500')}`} 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} relative overflow-hidden`}>
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 ${isPink ? 'bg-black' : 'bg-white'}`} />
            <div className="flex justify-between items-center mb-6 relative z-10">
              <h3 className={`text-xl font-black ${textColor} flex items-center gap-2 uppercase tracking-tight`}>
                <Heart className="w-6 h-6 text-rose-500" />
                Wishlist Goals
              </h3>
              <Link to="/wishlist" className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${isPink ? 'bg-black/10 text-black/60' : (isWhite ? 'bg-stone-100 text-black' : 'bg-white/5 text-white/40')} hover:opacity-80 transition-opacity`}>View All</Link>
            </div>
            <div className="space-y-8 relative z-10">
              {wishlist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 opacity-40">
                  <Heart className="w-12 h-12 mb-2" />
                  <p className="text-sm font-bold">Wishlist is empty</p>
                </div>
              ) : (
                wishlist.map(item => {
                  const percent = Math.min((item.savedAmount / item.estimatedAmount) * 100, 100);
                  const remaining = item.estimatedAmount - item.savedAmount;
                  return (
                    <div key={item.id} className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="space-y-1">
                          <span className={`text-sm font-black uppercase tracking-wider ${textColor}`}>{item.title}</span>
                          <p className={`text-[10px] font-bold ${mutedText}`}>
                            {remaining <= 0 ? 'Goal Reached!' : `₹${remaining.toLocaleString()} more to go`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-sm font-black text-blue-500`}>{Math.round(percent)}%</span>
                          <span className={`text-[10px] font-bold ${mutedText} block`}>Saved</span>
                        </div>
                      </div>
                      <div className={`h-3 ${isPink ? 'bg-black/10' : 'bg-white/5'} rounded-full overflow-hidden p-0.5`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isPink ? 'bg-black' : 'bg-blue-500'}`} 
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

      <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} relative overflow-hidden`}>
        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-5 ${isPink ? 'bg-black' : 'bg-white'}`} />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
          <div className="space-y-1">
            <h3 className={`text-2xl font-black ${textColor} uppercase tracking-tight`}>Recent Activity</h3>
            <p className={`text-xs font-bold ${mutedText} uppercase tracking-widest`}>Latest financial movements</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`${isWhite ? 'bg-stone-100' : (isPink ? 'bg-black/5' : 'bg-white/5')} p-1 rounded-xl flex items-center gap-1`}>
              {(['All', 'Me', 'Partner'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRecentExpenseFilter(f)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
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
              className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest ${isPink ? 'text-black/60 hover:text-black' : (isWhite ? 'text-black hover:opacity-80' : 'text-white/40 hover:text-white')} transition-colors`}
            >
              All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="space-y-6 relative z-10">
          {filteredRecentExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 opacity-40">
              <Receipt className="w-16 h-16 mb-4" />
              <p className="text-lg font-black uppercase tracking-tight">No recent activity</p>
              <p className="text-xs font-bold">Your expenses will appear here</p>
            </div>
          ) : (
            filteredRecentExpenses.map((expense) => (
              <div 
                key={expense.id} 
                className={`flex items-center justify-between p-5 rounded-2xl border ${borderCol} ${isPink ? 'hover:bg-black/5' : 'hover:bg-white/5'} transition-all group`}
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${isPink ? 'bg-black text-white shadow-lg shadow-black/20' : 'bg-white/10 text-white/60'}`}>
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-black uppercase tracking-tight ${textColor}`}>
                        {expense.paidTo || expense.paid_to}
                      </p>
                      {expense.mealType && (
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isPink ? 'bg-black text-white' : 'bg-white/10 text-white/60'}`}>
                          {expense.mealType}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${mutedText}`}>
                      {format(parseISO(expense.date), 'MMM dd')} • {expense.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${textColor}`}>₹{expense.amount.toLocaleString()}</p>
                  <p className={`text-[9px] font-black uppercase tracking-widest ${mutedText}`}>
                    By {expense.userId === user.uid ? 'Me' : (partner?.name || 'Partner')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
