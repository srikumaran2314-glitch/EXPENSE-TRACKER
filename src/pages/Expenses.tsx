import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, or } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  FileText,
  Receipt as ReceiptIcon,
  MapPin,
  CreditCard,
  Wallet,
  Smartphone,
  Building,
  ChevronRight,
  X,
  Calendar,
  Trash2,
  User,
  Edit2,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  IndianRupee
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { deleteDoc, doc, updateDoc } from 'firebase/firestore';
import ConfirmDialog from '../components/ConfirmDialog';

const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Rent', 'Bills', 'Personal', 'Other'];
const MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'];

export default function Expenses({ user, partner }: { user: any, partner: any }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [paidByFilter, setPaidByFilter] = useState('All');
  const [modeFilter, setModeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [monthFilter, setMonthFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [viewingExpense, setViewingExpense] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeConfig, setPurgeConfig] = useState({ month: 'All', year: format(new Date(), 'yyyy') });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const isPink = user?.gender === 'Female';
  const primaryColor = isPink ? 'bg-[#FF8DA1]' : 'bg-white';
  const primaryHover = isPink ? 'hover:bg-[#FF7A91]' : 'hover:bg-stone-200';
  const primaryRing = isPink ? 'focus:ring-[#FF8DA1]' : 'focus:ring-white/50';
  const primaryShadow = isPink ? 'shadow-[#FF8DA1]/20' : 'shadow-white/10';
  const primaryBadge = isPink ? 'bg-[#FFF0F3] text-[#FF8DA1]' : 'bg-white/10 text-white';
  const primaryText = isPink ? 'text-[#FF8DA1]' : 'text-white';
  const cardBg = isPink ? 'bg-white' : 'bg-stone-900';
  const borderCol = isPink ? 'border-stone-200' : 'border-white/10';
  const textColor = isPink ? 'text-black' : 'text-white';
  const mutedText = isPink ? 'text-stone-600' : 'text-stone-400';
  const boldTextColor = isPink ? 'text-black' : 'text-white';

  const [formData, setFormData] = useState({
    amount: '',
    paidBy: user.name,
    paymentMode: 'UPI',
    category: 'Food',
    paidTo: '',
    location: '',
    description: '',
    receivableFrom: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    receiptUrl: '',
    receiptName: '',
    receiptType: '',
  });

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(docs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        amount: editingExpense.amount.toString(),
        paidBy: editingExpense.paidBy || editingExpense.paid_by || user.name,
        paymentMode: editingExpense.paymentMode || editingExpense.payment_mode || 'UPI',
        category: editingExpense.category,
        paidTo: editingExpense.paidTo || editingExpense.paid_to || '',
        location: editingExpense.location || '',
        description: editingExpense.description || '',
        receivableFrom: editingExpense.receivableFrom || '',
        date: editingExpense.date,
        receiptUrl: editingExpense.receiptUrl || '',
        receiptName: editingExpense.receiptName || '',
        receiptType: editingExpense.receiptType || '',
      });
      setIsModalOpen(true);
    }
  }, [editingExpense]);

  const resetForm = () => {
    setFormData({
      amount: '',
      paidBy: user.name,
      paymentMode: 'UPI',
      category: 'Food',
      paidTo: '',
      location: '',
      description: '',
      receivableFrom: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      receiptUrl: '',
      receiptName: '',
      receiptType: '',
    });
    setEditingExpense(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      alert('File size must be less than 1MB due to database limits.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        receiptUrl: reader.result as string,
        receiptName: file.name,
        receiptType: file.type
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        amount: parseFloat(formData.amount),
        userId: user.uid,
        partnerId: user.partnerId || '',
        updatedAt: serverTimestamp()
      };

      if (editingExpense) {
        await updateDoc(doc(db, 'expenses', editingExpense.id), data);
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...data,
          createdAt: serverTimestamp()
        });

        // Notify partner
        if (user.partnerId) {
          await addDoc(collection(db, 'notifications'), {
            userId: user.partnerId,
            title: 'New Expense 💸',
            message: `${user.name} added a new expense: ₹${data.amount} for ${data.paidTo || data.category}`,
            type: 'expense',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
      
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(editingExpense ? 'Failed to update expense' : 'Failed to add expense');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('BUBU & DUDU Expense Report', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 30);
    
    const tableColumn = ["Date", "Category", "Paid To", "Amount", "Paid By", "Mode"];
    const tableRows = filteredExpenses.map(e => [
      format(parseISO(e.date), 'MMM dd, yyyy'),
      e.category,
      e.paidTo || e.paid_to,
      `INR ${e.amount.toFixed(2)}`,
      e.paidBy || e.paid_by,
      e.paymentMode || e.payment_mode
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: isPink ? [236, 72, 153] : [17, 24, 39] }
    });

    doc.save(`expenses-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const filteredExpenses = expenses.filter(e => {
    const expenseDate = parseISO(e.date);
    const matchesFilter = filter === 'All' || e.category === filter;
    const matchesPaidBy = paidByFilter === 'All' || (e.paidBy || e.paid_by) === paidByFilter;
    const matchesMode = modeFilter === 'All' || (e.paymentMode || e.payment_mode) === modeFilter;
    const matchesSearch = e.description?.toLowerCase().includes(search.toLowerCase()) || 
                          (e.paidTo || e.paid_to)?.toLowerCase().includes(search.toLowerCase()) ||
                          e.receivableFrom?.toLowerCase().includes(search.toLowerCase());
    
    const matchesMonth = monthFilter === 'All' || format(expenseDate, 'MM') === monthFilter;
    const matchesYear = yearFilter === 'All' || format(expenseDate, 'yyyy') === yearFilter;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      matchesDate = isWithinInterval(expenseDate, {
        start: startOfDay(parseISO(dateRange.start)),
        end: endOfDay(parseISO(dateRange.end))
      });
    } else if (dateRange.start) {
      matchesDate = e.date >= dateRange.start;
    } else if (dateRange.end) {
      matchesDate = e.date <= dateRange.end;
    }

    return matchesFilter && matchesPaidBy && matchesMode && matchesSearch && matchesDate && matchesMonth && matchesYear;
  });

  const uniquePaidBy = Array.from(new Set(expenses.map(e => e.paidBy || e.paid_by)));
  const uniqueYears = Array.from(new Set(expenses.map(e => format(parseISO(e.date), 'yyyy')))).sort().reverse();
  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
  ];
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOwedToMe = filteredExpenses
    .filter(e => e.receivableFrom && e.userId === user.uid)
    .reduce((sum, e) => sum + e.amount, 0);
  const totalIOwe = filteredExpenses
    .filter(e => e.receivableFrom && e.userId !== user.uid)
    .reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalOwedToMe - totalIOwe;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'expenses', deleteId));
      setDeleteId(null);
      setSelectedIds(prev => prev.filter(id => id !== deleteId));
    } catch (err) {
      console.error(err);
      alert('Failed to delete expense');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected expenses?`)) return;

    setIsBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'expenses', id));
      }
      setSelectedIds([]);
      alert(`Successfully deleted ${selectedIds.length} expenses.`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete some expenses');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handlePurge = async () => {
    const itemsToPurge = expenses.filter(e => {
      const expenseDate = parseISO(e.date);
      const matchesMonth = purgeConfig.month === 'All' || format(expenseDate, 'MM') === purgeConfig.month;
      const matchesYear = format(expenseDate, 'yyyy') === purgeConfig.year;
      return matchesMonth && matchesYear;
    });

    if (itemsToPurge.length === 0) {
      alert('No data found for the selected period.');
      return;
    }

    const periodLabel = purgeConfig.month === 'All' 
      ? `all data for the year ${purgeConfig.year}` 
      : `${months.find(m => m.value === purgeConfig.month)?.label} ${purgeConfig.year}`;

    if (!confirm(`CRITICAL: Are you sure you want to PERMANENTLY DELETE ${itemsToPurge.length} records from ${periodLabel}? This cannot be undone.`)) return;

    setIsBulkDeleting(true);
    try {
      for (const item of itemsToPurge) {
        await deleteDoc(doc(db, 'expenses', item.id));
      }
      setIsPurgeModalOpen(false);
      alert(`Successfully purged ${itemsToPurge.length} records.`);
    } catch (err) {
      console.error(err);
      alert('Failed to purge some data');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${isPink ? 'text-pink-600' : ''}`}>Expenses</h2>
          <p className="text-stone-500">Manage and track all shared transactions</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 transition-all text-sm"
            >
              <Trash2 className="w-5 h-5" />
              Delete Selected ({selectedIds.length})
            </button>
          )}
          <button
            onClick={() => setIsPurgeModalOpen(true)}
            className="px-6 py-3 bg-white border border-stone-200 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-50 transition-all text-sm text-red-500"
          >
            <Trash2 className="w-5 h-5" />
            Purge Data
          </button>
          {user.partnerId && (
            <button
              onClick={() => {
                const partnerName = expenses.find(e => e.userId !== user.uid)?.paidBy || expenses.find(e => e.userId !== user.uid)?.paid_by;
                if (partnerName) setPaidByFilter(partnerName);
              }}
              className="px-6 py-3 bg-white border border-stone-200 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-50 transition-all text-sm"
            >
              <User className="w-5 h-5" />
              Her/His Expenses
            </button>
          )}
          <button
            onClick={exportPDF}
            className="px-6 py-3 bg-white border border-stone-200 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-50 transition-all text-sm"
          >
            <FileText className="w-5 h-5" />
            Export PDF
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className={`${primaryColor} ${isPink ? 'text-white' : 'text-stone-900'} px-6 py-3 rounded-xl font-bold flex items-center gap-2 ${primaryHover} transition-all shadow-lg ${primaryShadow}`}
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Paid To or Description..."
              className={`w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 ${primaryRing}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center lg:col-span-2 justify-end">
            <Calendar className="w-5 h-5 text-stone-400 shrink-0" />
            <input 
              type="date" 
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span className="text-stone-400">to</span>
            <input 
              type="date" 
              className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-bold text-stone-400 uppercase">Filters:</span>
          </div>
          
          <select 
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-stone-200"
            value={paidByFilter}
            onChange={(e) => setPaidByFilter(e.target.value)}
          >
            <option value="All">All Paid By</option>
            {uniquePaidBy.map(name => <option key={name} value={name}>{name}</option>)}
          </select>

          <select 
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-stone-200"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="All">All Modes</option>
            {MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </select>

          <select 
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-stone-200"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="All">All Months</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <select 
            className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-stone-200"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="All">All Years</option>
            {uniqueYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>

          {(filter !== 'All' || paidByFilter !== 'All' || modeFilter !== 'All' || dateRange.start || dateRange.end || search || monthFilter !== 'All' || yearFilter !== 'All') && (
            <button 
              onClick={() => {
                setFilter('All');
                setPaidByFilter('All');
                setModeFilter('All');
                setDateRange({ start: '', end: '' });
                setSearch('');
                setMonthFilter('All');
                setYearFilter('All');
              }}
              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear All
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                filter === cat ? `${primaryColor} text-white` : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className={`${cardBg} rounded-3xl shadow-sm border ${borderCol} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className={`${isPink ? 'bg-stone-100' : 'bg-white/5'} border-b ${borderCol}`}>
                <th className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
                    checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}>Date</th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}>Category</th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}>Paid To</th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}>Amount</th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}>Payment Info</th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}>Settlement Status</th>
                <th className={`px-6 py-4 text-xs font-bold ${mutedText} uppercase tracking-wider whitespace-nowrap`}></th>
              </tr>
            </thead>
            <tbody className={`divide-y ${borderCol}`}>
              {loading ? (
                <tr><td colSpan={6} className={`px-6 py-12 text-center ${mutedText}`}>Loading expenses...</td></tr>
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan={6} className={`px-6 py-12 text-center ${mutedText}`}>No expenses found</td></tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className={`${isPink ? 'hover:bg-stone-50' : 'hover:bg-white/5'} transition-colors group ${selectedIds.includes(expense.id) ? (isPink ? 'bg-pink-50/50' : 'bg-white/5') : ''}`}>
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
                        checked={selectedIds.includes(expense.id)}
                        onChange={() => toggleSelect(expense.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm font-medium ${textColor}`}>{format(parseISO(expense.date), 'MMM dd, yyyy')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${primaryBadge}`}>
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPink ? 'bg-stone-100' : 'bg-white/10'}`}>
                          <ReceiptIcon className={`w-4 h-4 ${mutedText}`} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${boldTextColor}`}>{expense.paidTo || expense.paid_to}</p>
                          <p className={`text-xs ${mutedText}`}>{expense.paymentMode || expense.payment_mode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm font-bold ${primaryText}`}>₹{expense.amount.toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          expense.userId === user.uid 
                            ? (isPink ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700') 
                            : (isPink ? 'bg-stone-900 text-white' : 'bg-amber-100 text-amber-700')
                        }`}>
                          {(expense.paidBy || expense.paid_by)?.[0]}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${boldTextColor}`}>{expense.paidBy || expense.paid_by}</p>
                          <p className={`text-[10px] ${mutedText}`}>
                            {expense.userId === user.uid ? 'You paid' : 'Partner paid'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {expense.receivableFrom ? (
                        <div className={`flex items-center gap-2 ${
                          expense.userId === user.uid 
                            ? 'text-emerald-500' 
                            : 'text-rose-500'
                        }`}>
                          {expense.userId === user.uid ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                          <div className="flex flex-col">
                            <span className="text-sm font-bold">₹{expense.amount.toFixed(2)}</span>
                            <span className="text-[10px] font-medium opacity-80">
                              {expense.userId === user.uid ? `Owed by ${expense.receivableFrom}` : `You owe ${expense.paidBy || expense.paid_by}`}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 opacity-30">
                          <HandCoins className="w-4 h-4" />
                          <span className="text-xs">No split</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setViewingExpense(expense)}
                          className="p-2 hover:bg-stone-100 text-stone-400 hover:text-stone-900 rounded-lg transition-all"
                          title="View Details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {expense.receiptUrl && (
                          <button 
                            onClick={() => window.open(expense.receiptUrl, '_blank')}
                            className="p-2 hover:bg-stone-100 text-stone-400 hover:text-stone-900 rounded-lg transition-all"
                            title="View Receipt"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => setEditingExpense(expense)}
                          className="p-2 hover:bg-stone-100 text-stone-400 hover:text-stone-900 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteId(expense.id)}
                          className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-stone-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Totals Footer */}
        {!loading && filteredExpenses.length > 0 && (
          <div className={`p-6 border-t ${isPink ? 'bg-[#FFF0F3]/50' : 'bg-white/5'} grid grid-cols-1 md:grid-cols-3 gap-4`}>
            <div className={`flex items-center justify-between p-4 ${isPink ? 'bg-white' : 'bg-white/5'} rounded-2xl border ${borderCol} shadow-sm`}>
              <span className={`text-sm font-bold ${mutedText} uppercase`}>Total Filtered</span>
              <span className={`text-xl font-black ${primaryText}`}>₹{totalAmount.toLocaleString()}</span>
            </div>
            <div className={`flex items-center justify-between p-4 ${isPink ? 'bg-white' : 'bg-white/5'} rounded-2xl border ${borderCol} shadow-sm`}>
              <div className="flex flex-col">
                <span className={`text-[10px] font-bold ${mutedText} uppercase`}>Owed to Me</span>
                <span className="text-lg font-black text-emerald-500">₹{totalOwedToMe.toLocaleString()}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className={`text-[10px] font-bold ${mutedText} uppercase`}>I Owe</span>
                <span className="text-lg font-black text-rose-500">₹{totalIOwe.toLocaleString()}</span>
              </div>
            </div>
            <div className={`flex items-center justify-between p-4 ${netBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50'} rounded-2xl border ${netBalance >= 0 ? 'border-emerald-100' : 'border-rose-100'} shadow-sm`}>
              <span className={`text-sm font-bold ${netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'} uppercase`}>Net Balance</span>
              <span className={`text-xl font-black ${netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {netBalance >= 0 ? '+' : ''}₹{netBalance.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${cardBg} w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border ${borderCol}`}
            >
              <div className={`p-6 border-b ${borderCol} flex justify-between items-center ${isPink ? 'bg-stone-50' : 'bg-white/5'}`}>
                <h3 className={`text-xl font-bold ${textColor}`}>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</h3>
                <button onClick={() => { setIsModalOpen(false); resetForm(); }} className={`p-2 ${isPink ? 'hover:bg-stone-200' : 'hover:bg-white/10'} rounded-full transition-colors`}>
                  <X className={`w-5 h-5 ${textColor}`} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Amount</label>
                    <div className="relative">
                      <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedText} font-bold`}>₹</span>
                      <input
                        required
                        type="number"
                        step="0.01"
                        className={`w-full pl-8 pr-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none text-lg font-bold ${textColor}`}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Category</label>
                    <select
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none ${textColor}`}
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c} className="text-stone-900">{c}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Payment Mode</label>
                    <select
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none ${textColor}`}
                      value={formData.paymentMode}
                      onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    >
                      {MODES.map(m => <option key={m} value={m} className="text-stone-900">{m}</option>)}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Paid To</label>
                    <input
                      required
                      type="text"
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none ${textColor}`}
                      value={formData.paidTo}
                      onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                      placeholder="e.g. Starbucks, Amazon"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Upload Receipt / Screenshot</label>
                    <div className="flex items-center gap-4">
                      <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border border-dashed rounded-xl cursor-pointer hover:bg-stone-100 transition-all`}>
                        <ReceiptIcon className={`w-5 h-5 ${mutedText}`} />
                        <span className={`text-sm ${mutedText}`}>{formData.receiptName || 'Click to upload file'}</span>
                        <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" />
                      </label>
                      {formData.receiptUrl && (
                        <button 
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, receiptUrl: '', receiptName: '', receiptType: '' }))}
                          className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {formData.receiptUrl && formData.receiptType.startsWith('image/') && (
                      <div className="mt-4 relative rounded-xl overflow-hidden border border-stone-200 aspect-video">
                        <img src={formData.receiptUrl} alt="Receipt preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Receivable From (Optional)</label>
                    <div className="relative">
                      <ArrowDownLeft className={`absolute left-4 top-1/2 -translate-y-1/2 ${mutedText} w-4 h-4`} />
                      <input
                        type="text"
                        className={`w-full pl-10 pr-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none ${textColor}`}
                        value={formData.receivableFrom}
                        onChange={(e) => setFormData({ ...formData, receivableFrom: e.target.value })}
                        placeholder="e.g. Friend's Name (if they owe you both)"
                      />
                    </div>
                    <p className={`text-[10px] ${mutedText} mt-1 ml-1`}>Leave blank if this is a standard expense.</p>
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Date</label>
                    <input
                      required
                      type="date"
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none ${textColor}`}
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Description</label>
                    <input
                      type="text"
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl focus:ring-2 ${primaryRing} outline-none ${textColor}`}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="e.g. Dinner with friends"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className={`w-full ${isPink ? 'bg-[#FF8DA1] text-white' : 'bg-white text-black'} py-4 rounded-2xl font-bold text-lg transition-all shadow-xl shadow-emerald-500/10 hover:scale-[1.01] active:scale-[0.99]`}
                >
                  {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Expense?"
        message="This action cannot be undone. This expense will be permanently removed from your shared records."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Expense Details Modal */}
      <AnimatePresence>
        {viewingExpense && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`${cardBg} w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border ${borderCol}`}
            >
              <div className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${primaryBadge}`}>
                      {viewingExpense.category}
                    </span>
                    <h3 className={`text-3xl font-black ${textColor}`}>{viewingExpense.paidTo || viewingExpense.paid_to}</h3>
                    <p className={mutedText}>{format(parseISO(viewingExpense.date), 'EEEE, MMMM dd, yyyy')}</p>
                  </div>
                  <button onClick={() => setViewingExpense(null)} className={`p-3 ${isPink ? 'hover:bg-stone-100' : 'hover:bg-white/10'} rounded-2xl transition-colors`}>
                    <X className={`w-6 h-6 ${textColor}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className={`p-6 rounded-3xl ${isPink ? 'bg-stone-50' : 'bg-white/5'} border ${borderCol}`}>
                    <p className={`text-xs font-bold ${mutedText} uppercase mb-1`}>Amount Paid</p>
                    <p className={`text-3xl font-black ${primaryText}`}>₹{viewingExpense.amount.toLocaleString()}</p>
                  </div>
                  <div className={`p-6 rounded-3xl ${isPink ? 'bg-stone-50' : 'bg-white/5'} border ${borderCol}`}>
                    <p className={`text-xs font-bold ${mutedText} uppercase mb-1`}>Payment Mode</p>
                    <div className="flex items-center gap-2">
                      {viewingExpense.paymentMode === 'UPI' ? <Smartphone className="w-5 h-5 text-emerald-500" /> : <CreditCard className="w-5 h-5 text-blue-500" />}
                      <p className={`text-xl font-bold ${textColor}`}>{viewingExpense.paymentMode || viewingExpense.payment_mode}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPink ? 'bg-pink-100 text-pink-600' : 'bg-white/10 text-white'}`}>
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${mutedText} uppercase`}>Paid By</p>
                      <p className={`text-lg font-bold ${textColor}`}>{viewingExpense.paidBy || viewingExpense.paid_by}</p>
                    </div>
                  </div>

                  {viewingExpense.description && (
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPink ? 'bg-stone-100' : 'bg-white/10'} shrink-0`}>
                        <FileText className={`w-6 h-6 ${mutedText}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${mutedText} uppercase`}>Description</p>
                        <p className={`${textColor}`}>{viewingExpense.description}</p>
                      </div>
                    </div>
                  )}

                  {viewingExpense.location && (
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isPink ? 'bg-stone-100' : 'bg-white/10'}`}>
                        <MapPin className={`w-6 h-6 ${mutedText}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${mutedText} uppercase`}>Location</p>
                        <p className={`${textColor}`}>{viewingExpense.location}</p>
                      </div>
                    </div>
                  )}
                </div>

                {viewingExpense.receiptUrl && (
                  <div className="space-y-3">
                    <p className={`text-xs font-bold ${mutedText} uppercase`}>Receipt Attachment</p>
                    <div className={`relative rounded-3xl overflow-hidden border ${borderCol} group`}>
                      {viewingExpense.receiptType?.startsWith('image/') ? (
                        <img src={viewingExpense.receiptUrl} alt="Receipt" className="w-full max-h-[300px] object-contain bg-stone-100" />
                      ) : (
                        <div className="p-8 flex flex-col items-center justify-center gap-4 bg-stone-50">
                          <FileText className="w-12 h-12 text-stone-400" />
                          <p className="font-bold text-stone-600">{viewingExpense.receiptName}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => window.open(viewingExpense.receiptUrl, '_blank')}
                          className="px-6 py-3 bg-white text-stone-900 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                          <Download className="w-5 h-5" />
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setEditingExpense(viewingExpense);
                      setViewingExpense(null);
                    }}
                    className={`flex-1 py-4 ${isPink ? 'bg-stone-100 text-stone-900' : 'bg-white/10 text-white'} rounded-2xl font-bold hover:bg-opacity-80 transition-all flex items-center justify-center gap-2`}
                  >
                    <Edit2 className="w-5 h-5" />
                    Edit Details
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(viewingExpense.id);
                      setViewingExpense(null);
                    }}
                    className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-5 h-5" />
                    Delete Expense
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Purge Data Modal */}
      <AnimatePresence>
        {isPurgeModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`${cardBg} w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl border ${borderCol}`}
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className={`text-xl font-black ${textColor}`}>Purge Data</h3>
                  </div>
                  <button onClick={() => setIsPurgeModalOpen(false)} className={`p-2 ${isPink ? 'hover:bg-stone-100' : 'hover:bg-white/10'} rounded-xl transition-colors`}>
                    <X className={`w-5 h-5 ${textColor}`} />
                  </button>
                </div>

                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-sm text-red-600 font-medium leading-relaxed">
                    Select a month and year to permanently delete all associated expense records. This action is irreversible.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Select Month</label>
                    <select
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl outline-none ${textColor}`}
                      value={purgeConfig.month}
                      onChange={(e) => setPurgeConfig({ ...purgeConfig, month: e.target.value })}
                    >
                      <option value="All">All Months (Full Year)</option>
                      {months.map(m => <option key={m.value} value={m.value} className="text-stone-900">{m.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold ${mutedText} uppercase mb-2`}>Select Year</label>
                    <select
                      className={`w-full px-4 py-3 ${isPink ? 'bg-stone-50 border-stone-200' : 'bg-white/5 border-white/10'} border rounded-xl outline-none ${textColor}`}
                      value={purgeConfig.year}
                      onChange={(e) => setPurgeConfig({ ...purgeConfig, year: e.target.value })}
                    >
                      {uniqueYears.map(year => <option key={year} value={year} className="text-stone-900">{year}</option>)}
                    </select>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <button
                    onClick={handlePurge}
                    disabled={isBulkDeleting}
                    className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-lg hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50"
                  >
                    {isBulkDeleting ? 'Purging...' : 'Confirm Purge'}
                  </button>
                  <button
                    onClick={() => setIsPurgeModalOpen(false)}
                    className={`w-full py-4 ${isPink ? 'bg-stone-100 text-stone-900' : 'bg-white/10 text-white'} rounded-2xl font-bold transition-all`}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
