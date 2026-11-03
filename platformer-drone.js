import {approach} from './platformer-physics.js?v=38';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const DRONE={wakeRange:780,loseRange:1150,minRange:180,maxRange:340,windup:.7,recovery:.45};

export function updateDrone(g,e,dt,shoot){
  const p=g.player,dx=p.x-e.x;
  if(g.room.cleared)return;
  // A distant drone doesn't cross the entire room before the player sees it.
  if(!e.droneActive){
    e.mode='idle';e.vx=e.vy=0;
    if(Math.abs(dx)>DRONE.wakeRange||Math.abs(p.y-e.y)>300)return;
    e.droneActive=true;e.droneState='approach';e.hoverY=e.home.y-34;e.cooldown=Math.max(e.cooldown,.45);
  }
  if(e.mode==='attack'){
    // Muzzle and aim stay fixed for the full warning and burst.
    e.vx=e.vy=0;const before=e.timer;e.timer+=dt;
    if(before<DRONE.windup&&e.timer>=DRONE.windup){
      for(const spread of [-.12,.12])shoot(g,e,e.aimAngle+spread,340);
      e.droneState='recover';
    }
    if(e.timer>=DRONE.windup+DRONE.recovery){e.mode='idle';e.timer=0;e.cooldown=1.1;e.droneState='reposition';}
    return;
  }
  e.lostTime=Math.abs(dx)>DRONE.loseRange?(e.lostTime||0)+dt:0;
  if(e.lostTime>3){e.droneActive=false;e.droneState='idle';e.vx=e.vy=0;e.mode='idle';return;}
  if(Math.abs(dx)>40)e.facing=Math.sign(dx);
  // Grounded height updates the flight lane; jump/fall motion does not drag it.
  if(p.grounded)e.hoverY=clamp(p.y-34,220,614);
  const distance=Math.abs(dx),spacing=DRONE.maxRange+(e.id%3)*16;
  let velocity=distance>spacing?Math.sign(dx)*190:distance<DRONE.minRange?-e.facing*130:0;
  if((e.x<=30&&velocity<0)||(e.x>=g.room.width-30&&velocity>0))velocity=0;
  e.vx=approach(e.vx||0,velocity,650*dt);
  const lift=clamp((e.hoverY-e.y)*3,-100,100);e.vy=approach(e.vy||0,lift,400*dt);
  e.x=clamp(e.x+e.vx*dt,30,g.room.width-30);e.y=clamp(e.y+e.vy*dt,200,634);
  e.mode=Math.abs(e.vx)>12||Math.abs(e.vy)>12?'walk':'idle';e.droneState=e.mode==='walk'?'approach':'hold';
  const aimY=p.y-40,muzzleY=e.y-e.h*.55;
  if(distance<480&&Math.abs(aimY-muzzleY)<160&&e.cooldown<=0&&Math.abs(e.vx)<35&&Math.abs(e.vy)<25){
    e.mode='attack';e.droneState='aim';e.timer=0;e.attackId++;e.vx=e.vy=0;
    e.aimTarget={x:p.x,y:aimY};e.aimAngle=Math.atan2(aimY-muzzleY,p.x-e.x);
  }
}
