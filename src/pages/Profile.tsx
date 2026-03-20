import React, { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Link as LinkIcon, Copy, Check, Shield, Smartphone, Mail, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile({ user }: { user: any }) {
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: user.name, mobile: user.mobile || '' });

  const currentTheme = user?.theme || 'dark';
  const isPink = currentTheme === 'pink';
  const isWhite = currentTheme === 'light';
  const isDark = currentTheme === 'dark';

  const primaryColor = 'bg-black';
  const primaryText = 'text-white';
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1e1e1e]');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-white/20' : 'border-white/10');
  const textColor = isWhite ? 'text-black font-bold' : 'text-white';
  const mutedText = isWhite ? 'text-black font-bold' : 'text-white/60';
  const boldTextColor = isWhite ? 'text-black font-bold' : 'text-white';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(user.partnerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLinkPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // 1. Find partner by code
      const codeDoc = await getDoc(doc(db, 'codes', partnerCode));
      if (!codeDoc.exists()) throw new Error('Invalid partner code');
      
      const partnerId = codeDoc.data().uid;
      if (partnerId === user.uid) throw new Error('Cannot link with yourself');

      // 2. Update both users
      await updateDoc(doc(db, 'users', user.uid), { partnerId });
      await updateDoc(doc(db, 'users', partnerId), { partnerId: user.uid });

      setMessage({ type: 'success', text: `Successfully linked with partner!` });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTheme = async (theme: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { theme });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: editData.name,
        mobile: editData.mobile
      });
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className={`text-2xl font-bold ${boldTextColor}`}>Profile Settings</h2>
        <p className={mutedText}>Manage your account and partner connection</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol} text-center`}>
            <div className={`w-24 h-24 ${isPink ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'} rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4`}>
              {user.name[0]}
            </div>
            <h3 className={`text-xl font-bold ${boldTextColor}`}>{user.name}</h3>
            <p className={`${mutedText} text-sm`}>{user.email}</p>
            
            <div className="mt-6 space-y-2">
              <p className="text-xs font-bold text-white/40 uppercase">Theme Preference</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => handleUpdateTheme('dark')}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all bg-black text-white border-white/20`}
                >
                  Black
                </button>
                <button
                  onClick={() => handleUpdateTheme('pink')}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all bg-black text-white border-white/20`}
                >
                  Pink
                </button>
                <button
                  onClick={() => handleUpdateTheme('light')}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all bg-black text-white border-white/20`}
                >
                  White
                </button>
              </div>
            </div>

            <button 
              onClick={() => setIsEditing(true)}
              className="mt-6 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:opacity-90 transition-all shadow-sm"
            >
              Edit Profile
            </button>
          </div>

          <AnimatePresence>
            {isEditing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${cardBg} p-8 rounded-3xl shadow-2xl border ${borderCol} w-full max-w-md`}
                >
                  <h3 className={`text-2xl font-bold mb-6 ${boldTextColor}`}>Edit Profile</h3>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-2">
                      <label className={`text-sm font-bold ${mutedText}`}>Display Name</label>
                      <input
                        type="text"
                        className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-white/10' : 'bg-stone-800'} ${textColor} outline-none focus:ring-2 focus:ring-emerald-500`}
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-sm font-bold ${mutedText}`}>Mobile Number</label>
                      <input
                        type="tel"
                        className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-white/10' : 'bg-stone-800'} ${textColor} outline-none focus:ring-2 focus:ring-emerald-500`}
                        value={editData.mobile}
                        onChange={(e) => setEditData({ ...editData, mobile: e.target.value })}
                        placeholder="+91 00000 00000"
                      />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className={`flex-1 px-6 py-3 rounded-xl font-bold bg-black text-white hover:bg-stone-900 transition-all`}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-stone-900 transition-all shadow-lg"
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <div className={`${cardBg} p-6 rounded-3xl shadow-sm border ${borderCol} space-y-4`}>
            <div className={`flex items-center gap-3 ${mutedText}`}>
              <Mail className="w-5 h-5" />
              <span className="text-sm">{user.email}</span>
            </div>
            <div className={`flex items-center gap-3 ${mutedText}`}>
              <Smartphone className="w-5 h-5" />
              <span className="text-sm">{user.mobile || 'No mobile added'}</span>
            </div>
            <div className={`flex items-center gap-3 ${mutedText}`}>
              <Shield className="w-5 h-5" />
              <span className="text-sm">{user.isAdmin ? 'Administrator' : 'Standard User'}</span>
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
            <h3 className={`text-lg font-bold mb-6 flex items-center gap-2 ${boldTextColor}`}>
              <LinkIcon className="w-5 h-5 text-emerald-600" />
              Partner Connection
            </h3>

            {user.partnerId ? (
              <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-emerald-400">Connected with Partner</p>
                  <p className="text-sm text-emerald-400/80">You are now sharing expenses and chat.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className={`p-6 ${isPink ? 'bg-white/5' : 'bg-white/5'} rounded-2xl border ${borderCol}`}>
                  <p className="text-sm font-bold opacity-40 uppercase mb-4">Your Partner Code</p>
                  <div className="flex items-center gap-4">
                    <div className={`flex-1 ${isPink ? 'bg-white/5' : (isWhite ? 'bg-stone-50' : 'bg-stone-800')} px-6 py-4 rounded-xl border-2 border-dashed ${isPink ? 'border-white/20' : 'border-white/20'} text-2xl font-mono font-bold tracking-widest text-center ${boldTextColor}`}>
                      {user.partnerCode}
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className={`p-4 ${isPink ? 'bg-white/5 border-white/10 hover:bg-white/10' : (isWhite ? 'bg-stone-50 border-stone-200 hover:bg-stone-100' : 'bg-white/5 border-white/10 hover:bg-white/10')} border rounded-xl transition-all ${mutedText}`}
                    >
                      {copied ? <Check className="w-6 h-6 text-emerald-600" /> : <Copy className="w-6 h-6" />}
                    </button>
                  </div>
                  <p className={`text-xs ${mutedText} mt-4`}>Share this code with your partner to connect accounts.</p>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className={`w-full border-t ${borderCol}`}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className={`px-4 ${cardBg} ${mutedText} font-medium`}>OR</span>
                  </div>
                </div>

                <form onSubmit={handleLinkPartner} className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <LinkIcon className="w-4 h-4 text-emerald-600" />
                    <p className="text-sm font-bold opacity-40 uppercase">Link by Code</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isWhite ? 'text-black' : 'text-white/40'}`} />
                      <input
                        type="text"
                        placeholder="ENTER CODE"
                        className={`w-full pl-12 pr-6 py-4 ${isPink ? 'bg-white/5 border-white/10' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold text-xl uppercase ${boldTextColor}`}
                        value={partnerCode}
                        onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !partnerCode}
                      className={`px-8 py-4 ${primaryColor} ${primaryText} rounded-xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20`}
                    >
                      {loading ? 'Linking...' : 'Connect Now'}
                    </button>
                  </div>
                  {message.text && (
                    <p className={`text-sm font-medium ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {message.text}
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>

          <div className={`${cardBg} p-8 rounded-3xl shadow-sm border ${borderCol}`}>
            <h3 className={`text-lg font-bold mb-6 ${boldTextColor}`}>Account Security</h3>
            <div className="space-y-4">
              <button className={`w-full text-left px-6 py-4 rounded-2xl border ${borderCol} bg-black text-white hover:bg-stone-900 transition-all flex justify-between items-center`}>
                <div>
                  <p className={`font-bold text-white`}>Change Password</p>
                  <p className={`text-sm text-white/60`}>Update your account password</p>
                </div>
                <Check className={`w-5 h-5 text-white/40`} />
              </button>
              <button className={`w-full text-left px-6 py-4 rounded-2xl border ${borderCol} bg-black text-white hover:bg-stone-900 transition-all flex justify-between items-center`}>
                <div>
                  <p className={`font-bold text-white`}>Two-Factor Authentication</p>
                  <p className={`text-sm text-white/60`}>Add an extra layer of security</p>
                </div>
                <div className={`w-12 h-6 bg-white/10 rounded-full relative`}>
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
