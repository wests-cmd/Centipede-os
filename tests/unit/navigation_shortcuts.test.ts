import { describe,it,expect } from 'vitest';
import { readShortcuts,saveShortcuts } from '../../src/ai/navigationShortcuts';
import { routeQuickCommand,validShortcut } from '../../src/ai/deterministicRouter';
function storage(){let raw:string|null=null;return {getItem:()=>raw,setItem:(_key:string,value:string)=>{raw=value;}};}
describe('persistent navigation shortcuts',()=>{
  it('round trips exact explicitly saved commands, preserves built-ins',()=>{
    const s=storage();saveShortcuts(s,[{phrase:'work mode',destination:'files'}]);
    expect(routeQuickCommand(' WORK MODE ',readShortcuts(s))).toEqual({kind:'navigate',destination:'files'});
    expect(routeQuickCommand('open settings',readShortcuts(s))).toEqual({kind:'navigate',destination:'settings'});
    expect(routeQuickCommand('work mode now',readShortcuts(s))).toEqual({kind:'draft',text:'work mode now'});
  });
  it('rejects arbitrary targets, reserved phrases, duplicates and malformed storage',()=>{
    expect(validShortcut({phrase:'work mode',destination:'system.execute'})).toBe(false);
    expect(validShortcut({phrase:'stop everything',destination:'files'})).toBe(false);
    const s=storage();expect(()=>saveShortcuts(s,[{phrase:'work mode',destination:'files'},{phrase:'work mode',destination:'tasks'}])).toThrow();
    s.setItem('',JSON.stringify([{phrase:'work mode',destination:'__proto__'}]));expect(readShortcuts(s)).toEqual([]);
    s.setItem('','broken');expect(readShortcuts(s)).toEqual([]);
  });
});
