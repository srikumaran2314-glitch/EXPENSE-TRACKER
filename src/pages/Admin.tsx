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

  if (loading) return <div>Loading admin dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            Admin Control Panel
          </h2>
          <p className="text-stone-500">System-wide analytics and management</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-sm font-bold hover:bg-stone-50 transition-all">
            Export Logs
          </button>
          <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
            System Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              12%
            </span>
          </div>
          <p className="text-sm text-stone-500 font-medium">Total Active Users</p>
          <h3 className="text-3xl font-bold mt-1">{stats.totalUsers}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <IndianRupee className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              8%
            </span>
          </div>
          <p className="text-sm text-stone-500 font-medium">Total Expenses Tracked</p>
          <h3 className="text-3xl font-bold mt-1">₹{stats.totalExpenses.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 rounded-2xl">
              <Activity className="w-6 h-6 text-amber-600" />
            </div>
            <span className="flex items-center text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              2%
            </span>
          </div>
          <p className="text-sm text-stone-500 font-medium">System Uptime</p>
          <h3 className="text-3xl font-bold mt-1">99.9%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-stone-400" />
            Popular Categories
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.popularCategories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={100} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
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

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-400" />
            System Controls
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-sm">Receipt Uploads</p>
                <p className="text-xs text-stone-500">Allow users to upload receipt images</p>
              </div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-sm">Partner Linking</p>
                <p className="text-xs text-stone-500">Allow users to link with partners</p>
              </div>
              <div className="w-12 h-6 bg-emerald-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div>
                <p className="font-bold text-sm">Maintenance Mode</p>
                <p className="text-xs text-stone-500">Disable all user interactions</p>
              </div>
              <div className="w-12 h-6 bg-stone-200 rounded-full relative">
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
