import React, { useState } from 'react';
import { KingdomAdapter } from '../api/kingdomAdapter';
import { Terminal as TerminalIcon, Send, Trash2 } from 'lucide-react';

interface TerminalProps {
  adapter: KingdomAdapter;
}

export const Terminal: React.FC<TerminalProps> = ({ adapter }) => {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<Array<{ command: string; output: string; time: string }>>([
    {
      command: 'welcome',
      output: 'Centipede OS Terminal Entry Point v1.0\nType "help" to see available system commands.',
      time: new Date().toLocaleTimeString(),
    },
  ]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    setInput('');
    const time = new Date().toLocaleTimeString();

    if (cmd === 'clear') {
      setHistory([]);
      return;
    }

    let output = '';

    try {
      const parts = cmd.split(' ');
      const main = parts[0].toLowerCase();

      switch (main) {
        case 'help':
          output = `Available Commands:
  help               - Show this help message
  status             - Get Kingdom runtime engine status
  start              - Start Kingdom runtime engine
  stop               - Stop Kingdom runtime engine
  knights            - List active swarm knights
  models             - Get AI models health
  tasks              - List tracked tasks
  security           - Get security status & pending approvals count
  reconnect          - Trigger manual reconnection
  clear              - Clear terminal scrollback`;
          break;

        case 'status':
          const status = await adapter.get_status();
          output = JSON.stringify(status, null, 2);
          break;

        case 'start':
          const startRes = await adapter.start_runtime();
          output = JSON.stringify(startRes, null, 2);
          break;

        case 'stop':
          const stopRes = await adapter.stop_runtime();
          output = JSON.stringify(stopRes, null, 2);
          break;

        case 'knights':
          const knights = await adapter.get_knights();
          output = JSON.stringify(knights, null, 2);
          break;

        case 'models':
          const models = await adapter.get_models();
          output = JSON.stringify(models, null, 2);
          break;

        case 'tasks':
          const tasks = await adapter.list_tasks();
          output = JSON.stringify(tasks, null, 2);
          break;

        case 'security':
          const sec = await adapter.get_security_status();
          output = JSON.stringify(sec, null, 2);
          break;

        case 'reconnect':
          const ok = await adapter.reconnect();
          output = ok ? 'Reconnection successful!' : 'Reconnection failed.';
          break;

        default:
          output = `Command not recognized: "${cmd}". Type "help" for command list.`;
          break;
      }
    } catch (err: any) {
      output = `Error executing command: ${err.message}`;
    }

    setHistory((prev) => [...prev, { command: cmd, output, time }]);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4 h-[calc(100vh-140px)] flex flex-col">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <TerminalIcon className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Centipede Terminal Entry Point</h2>
        </div>
        <button
          onClick={() => setHistory([])}
          className="flex items-center space-x-1 text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Scrollback</span>
        </button>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-y-auto space-y-4">
        {history.map((item, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center space-x-2 text-slate-400">
              <span className="text-emerald-400 font-bold">centipede@os:~$</span>
              <span className="text-white font-semibold">{item.command}</span>
              <span className="text-[10px] text-slate-600">[{item.time}]</span>
            </div>
            <pre className="text-slate-300 pl-4 whitespace-pre-wrap">{item.output}</pre>
          </div>
        ))}
      </div>

      {/* Terminal Command Input Form */}
      <form onSubmit={handleCommand} className="flex items-center space-x-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-emerald-400 font-mono font-bold text-sm">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type system command (e.g. status, knights, security, help)..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-4 py-2.5 text-slate-100 font-mono text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-colors flex items-center space-x-1"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
