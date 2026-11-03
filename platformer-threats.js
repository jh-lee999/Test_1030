// Shared tells and attack commitment. No random rolls or player stat changes.
export const attackWindup=e=>e.boss?(e.windup??.95):({rusher:.55,guard:.65,caster:1,drone:.7,ghost:.75,archer:.55,fan:.46}[e.type]??.6);
export function reserveEnemyAttack(g,e){
  if(!g.room.arena)return true;
  if(g.time<(g.room.nextAttackTime||0))return false;
  // Start tells on screen; never cancel an attack already promised to the player.
  if(e.x<g.camera-80||e.x>g.camera+1360)return false;
  const winding=g.room.enemies.filter(q=>q!==e&&q.hp>0&&q.mode==='attack'&&q.timer<attackWindup(q)).length;
  if(winding>=2)return false;
  g.room.nextAttackTime=g.time+.28;return true;
}
export function lockEnemyAttack(g,e){
  e.mode='attack';e.timer=0;e.attackId++;e.attackFacing=e.facing;e.exposureGranted=false;
  if(e.type==='rusher')e.chargeFacing=undefined;
  const x=e.x+e.facing*25,y=e.y-e.h*.6;
  e.aimTarget={x:g.player.x,y:g.player.y-42};
  e.aimAngle=Math.atan2(e.aimTarget.y-y,e.aimTarget.x-x);
}
export const exposeEnemy=(g,e,duration=.6)=>{e.exposedUntil=g.time+duration;};
