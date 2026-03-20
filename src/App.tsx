import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit, updateDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  LayoutDashboard, 
  Receipt, 
  MessageSquare, 
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  PlusCircle,
  TrendingUp,
  PieChart as PieChartIcon,
  Bell,
  CheckSquare,
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Budgets from './pages/Budgets';
import Wishlist from './pages/Wishlist';
import TodoList from './pages/TodoList';

const Layout = ({ children, user, onLogout }: { children: React.ReactNode, user: any, onLogout: () => void }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Expenses', icon: Receipt, path: '/expenses' },
    { name: 'Budgets', icon: TrendingUp, path: '/budgets' },
    { name: 'Wishlist', icon: Heart, path: '/wishlist' },
    { name: 'Tasks', icon: CheckSquare, path: '/todos' },
    { name: 'Chat', icon: MessageSquare, path: '/chat' },
    { name: 'Profile', icon: User, path: '/profile' },
  ];

  if (user?.isAdmin) {
    navItems.push({ name: 'Admin', icon: Settings, path: '/admin' });
  }

  const currentTheme = user?.theme || 'dark'; // 'dark' | 'light' | 'pink'
  
  const themeBg = currentTheme === 'light' ? 'bg-white' : (currentTheme === 'pink' ? 'bg-[#FF8DA1]' : 'bg-[#121212]');
  const textColor = currentTheme === 'light' ? 'text-black' : 'text-white';
  const mutedText = currentTheme === 'light' ? 'text-stone-500' : (currentTheme === 'pink' ? 'text-white/70' : 'text-stone-400');
  const boldTextColor = currentTheme === 'light' ? 'text-black font-bold' : 'text-white font-bold';
  
  const sidebarBg = currentTheme === 'light' ? 'bg-white border-stone-200' : (currentTheme === 'pink' ? 'bg-[#FF8DA1] border-white/20' : 'bg-[#121212] border-white/10');
  const headerBg = currentTheme === 'light' ? 'bg-white border-stone-200' : (currentTheme === 'pink' ? 'bg-[#FF8DA1] border-white/20' : 'bg-[#121212] border-white/10');
  const cardBg = currentTheme === 'light' ? 'bg-white' : (currentTheme === 'pink' ? 'bg-[#FF8DA1]' : 'bg-[#1e1e1e]');
  const borderCol = currentTheme === 'light' ? 'border-stone-200' : (currentTheme === 'pink' ? 'border-white/20' : 'border-stone-700');
  
  const activeNav = 'bg-black text-white border border-white/20 shadow-sm';
  const navText = 'bg-black text-white border border-white/20 shadow-sm';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    return onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user?.uid]);

  // Daily Reminder Logic (9 PM IST)
  useEffect(() => {
    if (!user?.uid) return;

    const checkReminder = async () => {
      const now = new Date();
      // IST is UTC+5:30
      const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const hours = istTime.getUTCHours();
      const minutes = istTime.getUTCMinutes();

      // Check if it's around 9 PM IST (21:00)
      if (hours === 21 && minutes >= 0 && minutes < 30) {
        const today = format(now, 'yyyy-MM-dd');
        const lastReminder = localStorage.getItem(`last_reminder_${today}`);
        
        if (!lastReminder) {
          // Check if any expense added today
          const q = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('date', '==', today)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) {
            // Create in-app notification
            await addDoc(collection(db, 'notifications'), {
              userId: user.uid,
              title: 'Daily Reminder 🕒',
              message: "Don't forget to update your expenses for today!",
              type: 'reminder',
              read: false,
              createdAt: serverTimestamp()
            });
            localStorage.setItem(`last_reminder_${today}`, 'true');
          }
        }
      }
    };

    const interval = setInterval(checkReminder, 60000); // Check every minute
    checkReminder();
    return () => clearInterval(interval);
  }, [user?.uid]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  return (
    <div className={`flex h-screen font-sans ${themeBg} ${textColor} transition-colors duration-500`}>
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <>
            {/* Backdrop for mobile */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className={`fixed inset-y-0 left-0 z-50 w-64 border-r shadow-sm lg:relative ${sidebarBg}`}
            >
              <div className="flex flex-col h-full">
                <div className="p-6 flex items-center justify-between">
                  <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${textColor}`}>
                    <TrendingUp className="w-6 h-6" />
                    BUBU & DUDU
                  </h1>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className={`p-2 lg:hidden ${textColor} opacity-40 hover:opacity-100`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="flex-1 px-4 space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => {
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold ${
                        location.pathname === item.path
                          ? activeNav
                          : navText
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  ))}
                </nav>

              <div className={`p-4 border-t ${borderCol}`}>
                <button
                  onClick={onLogout}
                  className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all font-bold bg-black text-white`}
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`h-16 border-b flex items-center justify-between px-6 ${headerBg}`}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 ${textColor}`}
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 relative ${textColor} opacity-60 hover:opacity-100`}
              >
                <Bell className="w-6 h-6" />
                {notifications.some(n => !n.read) && (
                  <span className={`absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 ${currentTheme === 'light' ? 'border-white' : 'border-[#121212]'} rounded-full`}></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 border overflow-hidden ${cardBg} ${borderCol}`}
                    >
                      <div className={`p-4 border-b flex justify-between items-center ${currentTheme === 'light' ? 'bg-stone-50' : 'bg-white/5'}`}>
                        <h4 className={`font-bold ${textColor}`}>Notifications</h4>
                        <span className="text-xs font-medium px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                          {notifications.filter(n => !n.read).length} New
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className={`p-8 text-center ${mutedText} text-sm`}>No notifications yet</div>
                        ) : (
                          notifications.map(n => (
                            <div 
                              key={n.id} 
                              onClick={() => markAsRead(n.id)}
                              className={`p-4 border-b last:border-0 cursor-pointer transition-colors ${
                                !n.read ? (currentTheme === 'light' ? 'bg-stone-50' : 'bg-white/10') : (currentTheme === 'light' ? 'hover:bg-stone-50' : 'hover:bg-white/5')
                              }`}
                            >
                              <p className={`text-sm font-bold ${textColor}`}>{n.title}</p>
                              <p className={`text-xs mt-1 ${currentTheme === 'light' ? 'text-stone-600' : 'text-white/60'}`}>{n.message}</p>
                              <p className={`text-[10px] mt-2 ${mutedText}`}>{format(n.createdAt?.toDate() || new Date(), 'MMM dd, HH:mm')}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className={`flex items-center gap-3 pl-4 border-l ${borderCol}`}>
              <div className="text-right hidden sm:block">
                <p className={`text-sm font-bold ${textColor}`}>{user?.name}</p>
                <p className={`text-xs ${mutedText}`}>{user?.email}</p>
              </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold bg-black text-white border border-white/10`}>
                {user?.name?.[0]}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: firebaseUser.uid, ...userDoc.data() });
        } else {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        setUser((prev: any) => ({ ...prev, ...doc.data() }));
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.partnerId) {
      setPartner(null);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', user.partnerId), (doc) => {
      if (doc.exists()) {
        setPartner({ uid: doc.id, ...doc.data() });
      }
    });

    return () => unsubscribe();
  }, [user?.partnerId]);

  useEffect(() => {
    if (!user?.uid) return;

    const updateStatus = async (status: 'online' | 'offline') => {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          status,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.error("Error updating status:", err);
      }
    };

    updateStatus('online');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStatus('online');
      } else {
        updateStatus('offline');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => updateStatus('offline'));

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      updateStatus('offline');
    };
  }, [user?.uid]);

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
        <p className="text-white/60 font-medium">Loading BUBU & DUDU...</p>
      </div>
    </div>
  );

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
        
        <Route
          path="/*"
          element={
            user ? (
              <Layout user={user} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<Dashboard user={user} partner={partner} />} />
                  <Route path="/expenses" element={<Expenses user={user} partner={partner} />} />
                  <Route path="/budgets" element={<Budgets user={user} />} />
                  <Route path="/wishlist" element={<Wishlist user={user} />} />
                  <Route path="/todos" element={<TodoList user={user} />} />
                  <Route path="/chat" element={<Chat user={user} partner={partner} />} />
                  <Route path="/profile" element={<Profile user={user} />} />
                  <Route path="/admin" element={<Admin user={user} />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}
