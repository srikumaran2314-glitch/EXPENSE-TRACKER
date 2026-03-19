import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Heart, Plus, Trash2, CheckCircle, Circle, TrendingUp, DollarSign, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function Wishlist({ user }: { user: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    estimatedAmount: '',
    priority: 'Medium',
    imageUrl: ''
  });

  const isPink = user?.gender === 'Female';
  const isWhite = user?.theme === 'white';
  const primaryColor = isWhite ? 'bg-black' : (isPink ? 'bg-[#FF8DA1]' : 'bg-white');
  const primaryText = isWhite ? 'text-white' : (isPink ? 'text-white' : 'text-black');
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#3D171C]' : 'bg-black');
  const borderCol = isWhite ? 'border-stone-300' : (isPink ? 'border-white/5' : 'border-white/10');
  const textColor = isWhite ? 'text-black font-bold' : 'text-white';
  const mutedText = isWhite ? 'text-black font-bold' : 'text-white/60';
  const boldTextColor = isWhite ? 'text-black font-bold' : 'text-white';

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'wishlist'),
      where('partnerId', 'in', [user.uid, user.partnerId || ''])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wishlistData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return b.createdAt?.seconds - a.createdAt?.seconds;
      });
      setItems(wishlistData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title || !newItem.estimatedAmount) return;

    try {
      await addDoc(collection(db, 'wishlist'), {
        userId: user.uid,
        partnerId: user.partnerId || user.uid,
        title: newItem.title,
        description: newItem.description,
        estimatedAmount: parseFloat(newItem.estimatedAmount),
        savedAmount: 0,
        priority: newItem.priority,
        isCompleted: false,
        imageUrl: newItem.imageUrl,
        createdAt: serverTimestamp()
      });
      setShowAddModal(false);
      setNewItem({ title: '', description: '', estimatedAmount: '', priority: 'Medium', imageUrl: '' });
    } catch (err) {
      console.error('Error adding wishlist item:', err);
    }
  };

  const toggleComplete = async (item: any) => {
    try {
      await updateDoc(doc(db, 'wishlist', item.id), {
        isCompleted: !item.isCompleted
      });
    } catch (err) {
      console.error('Error updating wishlist item:', err);
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this item?')) return;
    try {
      await deleteDoc(doc(db, 'wishlist', id));
    } catch (err) {
      console.error('Error deleting wishlist item:', err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem({ ...newItem, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateSavedAmount = async (item: any, amount: number) => {
    try {
      await updateDoc(doc(db, 'wishlist', item.id), {
        savedAmount: amount
      });
    } catch (err) {
      console.error('Error updating saved amount:', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-3xl font-bold ${boldTextColor} flex items-center gap-3`}>
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            Our Wishlist
          </h2>
          <p className={mutedText}>Things we're dreaming of and saving for</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`flex items-center gap-2 px-6 py-3 ${primaryColor} ${primaryText} rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg`}
        >
          <Plus className="w-5 h-5" />
          Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <motion.div
            layout
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${cardBg} rounded-3xl border ${borderCol} overflow-hidden shadow-sm hover:shadow-md transition-all group`}
          >
            {item.imageUrl && (
              <div className="h-48 w-full relative">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      item.priority === 'High' ? 'bg-red-500/10 text-red-500' :
                      item.priority === 'Medium' ? 'bg-orange-500/10 text-orange-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {item.priority}
                    </span>
                    {item.isCompleted && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400">
                        Achieved
                      </span>
                    )}
                  </div>
                  <h3 className={`text-xl font-bold mt-2 ${item.isCompleted ? 'line-through opacity-50' : ''} ${boldTextColor}`}>
                    {item.title}
                  </h3>
                </div>
                <button
                  onClick={() => toggleComplete(item)}
                  className={`p-2 rounded-xl transition-all ${item.isCompleted ? 'text-emerald-500 bg-emerald-500/10' : `${mutedText} hover:bg-white/10`}`}
                >
                  {item.isCompleted ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                </button>
              </div>

              {item.description && (
                <p className={`text-sm ${mutedText} line-clamp-2`}>{item.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-bold">
                  <span className={mutedText}>Progress</span>
                  <span className={boldTextColor}>
                    ₹{item.savedAmount.toLocaleString()} / ₹{item.estimatedAmount.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((item.savedAmount / item.estimatedAmount) * 100, 100)}%` }}
                    className={`h-full ${item.isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Add savings"
                    className={`w-24 px-3 py-1.5 text-sm rounded-lg border ${borderCol} ${isPink ? 'bg-white/5' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                    onKeyDown={(e: any) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          updateSavedAmount(item, item.savedAmount + val);
                          e.target.value = '';
                        }
                      }
                    }}
                  />
                </div>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
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
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${boldTextColor}`}>Add Wishlist Item</h3>
                <button onClick={() => setShowAddModal(false)} className={mutedText}>
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${mutedText}`}>ITEM NAME</label>
                  <input
                    required
                    type="text"
                    className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-white/5' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${mutedText}`}>DESCRIPTION (OPTIONAL)</label>
                  <textarea
                    className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-white/5' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                    rows={2}
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${mutedText}`}>EST. AMOUNT (₹)</label>
                    <input
                      required
                      type="number"
                      className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-white/5' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                      value={newItem.estimatedAmount}
                      onChange={(e) => setNewItem({ ...newItem, estimatedAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-bold mb-2 ${mutedText}`}>PRIORITY</label>
                    <select
                      className={`w-full px-4 py-3 rounded-xl border ${borderCol} ${isPink ? 'bg-white/5' : 'bg-stone-800'} focus:ring-2 focus:ring-emerald-500 outline-none ${textColor}`}
                      value={newItem.priority}
                      onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-bold mb-2 ${mutedText}`}>IMAGE (OPTIONAL)</label>
                  <div className="flex items-center gap-4">
                    <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed ${borderCol} rounded-xl cursor-pointer hover:bg-white/5 transition-all ${mutedText}`}>
                      <ImageIcon className="w-5 h-5" />
                      <span>{newItem.imageUrl ? 'Change Image' : 'Upload Image'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    {newItem.imageUrl && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10">
                        <img src={newItem.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full py-4 ${primaryColor} text-white rounded-xl font-bold hover:opacity-90 transition-all mt-4 shadow-lg`}
                >
                  Add to Wishlist
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
