import React, { useEffect, useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { TaskItem } from '../types';
import { Activity, Plus, XCircle, RefreshCw, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface ActivityTaskViewProps {
  adapter: KingdomAdapter;
}

export const ActivityTaskView: React.FC<ActivityTaskViewProps> = ({ adapter }) => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const fetchTasks = async () => {
    try {
      const list = await adapter.list_tasks(filter === 'all' ? undefined : filter);
      setTasks(list);
    } catch (err) {
      // Handled
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2500);
    return () => clearInterval(interval);
  }, [filter]);

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await adapter.submit_task(prompt, { client: 'centipede_os_activity_view' });
      setPrompt('');
      setMessage(`Task created successfully with ID: ${created.id}`);
      fetchTasks();
      setTimeout(() => setMessage(''), 4000);
    } catch (err: any) {
      setMessage(`Failed to submit task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelTask = async (taskId: string) => {
    try {
      await adapter.cancel_task(taskId);
      setMessage(`Task ${taskId} cancelled.`);
      fetchTasks();
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage(`Failed to cancel task: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-7 h-7 text-emerald-400" />
          <div>
            <h2 className="text-2xl font-bold text-white">Activity & Task Manager</h2>
            <p className="text-slate-400 text-sm">Submit prompts and monitor Kingdom runtime tasks</p>
          </div>
        </div>

        <button
          onClick={fetchTasks}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {message && (
        <div className="bg-blue-950/60 border border-blue-500/40 text-blue-300 px-4 py-3 rounded-xl text-sm">
          {message}
        </div>
      )}

      {/* Task Creation Form */}
      <form onSubmit={handleSubmitTask} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-3 shadow-xl">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a task prompt for Kingdom swarm processing..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={isSubmitting || !prompt.trim()}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          <span>Submit Task</span>
        </button>
      </form>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {['all', 'queued', 'running', 'completed', 'failed', 'cancelled'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8 text-center text-slate-400 text-sm italic">
            No tasks found matching filter "{filter}".
          </div>
        ) : (
          tasks.map((t) => (
            <div
              key={t.id}
              className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    t.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : t.status === 'running'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                      : t.status === 'queued'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">ID: {t.id}</span>
                </div>
                <div className="text-white font-medium text-sm">{t.prompt}</div>
              </div>

              {(t.status === 'queued' || t.status === 'running') && (
                <button
                  onClick={() => handleCancelTask(t.id)}
                  className="flex items-center space-x-1 text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancel Task</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
