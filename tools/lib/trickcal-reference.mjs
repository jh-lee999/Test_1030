// Shared read-only reference session. Same allowlisted URLs, inherited proxy,
// system CA verification. Does not ship a Spine runtime with the game.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
const run=promisify(execFile);
export async function openTrickcalReference(){
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,proxy:process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY}:undefined,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  const context=await browser.newContext({serviceWorkers:'block'}),responses=new Map(),sources=new Map();
  await context.route('https://**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!=='https://viewer.dclnslde.com'||route.request().method()!=='GET')return route.abort();
    try{
      let body=responses.get(u.href);
      if(!body){({stdout:body}=await run('curl',['-fsSL','--max-time','30','--max-filesize','25000000',u.href],{encoding:'buffer',maxBuffer:26000000}));responses.set(u.href,body);sources.set(u.href,{url:u.href,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')});}
      const type={js:'text/javascript',css:'text/css',json:'application/json',png:'image/png',webp:'image/webp',jpg:'image/jpeg',ttf:'font/ttf'}[u.pathname.split('.').pop()]||(u.pathname==='/'?'text/html':'application/octet-stream');
      await route.fulfill({status:200,body,contentType:type});
    }catch(error){console.error('Reference request failed',u.pathname,error.message);await route.abort();}
  });
  const page=await context.newPage();
  await page.goto('https://viewer.dclnslde.com/',{waitUntil:'domcontentloaded'});await page.waitForSelector('#root .app');
  return {browser,page,sources,responses};
}
