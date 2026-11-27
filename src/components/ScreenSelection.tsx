import React, { useRef, useState } from 'react';
import { regionPixels, type FrameRegion } from '../platform/mediaCapture';

/** Frozen frame only. No capture permission, storage, network or model calls. */
export function ScreenSelection({frame}:{frame:string}) {
  const image=useRef<HTMLImageElement>(null);
  const origin=useRef<{x:number;y:number}|null>(null);
  const [region,setRegion]=useState<FrameRegion>({x:0,y:0,width:1,height:1});
  const [crop,setCrop]=useState('');
  const [message,setMessage]=useState('');
  const point=(event:React.PointerEvent<HTMLElement>)=>{
    const bounds=event.currentTarget.getBoundingClientRect();
    return {x:Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width)),y:Math.max(0,Math.min(1,(event.clientY-bounds.top)/bounds.height))};
  };
  const change=(next:FrameRegion)=>{setRegion(next);setCrop('');setMessage('');};
  return <section aria-label="Select a region of the frozen frame" className="space-y-3">
    <p className="text-sm">Drag across the preview to select a region, or use the keyboard-accessible controls below.</p>
    <div className="relative inline-block max-w-full touch-none select-none" onPointerDown={event=>{if(event.button!==0)return;origin.current=point(event);event.currentTarget.setPointerCapture(event.pointerId);}}
      onPointerMove={event=>{if(!origin.current)return;const p=point(event),o=origin.current;const x=Math.min(o.x,p.x),y=Math.min(o.y,p.y);const width=Math.abs(p.x-o.x),height=Math.abs(p.y-o.y);if(width>0.01&&height>0.01)change({x,y,width,height});}}
      onPointerUp={()=>{origin.current=null;}} onPointerCancel={()=>{origin.current=null;}}>
      <img ref={image} draggable={false} src={frame} alt="User-selected local frame; not model analysis" className="block max-h-80 max-w-full rounded"/>
      <div aria-hidden="true" className="pointer-events-none absolute border-2 border-blue-300 bg-blue-400/10" style={{left:region.x*100+'%',top:region.y*100+'%',width:region.width*100+'%',height:region.height*100+'%'}}/>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      {(['x','y','width','height'] as const).map(key=>{
        const max=key==='x'?1-region.width:key==='y'?1-region.height:key==='width'?1-region.x:1-region.y;
        return <label key={key} className="block">{({x:'Left',y:'Top',width:'Width',height:'Height'})[key]} {Math.round(region[key]*100)}%
          <input type="range" min={key==='width'||key==='height'?0.01:0} max={Math.max(key==='width'||key==='height'?0.01:0,max)} step={0.01} value={region[key]} onChange={e=>change({...region,[key]:Number(e.target.value)})} className="block w-full"/>
        </label>;
      })}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={()=>change({x:0,y:0,width:1,height:1})} className="rounded border border-slate-600 px-3 py-2">Reset selection</button>
      <button type="button" onClick={()=>{
        try { const img=image.current;if(!img||!img.complete)throw new Error('Frame not ready.');
          const p=regionPixels(region,img.naturalWidth,img.naturalHeight);
          const canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.height;
          const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable.');
          ctx.drawImage(img,p.x,p.y,p.width,p.height,0,0,p.width,p.height);
          setCrop(canvas.toDataURL('image/png'));setMessage('Local selection ready. Nothing was uploaded or analyzed.');
        } catch {setCrop('');setMessage('Could not prepare selection.');}
      }} className="rounded border border-blue-500 px-3 py-2">Preview selected region</button>
    </div>
    {message&&<p role="status" className="text-sm">{message}</p>}
    {crop&&<img src={crop} alt="Local cropped screen region" className="max-h-64 max-w-full"/>}
  </section>;
}
