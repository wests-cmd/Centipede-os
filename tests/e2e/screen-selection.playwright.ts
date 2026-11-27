import { test, expect } from '@playwright/test';

test('consented fixture screen frame can be cropped locally and discarded', async ({page})=>{
  await page.addInitScript(()=>{
    localStorage.setItem('centipede_first_run_completed','true');
    // Explicit synthetic display source for CI. This does not certify a physical
    // screen recorder or the native desktop portal's permission dialog.
    const canvas=document.createElement('canvas');
    canvas.width=320;canvas.height=240;
    const ctx=canvas.getContext('2d')!;
    const draw=()=>{ctx.fillStyle='#ff0000';ctx.fillRect(0,0,160,240);ctx.fillStyle='#0000ff';ctx.fillRect(160,0,160,240);};
    draw();
    Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{configurable:true,value:async()=>{
      const stream=canvas.captureStream(5);
      const timer=window.setInterval(draw,100);
      const originalStop=stream.getVideoTracks()[0].stop.bind(stream.getVideoTracks()[0]);
      stream.getVideoTracks()[0].stop=()=>{window.clearInterval(timer);originalStop();};
      return stream;
    }});
  });
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/');
  await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Apps',exact:true}).click();
  await page.getByRole('region',{name:'Application directory'}).getByRole('button',{name:'Camera, screen & mic'}).click();
  await page.getByRole('button',{name:'Start screen',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'screen capture ACTIVE'})).toBeVisible();
  await expect.poll(()=>page.locator('video').evaluate((video:HTMLVideoElement)=>video.videoWidth)).toBe(320);
  await page.getByRole('button',{name:'Preview one frame'}).click();
  const image=page.getByAltText('User-selected local frame; not model analysis');
  await expect(image).toBeVisible();
  await image.evaluate((img:HTMLImageElement)=>img.decode());
  await image.scrollIntoViewIfNeeded();
  const box=await image.boundingBox();expect(box).not.toBeNull();
  // Drag inside the blue half. Sample actual crop pixels, not a mock receipt.
  await page.mouse.move(box!.x+box!.width*.6,box!.y+box!.height*.2);
  await page.mouse.down();
  await page.mouse.move(box!.x+box!.width*.9,box!.y+box!.height*.8,{steps:8});
  await page.mouse.up();
  await page.getByRole('button',{name:'Preview selected region'}).click();
  const crop=page.getByAltText('Local cropped screen region');
  await expect(crop).toBeVisible();
  const result=await crop.evaluate(async(img:HTMLImageElement)=>{
    await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
    const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
    return {width:c.width,height:c.height,pixel:Array.from(ctx.getImageData(Math.floor(c.width/2),Math.floor(c.height/2),1,1).data)};
  });
  expect(result.width).toBeGreaterThan(80);expect(result.width).toBeLessThan(110);
  expect(result.height).toBeGreaterThan(120);expect(result.height).toBeLessThan(160);
  expect(result.pixel[2]).toBeGreaterThan(220);expect(result.pixel[0]).toBeLessThan(35);
  await page.getByRole('button',{name:'Stop and discard'}).click();
  await expect(crop).toHaveCount(0);
  await expect(image).toHaveCount(0);
});
