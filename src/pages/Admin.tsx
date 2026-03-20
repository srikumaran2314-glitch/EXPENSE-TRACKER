import React, { useState, useEffect } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, 
  IndianRupee, 
  PieChart as PieChartIcon, 
  Settings, 
  ShieldCheck, 
  Activity,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Admin({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const expensesSnap = await getDocs(collection(db, 'expenses'));
        
        const totalUsers = usersSnap.size;
        const expensesDocs = expensesSnap.docs.map(d => d.data());
        const totalExpenses = expensesDocs.reduce((sum, e) => sum + (e.amount || 0), 0);
        
        const categories = expensesDocs.reduce((acc: any, e) => {
          acc[e.category] = (acc[e.category] || 0) + 1;
          return acc;
        }, {});
        
        const popularCategories = Object.entries(categories)
          .map(([category, count]) => ({ category, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setStats({
          totalUsers,
          totalExpenses,
          popularCategories
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const currentTheme = user?.theme || 'dark';
  const isPink = currentTheme === 'pink';
  const isWhite = currentTheme === 'light';
  const isDark = currentTheme === 'dark';

  const textColor = isWhite ? 'text-black font-bold' : (isPink ? 'text-black font-bold' : 'text-white');
  const mutedText = isWhite ? 'text-black font-bold' : (isPink ? 'text-black/60 font-bold' : 'text-white/60');
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1e1e1e]');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-black/10' : 'border-white/10');

  if (loading) return <div className={`h-full flex items-center justify-center ${textColor}`}>Loading admin dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${textColor}`}>
            <ShieldCheck className="w-7 h-7 text-emerald-500" />
            Admin Control Panel
          </h2>
          <p className={mutedText}>System-wide analytics and management</p>
        </div>
        <div className="flex gap-3">
          <button className={`px-4 py-2 ${isWhite ? 'bg-black text-white' : (isPink ? 'bg-black text-white shadow-lg' : 'bg-white/10 backdrop-blur-md border border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]')} rounded-xl text-sm font-bold hover:opacity-80 transition-all`}>
            Export Logs
          </button>
          <button className={`px-4 py-2 ${isWhite ? 'bg-black text-white' : (isPink ? 'bg-black text-white shadow-lg' : 'bg-white/10 backdrop-blur-md border border-white/30 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]')} rounded-xl text-sm font-bold hover:opacity-80 transition-all`}>
            System Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${cardBg} p-6 rounded-3xl shadow-sm border ${borderCol}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              12%
            </span>
          </div>
          <p className={`text-sm ${mutedText} font-medium`}>Total Active Users</p>
          <h3 className={`text-3xl font-bold mt-1 ${textColor}`}>{stats.totalUsers}</h3>
        </div>

        <div className={`${cardBg} p-6 rounded-3xl shadow-sm border ${borderCol}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <IndianRupee className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              8%
            </span>
          </div>
          <p className={`text-sm ${mutedText} font-medium`}>Total Expenses Tracked</p>
          <h3 className={`text-3xl font-bold mt-1 ${textColor}`}>₹{stats.totalExpenses.toLocaleString()}</h3>
        </div>

        <div className={`${cardBg} p-6 rounded-3xl shadow-sm border ${borderCol}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl">
              <Activity className="w-6 h-6 text-amber-400" />
            </div>
            <span className="flex items-center text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              2%
            </span>
          </div>
          <p className={`text-sm ${mutedText} font-medium`}>System Uptime</p>
          <h3 className={`text-3xl font-bold mt-1 ${textColor}`}>99.9%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textColor}`}>
            <PieChartIcon className="w-5 h-5 text-white/40" />
            Popular Categories
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.popularCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isWhite ? '#e7e5e4' : '#ffffff10'} />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{fill: isWhite ? '#000000' : 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700}} width={100} />
                <Tooltip 
                  cursor={{fill: isWhite ? '#f5f5f4' : '#ffffff05'}}
                  contentStyle={{backgroundColor: isWhite ? 'white' : '#1c1917', borderRadius: '12px', border: isWhite ? '1px solid #e7e5e4' : '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', color: isWhite ? 'black' : 'white'}}
                  itemStyle={{color: isWhite ? 'black' : 'white', fontWeight: 'bold'}}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {stats.popularCategories.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${textColor}`}>
            <Settings className={`w-5 h-5 ${isWhite ? 'text-black' : 'text-stone-400'}`} />
            System Controls
          </h3>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 ${isWhite ? 'bg-stone-50' : 'bg-white/5'} rounded-2xl border ${borderCol}`}>
              <div>
                <p className={`font-bold text-sm ${textColor}`}>Receipt Uploads</p>
                <p className={`text-xs ${mutedText}`}>Allow users to upload receipt images</p>
              </div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className={`flex items-center justify-between p-4 ${isWhite ? 'bg-stone-50' : 'bg-white/5'} rounded-2xl border ${borderCol}`}>
              <div>
                <p className={`font-bold text-sm ${textColor}`}>Partner Linking</p>
                <p className={`text-xs ${mutedText}`}>Allow users to link with partners</p>
              </div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className={`flex items-center justify-between p-4 ${isWhite ? 'bg-stone-50' : 'bg-white/5'} rounded-2xl border ${borderCol}`}>
              <div>
                <p className={`font-bold text-sm ${textColor}`}>Maintenance Mode</p>
                <p className={`text-xs ${mutedText}`}>Disable all user interactions</p>
              </div>
              <div className="w-12 h-6 bg-white/10 rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
