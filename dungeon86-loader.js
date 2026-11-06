// Publish only decoded images. Keep the old ready image during reload/retry.
export function createImageLoader({prime=()=>{},ImageClass=globalThis.Image,schedule=setTimeout,retries=2}={}){
 const generations=new WeakMap();
 return function loadImage(url,target,key,{priority='auto'}={}){
  let keys=generations.get(target);if(!keys){keys=new Map();generations.set(target,keys);}const generation=(keys.get(key)||0)+1;keys.set(key,generation);
  return new Promise(resolve=>{
   function attempt(n){
    if(keys.get(key)!==generation){resolve(null);return;}const im=new ImageClass();im.fetchPriority=priority;let done=false;
    const fail=()=>{if(done)return;done=true;if(keys.get(key)!==generation)resolve(null);else if(n<retries)schedule(()=>attempt(n+1),350*(n+1));else resolve(null);};
    im.onerror=fail;im.onload=async()=>{if(done)return;try{if(im.decode)await im.decode();}catch{fail();return;}if(done)return;done=true;if(keys.get(key)!==generation){resolve(null);return;}try{prime(im);}catch{}target[key]=im;resolve(im);};
    im.src=url+(n?(url.includes('?')?'&':'?')+'assetRetry86='+n:'');
   }attempt(0);
  });
 };
}
