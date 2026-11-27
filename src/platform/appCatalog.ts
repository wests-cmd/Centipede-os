import { Activity, BarChart3, Bot, Brain, Cpu, Folder, Grid, Home, Map, Search, Server, Shield, ShieldAlert, Sliders, Smartphone, Stethoscope, Terminal, Video } from 'lucide-react';

/** The shell has seven primary destinations; all advanced views remain reachable. */
export const PRIMARY_DESTINATIONS = [
  { id:'launcher', name:'Home', icon:Home },
  { id:'ai', name:'Segmentor', icon:Bot },
  { id:'apps', name:'Apps', icon:Grid },
  { id:'files', name:'Files', icon:Folder },
  { id:'tasks', name:'Tasks', icon:Activity },
  { id:'mobile', name:'Devices', icon:Smartphone },
  { id:'settings', name:'Settings', icon:Sliders },
] as const;

export const APP_GROUPS = [
  { name:'Everyday', apps:[
    {id:'files',name:'File Explorer',icon:Folder},
    {id:'search',name:'Universal Search',icon:Search},
    {id:'terminal',name:'Terminal CLI',icon:Terminal},
  ]},
  { name:'Segmentor', apps:[
    {id:'ai',name:'Segmentor',icon:Bot},
    {id:'perception',name:'Camera, screen & mic',icon:Video},
    {id:'memory',name:'Memory Explorer',icon:Brain},
    {id:'skills',name:'Skill Manager',icon:Cpu},
  ]},
  { name:'Tasks and workspaces', apps:[
    {id:'tasks',name:'Activity & Tasks',icon:Activity},
    {id:'background',name:'Background Work',icon:Cpu},
    {id:'workspace',name:'Digital Workspace',icon:Grid},
  ]},
  { name:'Devices and infrastructure', apps:[
    {id:'mobile',name:'Mobile Companion',icon:Smartphone},
    {id:'maps',name:'Swarm Maps',icon:Map},
    {id:'status',name:'Kingdom Engine',icon:Server},
  ]},
  { name:'Settings and security', apps:[
    {id:'settings',name:'Settings',icon:Sliders},
    {id:'command',name:'Command Center',icon:BarChart3},
    {id:'security',name:'Security & Approvals',icon:Shield},
    {id:'agent_control',name:'Agent Control Plane',icon:ShieldAlert},
    {id:'doctor',name:'Doctor & Repair',icon:Stethoscope},
  ]},
] as const;
