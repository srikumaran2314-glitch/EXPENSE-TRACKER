import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { collection, query, where, onSnapshot, orderBy, or, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { TrendingUp, IndianRupee, Users, Calendar, HandCoins, ArrowRight, Receipt, Target, Heart } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, amount, icon: Icon, trend, color, cardBg, textColor, mutedText, borderCol, isBalance }: any) => (
  <div className={`${cardBg} p-6 rounded-2xl shadow-sm border ${borderCol}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trend > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
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
  const [budgets, setBudgets] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isPink = user?.gender === 'Female';
  const primaryColor = isPink ? '#FF8DA1' : '#000000';
  const primaryBg = isPink ? 'bg-[#FF8DA1]' : 'bg-black';
  const cardBg = isPink ? 'bg-white' : 'bg-stone-900';
  const textColor = isPink ? 'text-black' : 'text-white';
  const mutedText = isPink ? 'text-stone-600' : 'text-stone-400';
  const boldTextColor = isPink ? 'text-black' : 'text-white';
  const borderCol = isPink ? 'border-stone-200' : 'border-white/10';

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

    return () => {
      unsubscribeExpenses();
      unsubscribeBudgets();
      unsubscribeWishlist();
    };
  }, [user?.uid]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthlyExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }));
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
    monthlyExpenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const dailyData = Object.entries(
    monthlyExpenses.reduce((acc: any, e) => {
      const day = format(parseISO(e.date), 'dd');
      acc[day] = (acc[day] || 0) + e.amount;
      return acc;
    }, {})
  ).map(([day, amount]) => ({ day, amount })).sort((a, b) => Number(a.day) - Number(b.day));

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
              <div className={`w-2 h-2 rounded-full ${user?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
              <span className={`text-xs font-bold ${boldTextColor}`}>Me: {user?.status === 'online' ? 'Online' : 'Offline'}</span>
            </div>
            {partner && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${partner?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'}`} />
                <span className={`text-xs font-bold ${isPink ? 'bg-stone-900 text-white px-2 py-0.5 rounded' : boldTextColor}`}>
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
          title="Monthly Total" 
          amount={totalMonthly} 
          icon={IndianRupee} 
          color={primaryBg}
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
        />
        <StatCard 
          title="My Share" 
          amount={myMonthly} 
          icon={TrendingUp} 
          color="bg-blue-500"
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
        />
        <StatCard 
          title="Partner Share" 
          amount={partnerMonthly} 
          icon={Users} 
          color="bg-amber-500"
          cardBg={cardBg}
          textColor={textColor}
          mutedText={mutedText}
          borderCol={borderCol}
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
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} lg:col-span-1`}>
          <h3 className={`text-lg font-bold mb-6 ${textColor}`}>Categories</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? primaryColor : COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isPink ? 'white' : '#1c1917', 
                    borderColor: isPink ? '#e2e8f0' : '#292524',
                    color: isPink ? 'black' : 'white',
                    borderRadius: '12px',
                    border: isPink ? '1px solid #e2e8f0' : '1px solid #292524'
                  }}
                  itemStyle={{ color: isPink ? 'black' : 'white' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.slice(0, 4).map((cat, i) => (
              <div key={cat.name} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: i === 0 ? primaryColor : COLORS[i % COLORS.length] }} />
                  <span className={mutedText}>{cat.name}</span>
                </div>
                <span className={`font-bold ${textColor}`}>₹{cat.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} lg:col-span-2`}>
          <h3 className={`text-lg font-bold mb-6 ${textColor}`}>Daily Spending Trend</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isPink ? "#e2e8f0" : "#ffffff10"} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: isPink ? '#000000' : '#ffffff', fontSize: 12, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: isPink ? '#000000' : '#ffffff', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: isPink ? '#FF8DA120' : 'rgba(255,255,255,0.1)'}}
                  contentStyle={{ 
                    backgroundColor: isPink ? 'white' : '#1c1917', 
                    borderColor: isPink ? '#FF8DA1' : '#292524',
                    color: isPink ? 'black' : 'white',
                    borderRadius: '16px', 
                    border: isPink ? '2px solid #FF8DA1' : '1px solid #292524', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  itemStyle={{ color: isPink ? 'black' : 'white', fontWeight: 'bold' }}
                />
                <Bar dataKey="amount" fill={primaryColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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
            <Link to="/budgets" className={`text-sm font-bold ${isPink ? 'text-pink-600' : 'text-stone-400'}`}>View All</Link>
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
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${percent > 90 ? 'bg-red-500' : 'bg-emerald-500'}`} 
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
            <Link to="/wishlist" className={`text-sm font-bold ${isPink ? 'text-pink-600' : 'text-stone-400'}`}>View All</Link>
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
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
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
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-xl font-bold ${textColor}`}>Recent Expenses</h3>
          <Link 
            to="/expenses" 
            className={`flex items-center gap-2 text-sm font-bold ${isPink ? 'text-pink-600 hover:text-pink-700' : 'text-stone-400 hover:text-white'} transition-colors`}
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {expenses.slice(0, 5).map((expense) => (
            <div 
              key={expense.id} 
              className={`flex items-center justify-between p-4 rounded-2xl border ${borderCol} ${isPink ? 'hover:bg-stone-50' : 'hover:bg-white/5'} transition-all`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPink ? 'bg-pink-50 text-pink-500' : 'bg-white/10 text-stone-400'}`}>
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <p className={`font-bold ${textColor}`}>{expense.paidTo || expense.paid_to}</p>
                  <p className={`text-xs ${mutedText}`}>{format(parseISO(expense.date), 'MMM dd, yyyy')} • {expense.category}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${isPink ? 'text-pink-600' : 'text-white'}`}>₹{expense.amount.toLocaleString()}</p>
                <p className={`text-[10px] ${mutedText}`}>Paid by {expense.paidBy || expense.paid_by}</p>
              </div>
            </div>
          ))}
          {expenses.length === 0 && (
            <div className={`text-center py-8 ${mutedText}`}>
              No expenses recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
