import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, or, doc, getDoc, deleteDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { Send, User, Receipt, Smile, Paperclip, MessageSquare, X, ChevronRight, Calendar, IndianRupee, Trash2, Mic, Square, Play, Pause, Check, CheckCheck, Eye, EyeOff, Image as ImageIcon, Video, Settings2, Palette, Pin, Search, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../components/ConfirmDialog';

const EMOJIS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

const VoicePlayer = ({ voiceData, isMine }: { voiceData: string, isMine: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(voiceData);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl border ${
      isMine ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
    }`}>
      <button 
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isMine ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20'
        }`}
      >
        {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 ml-1 text-white" />}
      </button>
      <div className="flex-1 h-1 bg-current opacity-20 rounded-full overflow-hidden">
        <div className={`h-full bg-current ${isPlaying ? 'animate-pulse' : ''}`} style={{ width: '100%' }} />
      </div>
      <span className="text-[10px] opacity-60">Voice</span>
    </div>
  );
};

const ExpensePreview = ({ expenseId, isMine }: { expenseId: string, isMine: boolean }) => {
  const [expense, setExpense] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchExpense = async () => {
      try {
        const docRef = doc(db, 'expenses', expenseId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setExpense({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error("Error fetching expense preview:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExpense();
  }, [expenseId]);

  if (loading) return <div className="animate-pulse h-12 bg-white/5 rounded-lg w-full mt-2" />;
  if (!expense) return null;

  return (
    <div 
      onClick={() => navigate('/expenses')}
      className={`mt-2 p-3 rounded-xl border flex items-center gap-3 transition-all hover:bg-opacity-90 cursor-pointer ${
      isMine 
        ? 'bg-white/10 border-white/20 text-white' 
        : 'bg-white/5 border-white/10 text-white'
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-white/10'}`}>
        <Receipt className={`w-5 h-5 text-white`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <p className="text-xs font-bold truncate">{expense.paid_to}</p>
          <p className="text-xs font-bold ml-2 whitespace-nowrap">₹{expense.amount.toFixed(2)}</p>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isMine ? 'bg-white/20' : 'bg-white/10'}`}>
            {expense.category}
          </span>
          <span className="text-[10px] opacity-60">
            {expense.date ? format(parseISO(expense.date), 'MMM dd') : ''}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 opacity-40" />
    </div>
  );
};

export default function Chat({ user, partner }: { user: any, partner: any }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isOnceView, setIsOnceView] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGallery, setShowGallery] = useState(false);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, msgId: string, isPinned: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const BACKGROUNDS = [
    { id: 'default', name: 'Default', class: 'bg-black/50' },
    { id: 'pink', name: 'Deep Pink', class: 'bg-[#2D1115]' },
    { id: 'blue', name: 'Midnight Blue', class: 'bg-blue-950/50' },
    { id: 'green', name: 'Forest', class: 'bg-emerald-950/50' },
    { id: 'dark', name: 'Matte Black', class: 'bg-black' },
    { id: 'pattern', name: 'Doodle', class: 'bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] bg-repeat opacity-10' },
  ];

  const currentBg = BACKGROUNDS.find(bg => bg.id === user.chatBackground) || BACKGROUNDS[0];

  useEffect(() => {
    if (!user?.uid || !messages.length) return;

    const unreadMessages = messages.filter(m => m.senderId !== user.uid && !m.read);
    if (unreadMessages.length === 0) return;

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(async (entry) => {
        if (entry.isIntersecting) {
          const messageId = entry.target.getAttribute('data-message-id');
          if (messageId) {
            await updateDoc(doc(db, 'chats', messageId), { read: true });
          }
        }
      });
    }, { threshold: 0.5 });

    const messageElements = document.querySelectorAll('[data-is-unread="true"]');
    messageElements.forEach(el => observerRef.current?.observe(el));

    return () => observerRef.current?.disconnect();
  }, [messages, user?.uid]);

  const handleUpdateBackground = async (bgId: string) => {
    try {
      await updateDoc(doc(db, 'users', user.uid), { chatBackground: bgId });
      setIsBackgroundModalOpen(false);
    } catch (err) {
      console.error("Error updating background:", err);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!user?.uid) return;
    updateDoc(doc(db, 'users', user.uid), { isTyping });
  };

  const onInputChange = (val: string) => {
    setNewMessage(val);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    handleTyping(true);
    
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 2000);
  };

  const handlePinMessage = async (messageId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'chats', messageId), { isPinned: !currentPinned });
      setActiveMessageId(null);
      setContextMenu(null);
    } catch (err) {
      console.error("Error pinning message:", err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, msgId: string, isPinned: boolean) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msgId, isPinned });
  };

  const handleTouchStart = (msgId: string, isPinned: boolean) => {
    longPressTimer.current = setTimeout(() => {
      setActiveMessageId(msgId);
      // On mobile we might just want to toggle the overlay
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };


  const handleViewOnce = async (msgId: string) => {
    try {
      await updateDoc(doc(db, 'chats', msgId), { viewedAt: serverTimestamp() });
    } catch (err) {
      console.error("Error viewing once-view media:", err);
    }
  };

  const currentTheme = user?.theme || 'dark';
  const isPink = currentTheme === 'pink';
  const isWhite = currentTheme === 'light';
  const isDark = currentTheme === 'dark';

  const primaryColor = 'bg-black';
  const primaryHover = 'hover:opacity-90';
  const primaryText = 'text-white';
  const primaryBadge = isWhite ? 'bg-stone-100 text-black font-bold' : (isPink ? 'bg-white/20 text-white' : 'bg-white/10 text-white');
  const primaryRing = isWhite ? 'focus-within:ring-black' : (isPink ? 'focus-within:ring-white/50' : 'focus-within:ring-white/50');
  const primaryBorder = isWhite ? 'border-stone-300' : (isPink ? 'border-white/20' : 'border-white/20');
  const cardBg = isWhite ? 'bg-white' : (isPink ? 'bg-[#FF8DA1]' : 'bg-[#1e1e1e]');
  const borderCol = isWhite ? 'border-stone-200' : (isPink ? 'border-white/20' : 'border-white/10');
  const textColor = isWhite ? 'text-black font-bold' : 'text-white';
  const mutedText = isWhite ? 'text-black font-bold' : 'text-white/60';
  const boldTextColor = isWhite ? 'text-black font-bold' : 'text-white';

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.partnerId) return;

    // Limit file size to 1MB for Firestore base64 storage
    if (file.size > 1024 * 1024) {
      alert("File size too large. Please upload files smaller than 1MB.");
      return;
    }

    const type = file.type.startsWith('image/') ? 'photo' : file.type.startsWith('video/') ? 'video' : 'file';

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64data = reader.result as string;
      try {
        await addDoc(collection(db, 'chats'), {
          senderId: user.uid,
          receiverId: user.partnerId,
          fileData: base64data,
          fileName: file.name,
          type,
          isOnceView,
          read: false,
          createdAt: serverTimestamp()
        });

        // Create notification for partner
        await addDoc(collection(db, 'notifications'), {
          userId: user.partnerId,
          title: `New ${type}`,
          message: `${user.displayName || 'Your partner'} sent you a ${type}: ${file.name}`,
          type: 'chat',
          read: false,
          createdAt: serverTimestamp()
        });
        setIsOnceView(false);
      } catch (err) {
        console.error("Error uploading file:", err);
        alert("Failed to upload file");
      }
    };
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          await sendVoiceNote(base64data);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const sendVoiceNote = async (voiceData: string) => {
    if (!user.partnerId) return;
    try {
      await addDoc(collection(db, 'chats'), {
        senderId: user.uid,
        receiverId: user.partnerId,
        voiceData,
        createdAt: serverTimestamp()
      });

      // Create notification for partner
      await addDoc(collection(db, 'notifications'), {
        userId: user.partnerId,
        title: 'New Voice Note',
        message: `${user.displayName || 'Your partner'} sent you a voice note`,
        type: 'chat',
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
      alert('Failed to send voice note');
    }
  };

  const handleReaction = async (messageId: string, emoji: string, currentReactions: any) => {
    const messageRef = doc(db, 'chats', messageId);
    const userReactions = currentReactions?.[emoji] || [];
    const hasReacted = userReactions.includes(user.uid);

    const newReactions = { ...(currentReactions || {}) };
    if (hasReacted) {
      newReactions[emoji] = userReactions.filter((id: string) => id !== user.uid);
      if (newReactions[emoji].length === 0) delete newReactions[emoji];
    } else {
      newReactions[emoji] = [...userReactions, user.uid];
    }

    try {
      await updateDoc(messageRef, { reactions: newReactions });
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  useEffect(() => {
    if (!user?.uid || !user?.partnerId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'chats'),
      or(
        where('senderId', '==', user.uid),
        where('receiverId', '==', user.uid)
      ),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setMessages(msgs);
      setGalleryItems(msgs.filter(m => m.type === 'photo' || m.type === 'video'));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, user?.partnerId]);

  useEffect(() => {
    if (isExpenseModalOpen) {
      const q = query(
        collection(db, 'expenses'),
        or(
          where('userId', '==', user.uid),
          where('partnerId', '==', user.uid)
        ),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentExpenses(docs.slice(0, 10));
      });

      return () => unsubscribe();
    }
  }, [isExpenseModalOpen, user?.uid]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedExpenseId) || !user.partnerId) return;

    try {
      const chatData: any = {
        senderId: user.uid,
        receiverId: user.partnerId,
        createdAt: serverTimestamp(),
        read: false,
        type: 'text'
      };

      if (newMessage.trim()) chatData.message = newMessage;
      if (selectedExpenseId) chatData.expenseRefId = selectedExpenseId;

      await addDoc(collection(db, 'chats'), chatData);

      // Create notification for partner
      await addDoc(collection(db, 'notifications'), {
        userId: user.partnerId,
        title: 'New Message',
        message: `${user.displayName || 'Your partner'} sent you a message`,
        type: 'chat',
        read: false,
        createdAt: serverTimestamp()
      });

      setNewMessage('');
      setSelectedExpenseId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to send message');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'chats', deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error(err);
      alert('Failed to delete message');
    }
  };

  const handleClearChat = async () => {
    setIsClearing(true);
    try {
      const q = query(
        collection(db, 'chats'),
        or(
          where('senderId', '==', user.uid),
          where('receiverId', '==', user.uid)
        )
      );
      
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setIsConfirmClearOpen(false);
      setIsMenuOpen(false);
      alert("Chat history cleared successfully.");
    } catch (err) {
      console.error("Error clearing chat:", err);
      alert("Failed to clear chat history.");
    } finally {
      setIsClearing(false);
    }
  };

  const filteredMessages = messages.filter(m => 
    !searchQuery || m.message?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.fileName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedMessages = messages.filter(m => m.isPinned);

  return (
    <div className={`h-[calc(100vh-10rem)] lg:h-[calc(100vh-12rem)] flex flex-col ${cardBg} rounded-3xl shadow-sm border ${borderCol} overflow-hidden`}>
      <div className={`p-4 lg:p-6 border-b ${borderCol} flex items-center justify-between ${isPink ? 'bg-white/5' : 'bg-white/5'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${primaryColor}`}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`font-bold ${boldTextColor}`}>{partner?.name || 'Partner Chat'}</h3>
            <div className="flex flex-col">
              <p className={`text-xs flex items-center gap-1 font-medium ${
                partner?.status === 'online' 
                  ? (isPink ? 'text-pink-600' : 'text-emerald-600') 
                  : mutedText
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  partner?.status === 'online' 
                    ? (isPink ? 'bg-pink-500' : 'bg-emerald-500 animate-pulse') 
                    : (isWhite ? 'bg-black' : 'bg-stone-300')
                }`}></span>
                {partner?.status === 'online' ? 'Online' : 'Offline'}
              </p>
              {partner?.isTyping && (
                <p className={`text-[10px] font-bold ${isPink ? 'text-pink-400' : 'text-emerald-400'} animate-pulse`}>
                  typing...
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-1 animate-in slide-in-from-right-4 border border-white/10">
              <Search className="w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Search messages..." 
                className="bg-transparent border-none outline-none text-xs w-32 lg:w-48 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                <X className="w-4 h-4 text-white/40" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className={`p-2 rounded-xl hover:bg-white/10 transition-all ${mutedText}`}
            >
              <Search className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setShowGallery(true)}
            className={`p-2 rounded-xl ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'} transition-all ${mutedText}`}
            title="Media Gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsBackgroundModalOpen(true)}
            className={`p-2 rounded-xl hover:bg-white/10 transition-all ${mutedText}`}
            title="Chat Background"
          >
            <Palette className="w-5 h-5" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-xl ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'} transition-all ${mutedText}`}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className={`absolute right-0 mt-2 w-48 rounded-2xl shadow-xl border ${borderCol} ${cardBg} z-20 overflow-hidden`}
                  >
                    <button 
                      onClick={() => setIsConfirmClearOpen(true)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 transition-all font-bold"
                    >
                      <Trash2 className="w-4 h-4" />
                      Clear Chat History
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Media Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-5xl h-[80vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <ImageIcon className="w-6 h-6 text-pink-500" />
                  Shared Media
                </h3>
                <button onClick={() => setShowGallery(false)} className="p-2 text-white hover:bg-white/10 rounded-full">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {galleryItems.length === 0 ? (
                    <div className="col-span-full h-64 flex flex-col items-center justify-center text-white/20">
                      <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                      <p>No photos or videos shared yet</p>
                    </div>
                  ) : (
                    galleryItems.map((item) => (
                      <div key={item.id} className="aspect-square rounded-2xl overflow-hidden bg-white/5 relative group cursor-pointer">
                        {item.type === 'photo' ? (
                          <img src={item.fileData} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <Video className="w-8 h-8 text-white/20" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <p className="text-[10px] text-white font-medium truncate">
                            {item.createdAt ? format(item.createdAt.toDate(), 'MMM dd, yyyy') : 'Recently'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {pinnedMessages.length > 0 && (
        <div className={`px-6 py-2 border-b ${borderCol} ${isPink ? 'bg-white/5' : 'bg-white/5'} flex items-center gap-3 overflow-x-auto scrollbar-hide`}>
          <Pin className="w-3 h-3 text-white/40 shrink-0" />
          <div className="flex gap-2">
            {pinnedMessages.map(msg => (
              <div 
                key={msg.id}
                onClick={() => {
                  const el = document.querySelector(`[data-message-id="${msg.id}"]`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-bold border ${borderCol} ${cardBg} whitespace-nowrap cursor-pointer hover:scale-105 transition-all flex items-center gap-2`}
              >
                <span className="truncate max-w-[100px]">{msg.message || msg.fileName || 'Media'}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePinMessage(msg.id, true);
                  }}
                  className="text-white/40 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto p-6 space-y-6 transition-all duration-500 ${currentBg.class}`}
      >
        {loading ? (
          <div className="text-center text-white/40 py-10">Loading messages...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-white/20" />
            </div>
            <p className="text-white/40 font-medium">
              {searchQuery ? 'No messages match your search' : 'No messages yet. Say hi to your partner!'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div 
              key={msg.id} 
              data-message-id={msg.id}
              data-is-unread={msg.senderId !== user.uid && !msg.read}
              className={`flex group ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
              onClick={() => setActiveMessageId(activeMessageId === msg.id ? null : msg.id)}
              onContextMenu={(e) => handleContextMenu(e, msg.id, msg.isPinned)}
              onTouchStart={() => handleTouchStart(msg.id, msg.isPinned)}
              onTouchEnd={handleTouchEnd}
            >
              <div className={`max-w-[85%] lg:max-w-[75%] space-y-1 relative`}>
                <div 
                  className={`px-4 lg:px-6 py-2 lg:py-3 rounded-2xl shadow-sm relative group/msg ${
                    msg.senderId === user.uid 
                      ? (isWhite ? 'bg-black text-white' : (isPink ? 'bg-white/20 text-white' : 'bg-white text-black')) + ' rounded-tr-none'
                      : (isWhite ? 'bg-stone-100 text-black' : (isPink ? 'bg-black/20 text-white' : 'bg-white/10 text-white')) + ' rounded-tl-none'
                  }`}
                >
                  {msg.isPinned && (
                    <div className={`absolute -top-2 ${msg.senderId === user.uid ? '-left-2' : '-right-2'} bg-blue-500 text-white p-1 rounded-full shadow-lg`}>
                      <Pin className="w-2 h-2" />
                    </div>
                  )}
                  {msg.message && <p className="text-sm leading-relaxed">{msg.message}</p>}
                  {msg.voiceData && <VoicePlayer voiceData={msg.voiceData} isMine={msg.senderId === user.uid} />}
                  
                  {msg.fileData && (
                    <div className="space-y-2">
                      {msg.isOnceView ? (
                        msg.viewedAt ? (
                          <div className={`flex items-center gap-2 p-3 rounded-xl border ${msg.senderId === user.uid ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}>
                            <EyeOff className="w-4 h-4 opacity-50" />
                            <span className="text-xs font-bold opacity-50">Media Viewed</span>
                          </div>
                        ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (msg.senderId !== user.uid) handleViewOnce(msg.id);
                            }}
                            className={`flex items-center gap-2 p-3 rounded-xl border w-full text-left transition-all ${
                              msg.senderId === user.uid ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-xs font-bold">View Once {msg.type === 'photo' ? 'Photo' : 'Video'}</span>
                          </button>
                        )
                      ) : (
                        <div className={`p-2 rounded-xl border overflow-hidden ${
                          msg.senderId === user.uid ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
                        }`}>
                          {msg.type === 'photo' ? (
                            <img src={msg.fileData} alt="Shared" className="max-w-full rounded-lg" referrerPolicy="no-referrer" />
                          ) : msg.type === 'video' ? (
                            <video src={msg.fileData} controls className="max-w-full rounded-lg" />
                          ) : (
                            <div className="flex items-center gap-3 p-1">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${msg.senderId === user.uid ? 'bg-white/20' : 'bg-white/10 shadow-sm'}`}>
                                <Paperclip className={`w-5 h-5 ${msg.senderId === user.uid ? 'text-white' : 'text-white/60'}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{msg.fileName || 'File'}</p>
                                <a 
                                  href={msg.fileData} 
                                  download={msg.fileName || 'download'}
                                  className={`text-[10px] font-bold underline ${msg.senderId === user.uid ? 'text-white/80' : 'text-blue-400'}`}
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.expenseRefId && (
                    <ExpensePreview expenseId={msg.expenseRefId} isMine={msg.senderId === user.uid} />
                  )}

                  {/* Subtle Timestamp on Hover/Tap */}
                  <div className={`absolute -bottom-5 ${msg.senderId === user.uid ? 'right-0' : 'left-0'} opacity-0 group-hover/msg:opacity-100 transition-opacity whitespace-nowrap z-0`}>
                    <p className={`text-[10px] flex items-center gap-1 ${mutedText}`}>
                      {format(msg.createdAt?.toDate() || new Date(), 'HH:mm')}
                      {msg.senderId === user.uid && (
                        msg.read ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className={`w-3 h-3 ${mutedText}`} />
                      )}
                    </p>
                  </div>

                  {/* Reaction Picker Overlay */}
                  <div className={`absolute -top-10 ${msg.senderId === user.uid ? 'right-0' : 'left-0'} ${activeMessageId === msg.id ? 'flex' : 'hidden lg:group-hover/msg:flex'} items-center gap-1 ${isWhite ? 'bg-white border-stone-200' : 'bg-black border-white/10'} shadow-lg border p-1 rounded-full z-10`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePinMessage(msg.id, msg.isPinned);
                        setActiveMessageId(null);
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-full ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'} transition-all ${isWhite ? 'text-stone-400' : 'text-white/40'} ${
                        msg.isPinned ? 'text-emerald-400 bg-emerald-500/20' : ''
                      }`}
                    >
                      <Pin className="w-4 h-4" />
                    </button>
                    <div className={`w-px h-4 ${isWhite ? 'bg-stone-200' : 'bg-white/10'} mx-1`} />
                    {EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(msg.id, emoji, msg.reactions);
                          setActiveMessageId(null);
                        }}
                        className={`w-8 h-8 flex items-center justify-center rounded-full ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'} transition-all text-sm ${
                          msg.reactions?.[emoji]?.includes(user.uid) ? (isWhite ? 'bg-stone-100' : 'bg-white/10') : ''
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`flex flex-wrap gap-1 mt-1 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(msg.reactions).map(([emoji, users]: [string, any]) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(msg.id, emoji, msg.reactions);
                        }}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                          users.includes(user.uid)
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className={`flex items-center gap-2 px-1 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                  {msg.senderId === user.uid && (
                    <div className="flex items-center gap-1">
                      {msg.read ? (
                        <CheckCheck className={`w-3 h-3 ${isPink ? 'text-pink-500' : 'text-emerald-500'}`} />
                      ) : (
                        <Check className={`w-3 h-3 ${mutedText}`} />
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(msg.id);
                        }}
                        className={`${activeMessageId === msg.id ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'} p-1 hover:bg-red-50 ${mutedText} hover:text-red-500 rounded-lg transition-all`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <p className={`text-[10px] ${mutedText} font-medium`}>
                    {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : '...'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSend} className={`p-6 ${isWhite ? 'bg-white border-stone-100' : (isPink ? 'bg-[#FF8DA1] border-white/20' : 'bg-black border-white/10')} border-t`}>
        {selectedExpenseId && (
          <div className={`mb-4 p-3 ${isWhite ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} rounded-2xl border flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${primaryColor} text-white`}>
                <Receipt className="w-4 h-4" />
              </div>
              <p className={`text-xs font-bold ${isWhite ? 'text-stone-600' : 'text-white/60'}`}>Referencing an expense</p>
            </div>
            <button 
              type="button" 
              onClick={() => setSelectedExpenseId(null)}
              className={`p-1 ${isWhite ? 'hover:bg-stone-200' : 'hover:bg-white/10'} rounded-full ${mutedText}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className={`flex items-center gap-4 ${isWhite ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} p-2 rounded-2xl border transition-all ${primaryRing}`}>
          {isRecording ? (
            <div className="flex-1 flex items-center gap-4 px-4 py-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className={`text-sm font-bold ${textColor}`}>
                Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
              </span>
              <div className="flex-1" />
              <button 
                type="button"
                onClick={stopRecording}
                className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all"
              >
                <Square className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <button type="button" className={`p-2 ${mutedText} ${isWhite ? 'hover:text-black' : 'hover:text-stone-600'}`}>
                <Smile className="w-6 h-6" />
              </button>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className={`p-2 ${mutedText} ${isWhite ? 'hover:text-black' : 'hover:text-stone-600'} ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'} rounded-xl transition-all`}
              >
                <Paperclip className="w-6 h-6" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                type="button" 
                onClick={() => setIsExpenseModalOpen(true)}
                className={`p-2 transition-all rounded-xl ${selectedExpenseId ? `${primaryColor} text-white` : `${mutedText} ${isWhite ? 'hover:text-black' : 'hover:text-stone-600'} ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'}`}`}
              >
                <Receipt className="w-6 h-6" />
              </button>
              <button 
                type="button" 
                onClick={() => setIsOnceView(!isOnceView)}
                className={`p-2 transition-all rounded-xl ${isOnceView ? 'bg-orange-100 text-orange-600' : `${mutedText} ${isWhite ? 'hover:text-black' : 'hover:text-stone-600'} ${isWhite ? 'hover:bg-stone-100' : 'hover:bg-white/10'}`}`}
                title="View Once Toggle"
              >
                {isOnceView ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
              <input
                type="text"
                placeholder="Type your message..."
                className={`flex-1 bg-transparent border-none outline-none py-2 px-2 text-sm ${textColor}`}
                value={newMessage}
                onChange={(e) => onInputChange(e.target.value)}
              />
              <button 
                type="button"
                onClick={startRecording}
                className={`p-2 ${mutedText} ${isWhite ? 'hover:text-black' : 'hover:text-stone-600'} transition-all`}
              >
                <Mic className="w-6 h-6" />
              </button>
              <button
                type="submit"
                disabled={!newMessage.trim() && !selectedExpenseId}
                className={`${primaryColor} ${primaryText} p-3 rounded-xl ${primaryHover} transition-all disabled:opacity-50 shadow-lg ${isWhite ? 'shadow-stone-100' : 'shadow-black/20'}`}
              >
                <Send className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </form>

      {/* Expense Selector Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isWhite ? 'bg-white' : 'bg-black'} w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${borderCol}`}
            >
              <div className={`p-6 border-b ${borderCol} flex justify-between items-center ${isWhite ? 'bg-stone-50' : 'bg-white/5'}`}>
                <h3 className={`text-xl font-bold ${textColor}`}>Select Expense</h3>
                <button onClick={() => setIsExpenseModalOpen(false)} className={`p-2 ${isWhite ? 'hover:bg-stone-200' : 'hover:bg-white/10'} rounded-full ${mutedText}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto space-y-2">
                {recentExpenses.length === 0 ? (
                  <p className={`text-center py-10 ${mutedText}`}>No recent expenses found</p>
                ) : (
                  recentExpenses.map((exp) => (
                    <button
                      key={exp.id}
                      onClick={() => {
                        setSelectedExpenseId(exp.id);
                        setIsExpenseModalOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl border ${borderCol} ${isWhite ? 'hover:border-stone-300 hover:bg-stone-50' : 'hover:bg-white/5'} transition-all text-left flex items-center gap-4`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${primaryBadge}`}>
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <p className={`font-bold truncate ${textColor}`}>{exp.paid_to}</p>
                          <p className={`font-bold ml-2 ${isPink ? 'text-pink-600' : (isWhite ? 'text-stone-900' : 'text-white')}`}>₹{exp.amount.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs ${mutedText}`}>{exp.category}</span>
                          <span className={`text-xs ${mutedText}`}>•</span>
                          <span className={`text-xs ${mutedText}`}>{format(parseISO(exp.date), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className={`p-6 bg-black border-t ${borderCol}`}>
                <button 
                  onClick={() => setIsExpenseModalOpen(false)}
                  className={`w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-all`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={isConfirmClearOpen}
        title="Clear Chat History?"
        message="This will permanently delete ALL messages in this chat for both you and your partner. This action cannot be undone."
        onConfirm={handleClearChat}
        onCancel={() => setIsConfirmClearOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Message?"
        message="This message will be removed for both you and your partner. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <>
            <div className="fixed inset-0 z-[110]" onClick={() => setContextMenu(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ top: contextMenu.y, left: contextMenu.x }}
              className={`fixed z-[120] w-48 rounded-2xl shadow-2xl border ${borderCol} ${cardBg} overflow-hidden`}
            >
              <button
                onClick={() => handlePinMessage(contextMenu.msgId, contextMenu.isPinned)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all ${
                  contextMenu.isPinned ? 'text-blue-500 hover:bg-blue-50' : `${textColor} hover:bg-stone-100`
                }`}
              >
                <Pin className="w-4 h-4" />
                {contextMenu.isPinned ? 'Unpin Message' : 'Pin Message'}
              </button>
              <button
                onClick={() => {
                  setDeleteId(contextMenu.msgId);
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-all font-bold"
              >
                <Trash2 className="w-4 h-4" />
                Delete Message
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Background Picker Modal */}
      <AnimatePresence>
        {isBackgroundModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${isWhite ? 'bg-white' : 'bg-black'} w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border ${borderCol}`}
            >
              <div className={`p-6 border-b ${borderCol} flex justify-between items-center ${isWhite ? 'bg-stone-50' : 'bg-white/5'}`}>
                <h3 className={`text-xl font-bold ${textColor}`}>Chat Background</h3>
                <button onClick={() => setIsBackgroundModalOpen(false)} className={`p-2 ${isWhite ? 'hover:bg-stone-200' : 'hover:bg-white/10'} rounded-full ${mutedText}`}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-2 gap-4">
                {BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => handleUpdateBackground(bg.id)}
                    className={`group relative h-24 rounded-2xl border-2 transition-all overflow-hidden ${
                      user.chatBackground === bg.id ? (isPink ? 'border-pink-500 ring-4 ring-pink-50' : 'border-emerald-500 ring-4 ring-emerald-50') : (isWhite ? 'border-stone-100 hover:border-stone-300' : 'border-white/10 hover:border-white/30')
                    }`}
                  >
                    <div className={`absolute inset-0 ${bg.class}`} />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all" />
                    <div className={`absolute bottom-2 left-2 px-2 py-1 ${isWhite ? 'bg-white/90' : 'bg-black/60'} backdrop-blur-sm rounded-lg text-[10px] font-bold ${isWhite ? 'text-stone-900' : 'text-white'}`}>
                      {bg.name}
                    </div>
                  </button>
                ))}
              </div>
              <div className={`p-6 bg-black border-t ${borderCol}`}>
                <button 
                  onClick={() => setIsBackgroundModalOpen(false)}
                  className={`w-full py-3 rounded-xl font-bold text-white hover:opacity-90 transition-all`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
