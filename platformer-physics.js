// Shared by live movement and the procedural generator's jump-path validator.
export const PHYSICS = Object.freeze({gravity:1850,jump:690,doubleJump:660,maxFall:1050,acceleration:2400,braking:3200,baseSpeed:235*1.4,bodyWidth:32,step:1/120});
export const approach=(a,b,n)=>a<b?Math.min(a+n,b):Math.max(a-n,b);
export function landBody(body,platforms,dt){
  const previous=body.y;body.y+=body.vy*dt;body.grounded=false;body.platformId=null;
  if(body.vy>=0){
    const candidates=platforms.filter(p=>body.x+body.w/2>p.x&&body.x-body.w/2<p.x+p.w&&previous<=p.y+.5&&body.y>=p.y).sort((a,b)=>a.y-b.y);
    if(candidates.length){const floor=candidates[0];body.y=floor.y;body.vy=0;body.grounded=true;body.jumps=0;body.platformId=floor.id;}
  }
}
