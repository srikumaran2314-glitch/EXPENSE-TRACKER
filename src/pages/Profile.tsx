import React, { useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, Link as LinkIcon, Copy, Check, Shield, Smartphone, Mail } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile({ user }: { user: any }) {
  const [partnerCode, setPartnerCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const isPink = user?.gender === 'Female';
  const cardBg = isPink ? 'bg-white' : 'bg-stone-900';
  const borderCol = isPink ? 'border-stone-100' : 'border-white/10';
  const textColor = isPink ? 'text-stone-900' : 'text-white';
  const mutedText = isPink ? 'text-stone-500' : 'text-stone-400';
  const boldTextColor = isPink ? 'text-stone-900' : 'text-white';

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

  const handleUpdateGender = async (gender: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { gender });
    } catch (err) {
      console.error(err);
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
            <div className={`w-24 h-24 ${isPink ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/20 text-emerald-400'} rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4`}>
              {user.name[0]}
            </div>
            <h3 className={`text-xl font-bold ${boldTextColor}`}>{user.name}</h3>
            <p className={`${mutedText} text-sm`}>{user.email}</p>
            
            <div className="mt-6 space-y-2">
              <p className="text-xs font-bold text-stone-400 uppercase">Theme Preference</p>
              <div className="flex gap-2 justify-center">
                {['Male', 'Female'].map((g) => (
                  <button
                    key={g}
                    onClick={() => handleUpdateGender(g)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                      user.gender === g
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isPink ? 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100' : 'bg-white/5 text-stone-400 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {g === 'Male' ? 'Black' : 'Pink'}
                  </button>
                ))}
              </div>
            </div>

            <button className="mt-6 text-emerald-600 text-sm font-bold hover:underline">
              Edit Photo
            </button>
          </div>

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
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                  <Check className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900">Connected with Partner</p>
                  <p className="text-sm text-emerald-700">You are now sharing expenses and chat.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className={`p-6 ${isPink ? 'bg-stone-50' : 'bg-white/5'} rounded-2xl border ${borderCol}`}>
                  <p className="text-sm font-bold text-stone-400 uppercase mb-4">Your Partner Code</p>
                  <div className="flex items-center gap-4">
                    <div className={`flex-1 ${isPink ? 'bg-white' : 'bg-stone-800'} px-6 py-4 rounded-xl border-2 border-dashed ${isPink ? 'border-stone-300' : 'border-white/20'} text-2xl font-mono font-bold tracking-widest text-center ${boldTextColor}`}>
                      {user.partnerCode}
                    </div>
                    <button
                      onClick={copyToClipboard}
                      className={`p-4 ${isPink ? 'bg-white border-stone-200 hover:bg-stone-50' : 'bg-white/5 border-white/10 hover:bg-white/10'} border rounded-xl transition-all ${mutedText}`}
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
                    <p className="text-sm font-bold text-stone-400 uppercase">Link by Code</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                      <input
                        type="text"
                        placeholder="ENTER CODE"
                        className={`w-full pl-12 pr-6 py-4 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono font-bold text-xl uppercase ${boldTextColor}`}
                        value={partnerCode}
                        onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading || !partnerCode}
                      className="px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
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
              <button className={`w-full text-left px-6 py-4 rounded-2xl border ${borderCol} ${isPink ? 'hover:bg-stone-50' : 'hover:bg-white/5'} transition-all flex justify-between items-center`}>
                <div>
                  <p className={`font-bold ${boldTextColor}`}>Change Password</p>
                  <p className={`text-sm ${mutedText}`}>Update your account password</p>
                </div>
                <Check className={`w-5 h-5 ${isPink ? 'text-stone-300' : 'text-stone-600'}`} />
              </button>
              <button className={`w-full text-left px-6 py-4 rounded-2xl border ${borderCol} ${isPink ? 'hover:bg-stone-50' : 'hover:bg-white/5'} transition-all flex justify-between items-center`}>
                <div>
                  <p className={`font-bold ${boldTextColor}`}>Two-Factor Authentication</p>
                  <p className={`text-sm ${mutedText}`}>Add an extra layer of security</p>
                </div>
                <div className={`w-12 h-6 ${isPink ? 'bg-stone-200' : 'bg-white/10'} rounded-full relative`}>
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
