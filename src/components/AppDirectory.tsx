import React, { useState } from 'react';
import { APP_GROUPS } from '../platform/appCatalog';

export function AppDirectory({ onNavigate, pendingApprovalsCount }: {
  onNavigate:(id:string)=>void; pendingApprovalsCount:number;
}) {
  const [query,setQuery]=useState('');
  const search=query.trim().toLowerCase();
  const groups=APP_GROUPS.map(group=>({...group,apps:group.apps.filter(app=>!search || (app.name+' '+group.name).toLowerCase().includes(search))})).filter(group=>group.apps.length);
  return <section aria-label="Application directory" className="mx-auto max-w-5xl space-y-5 p-3 sm:p-6">
    <h1 className="text-2xl font-semibold text-white">Apps</h1>
    <label htmlFor="app-directory-search" className="block text-sm text-slate-200">Find an application</label>
    <input id="app-directory-search" value={query} maxLength={120} onChange={event=>setQuery(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white" placeholder="Search apps and settings"/>
    {groups.length===0 && <p role="status">No matching applications.</p>}
    {groups.map(group=><section key={group.name} aria-label={group.name} className="space-y-2">
      <h2 className="text-sm font-semibold text-blue-200">{group.name}</h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.apps.map(app=><button key={app.id} type="button" aria-label={app.name} onClick={()=>onNavigate(app.id)} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm text-white hover:border-blue-400">
          <app.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300"/><span>{app.name}</span>
          {app.id==='security' && pendingApprovalsCount>0 && <span className="ml-auto rounded bg-red-900 px-2 text-xs">{pendingApprovalsCount}</span>}
        </button>)}
      </div>
    </section>)}
  </section>;
}
