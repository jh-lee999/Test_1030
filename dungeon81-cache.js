// Presentation only: bounded caches, unchanged original cells/destination rects.
const contexts=new WeakMap(),sources=new WeakMap(),entries=new Map();
const LIMIT=24*1024*1024,MAX_ENTRIES=192;
let serial=0,bytes=0,hits=0,misses=0;
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const dispose=c=>{if(typeof c.close==='function')c.close();else c.width=c.height=0;};
function remember(key,canvas){
 const entry={canvas,bytes:canvas.width*canvas.height*4};entries.set(key,entry);bytes+=entry.bytes;
 while(bytes>LIMIT||entries.size>MAX_ENTRIES){const [old,e]=entries.entries().next().value;entries.delete(old);bytes-=e.bytes;dispose(e.canvas);}
 return canvas;
}
function touch(key){const e=entries.get(key);if(!e)return null;entries.delete(key);entries.set(key,e);hits++;return e.canvas;}
export function cacheStats(){return {bytes,entries:entries.size,hits,misses,limit:LIMIT};}
export function clearCaches(){for(const e of entries.values())dispose(e.canvas);entries.clear();bytes=0;}
export function primeImage(image){
 // decode() need not prepare a CPU Canvas source. Do the first CPU access while
 // the loading panel is visible, rather than during an enemy's first attack.
 if(!image?.naturalWidth||image.naturalWidth*image.naturalHeight<512*512)return;
 const c=makeCanvas(8,8),cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(image,0,0,Math.min(128,image.naturalWidth),Math.min(128,image.naturalHeight),0,0,8,8);cx.getImageData(0,0,1,1);c.width=c.height=0;
}
// Submit a small whole-cell texture, not the original 11520px-tall atlas.
// No scaling at cache creation: source pixels and original anchors are retained.
function drawCached(c,image,args){
 if(args.length!==8||!image?.naturalWidth||image.naturalWidth*image.naturalHeight<512*512)return c.drawImage(image,...args);
 const [sx,sy,sw,sh,dx,dy,dw,dh]=args;
 if(![sx,sy,sw,sh].every(Number.isInteger)||sw<=0||sh<=0||sw>768||sh>768)return c.drawImage(image,...args);
 let id=sources.get(image);if(!id){id=++serial;sources.set(image,id);}
 const key='s'+id+':'+[sx,sy,sw,sh].join(','),pad=2;
 let tile=touch(key);
 if(!tile){misses++;const can=typeof OffscreenCanvas==='function'?new OffscreenCanvas(sw+pad*2,sh+pad*2):makeCanvas(sw+pad*2,sh+pad*2),tc=can.getContext('2d',{willReadFrequently:true});tc.drawImage(image,sx,sy,sw,sh,pad,pad,sw,sh);tile=can.transferToImageBitmap?can.transferToImageBitmap():can;if(tile!==can)can.width=can.height=0;remember(key,tile);}
 c.drawImage(tile,pad,pad,sw,sh,dx,dy,dw,dh);
}
export function cachedContext(c){
 if(contexts.has(c))return contexts.get(c);
 const methods=new Map(),proxy=new Proxy(c,{get(target,key){if(key==='drawImage')return methods.get(key)||methods.set(key,(im,...args)=>drawCached(target,im,args)).get(key);const v=Reflect.get(target,key,target);if(typeof v!=='function')return v;if(!methods.has(key))methods.set(key,v.bind(target));return methods.get(key);},set(target,key,value){return Reflect.set(target,key,value,target);}});
 contexts.set(c,proxy);return proxy;
}
// Rasterize outlined labels once at the current physical scale (including DPR).
export function cachedLabel(c,text,x,y,size,color){
 const m=c.getTransform(),scale=Math.hypot(m.a,m.b),q=Math.max(.25,Math.ceil(scale*4)/4);
 if(!Number.isFinite(q)||q>4)return false;
 const font=size+'px Jua70, sans-serif',key='t:'+q+':'+font+':'+color+':'+text;
 let tile=touch(key);
 if(!tile){misses++;c.save();c.font=font;const width=c.measureText(text).width;c.restore();tile=makeCanvas(Math.ceil((width+12)*q),Math.ceil((size*1.8+12)*q));const tc=tile.getContext('2d');tc.scale(q,q);tc.font=font;tc.textAlign='center';tc.lineJoin='round';tc.strokeStyle='#193a37df';tc.lineWidth=5;tc.fillStyle=color;const ty=tile.height/q-size*.5-6;tc.strokeText(text,tile.width/q/2,ty);tc.fillText(text,tile.width/q/2,ty);remember(key,tile);}
 c.drawImage(tile,x-tile.width/q/2,y-(tile.height/q-size*.5-6),tile.width/q,tile.height/q);return true;
}
if(typeof document!=='undefined')document.fonts?.ready.then(clearCaches);
