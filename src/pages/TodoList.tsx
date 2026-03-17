import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckSquare, Square, Plus, Trash2, Calendar, Flag, ListTodo, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, parseISO } from 'date-fns';

export default function TodoList({ user }: { user: any }) {
  const [todos, setTodos] = useState<any[]>([]);
  const [newTask, setNewTask] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');

  const isPink = user?.gender === 'Female';
  const primaryColor = isPink ? 'bg-[#FF8DA1]' : 'bg-black';
  const cardBg = isPink ? 'bg-white' : 'bg-stone-900';
  const borderCol = isPink ? 'border-stone-200' : 'border-white/10';
  const textColor = isPink ? 'text-black' : 'text-white';
  const mutedText = isPink ? 'text-stone-600' : 'text-stone-400';
  const boldTextColor = isPink ? 'text-black' : 'text-white';

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'todos'),
      where('partnerId', 'in', [user.uid, user.partnerId || '']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const todoData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a: any, b: any) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return 0;
      });
      setTodos(todoData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    try {
      await addDoc(collection(db, 'todos'), {
        userId: user.uid,
        partnerId: user.partnerId || user.uid,
        task: newTask,
        isCompleted: false,
        dueDate: dueDate || null,
        priority,
        createdAt: serverTimestamp()
      });
      setNewTask('');
      setDueDate('');
      setPriority('Medium');
    } catch (err) {
      console.error('Error adding todo:', err);
    }
  };

  const toggleTodo = async (todo: any) => {
    try {
      await updateDoc(doc(db, 'todos', todo.id), {
        isCompleted: !todo.isCompleted
      });
    } catch (err) {
      console.error('Error updating todo:', err);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'todos', id));
    } catch (err) {
      console.error('Error deleting todo:', err);
    }
  };

  const isOverdue = (date: string) => {
    if (!date) return false;
    return isAfter(new Date(), parseISO(date)) && format(new Date(), 'yyyy-MM-dd') !== date;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className={`text-3xl font-bold ${boldTextColor} flex items-center gap-3`}>
          <ListTodo className="w-8 h-8 text-blue-500" />
          Shared Tasks
        </h2>
        <p className={mutedText}>Keep track of things we need to do together</p>
      </div>

      <form onSubmit={handleAddTodo} className={`${cardBg} p-6 rounded-3xl border ${borderCol} shadow-sm space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="What needs to be done?"
            className={`flex-1 px-6 py-4 rounded-2xl border ${borderCol} ${isPink ? 'bg-stone-50' : 'bg-stone-800'} focus:ring-2 focus:ring-blue-500 outline-none ${textColor} font-medium`}
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newTask.trim()}
            className={`px-8 py-4 ${primaryColor} text-white rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg`}
          >
            Add Task
          </button>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${mutedText}`} />
            <input
              type="date"
              className={`px-3 py-2 rounded-xl border ${borderCol} ${isPink ? 'bg-stone-50' : 'bg-stone-800'} text-sm ${textColor} outline-none`}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Flag className={`w-4 h-4 ${mutedText}`} />
            <select
              className={`px-3 py-2 rounded-xl border ${borderCol} ${isPink ? 'bg-stone-50' : 'bg-stone-800'} text-sm ${textColor} outline-none`}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
            </select>
          </div>
        </div>
      </form>

      <div className="space-y-3">
        {todos.map((todo) => (
          <motion.div
            layout
            key={todo.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${cardBg} p-4 rounded-2xl border ${borderCol} flex items-center gap-4 group hover:shadow-md transition-all`}
          >
            <button
              onClick={() => toggleTodo(todo)}
              className={`p-1 rounded-lg transition-all ${todo.isCompleted ? 'text-emerald-500' : 'text-stone-400 hover:text-blue-500'}`}
            >
              {todo.isCompleted ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`font-medium ${todo.isCompleted ? 'line-through text-stone-400' : textColor}`}>
                {todo.task}
              </p>
              <div className="flex items-center gap-3 mt-1">
                {todo.dueDate && (
                  <span className={`flex items-center gap-1 text-[10px] font-bold uppercase ${isOverdue(todo.dueDate) && !todo.isCompleted ? 'text-red-500' : 'text-stone-400'}`}>
                    <Clock className="w-3 h-3" />
                    {format(parseISO(todo.dueDate), 'MMM dd')}
                    {isOverdue(todo.dueDate) && !todo.isCompleted && ' (Overdue)'}
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase ${
                  todo.priority === 'High' ? 'text-red-500' :
                  todo.priority === 'Medium' ? 'text-orange-500' :
                  'text-blue-500'
                }`}>
                  {todo.priority}
                </span>
              </div>
            </div>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </motion.div>
        ))}
        {todos.length === 0 && (
          <div className="text-center py-12">
            <ListTodo className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <p className={mutedText}>No tasks yet. Add something to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}
