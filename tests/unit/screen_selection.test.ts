import { describe,it,expect } from 'vitest';
import { regionPixels } from '../../src/platform/mediaCapture';
describe('local frame selection',()=>{
 it('maps normalized regions to bounded pixels',()=>{
   expect(regionPixels({x:.25,y:.25,width:.5,height:.5},640,480)).toEqual({x:160,y:120,width:320,height:240});
   expect(regionPixels({x:.99,y:.99,width:.01,height:.01},1,1)).toEqual({x:0,y:0,width:1,height:1});
 });
 it('rejects invalid and outside-frame selection',()=>{
   for(const r of [{x:-1,y:0,width:1,height:1},{x:0,y:0,width:NaN,height:1},{x:.5,y:.5,width:1,height:1},{x:0,y:0,width:0,height:1}]) expect(()=>regionPixels(r,640,480)).toThrow();
 });
});
