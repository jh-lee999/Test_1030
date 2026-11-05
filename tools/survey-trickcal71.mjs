// Read public viewer metadata through its normal public client, no private APIs.
import {openTrickcalReference} from './lib/trickcal-reference.mjs';
const {browser,page}=await openTrickcalReference();
try{
 console.log(JSON.stringify(await page.evaluate(async()=>{
  const catalog=await (await fetch('/spine/data.json')).json();
  return catalog.filter(v=>v.category==='인게임'&&/^(셰이디|코미|시온|벨벳|에르핀)$/.test(v.displayName)&&v.variant==='인게임');
 }),null,2));
 console.log(await page.evaluate(async()=>{
  const {Assets}=await import('/assets/lib-BFAhM2oF.js'),{Spine}=await import('/assets/dist-BKtfa-2w.js');
  await Assets.load([{alias:'survey-s',src:'/spine/battle/butter/Butter.skel'},{alias:'survey-a',src:'/spine/battle/butter/Butter.atlas'}]);
  const s=Spine.from('survey-s','survey-a');return {animations:s.skeleton.data.animations.map(a=>({name:a.name,duration:a.duration})),skins:s.skeleton.data.skins.map(s=>s.name)};
 }));
 await page.evaluate(async()=>{
  const {Assets,Application}=await import('/assets/lib-BFAhM2oF.js'),{Spine}=await import('/assets/dist-BKtfa-2w.js');
  const app=new Application({width:1200,height:280,backgroundColor:0xfff8e8,antialias:true,preserveDrawingBuffer:true});app.stop();document.body.replaceChildren(app.view);
  const out=[];
  for(let i=0;i<5;i++){
   const s=Spine.from('survey-s','survey-a');s.autoUpdate=false;s.skeleton.setSkinByName('Normal');s.skeleton.setToSetupPose();s.state.setAnimation(0,'OW1_Attack2_1',false);s.update(i*.55);s.scale.set(.3);s.position.set(115+i*235,250);app.stage.addChild(s);
   out.push({time:i*.55,bones:s.skeleton.bones.filter(b=>/Point_/.test(b.data.name)).map(b=>({name:b.data.name,x:b.worldX,y:b.worldY}))});
  }app.renderer.render(app.stage);window.surveyApp=app;return out;
 }).then(r=>console.log(JSON.stringify(r)));
 await page.locator('canvas').screenshot({path:'/tmp/butter71-gun-survey.png'});
}finally{await browser.close();}
