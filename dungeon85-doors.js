import {doorsFor,viewFor,boundsFor,links} from './dungeon84-world.js';
export function doorState(g,l){const room=g.rooms[g.room],to=g.rooms[l.to],secret=['secret','supersecret','archive'].includes(to.type)&&!to.unlocked,locked=to.type==='treasure'&&!to.unlocked;return {secret,locked,open:room.cleared&&!secret&&!locked,index:secret?7:!room.cleared?1:locked?2:0};}
export function openingFor(room,dir){const d=doorsFor(room)[dir],v=viewFor(room),a=boundsFor(room),half=48;return dir==='n'?{x:d.x-half,y:0,w:half*2,h:a.top+16}:dir==='s'?{x:d.x-half,y:a.bottom-16,w:half*2,h:v.height-a.bottom+16}:dir==='w'?{x:0,y:d.y-half,w:a.left+16,h:half*2}:{x:a.right-16,y:d.y-half,w:v.width-a.right+16,h:half*2};}
export function drawOpenings(c,g,image){
 const r=g.rooms[g.room],v=viewFor(r);for(const l of links(g)){if(!doorState(g,l).open)continue;const a=openingFor(r,l.dir);c.save();c.beginPath();c.rect(a.x,a.y,a.w,a.h);c.clip();
  // Extend the existing floor THROUGH the baked wall. Collision apron and
  // passage center use the very same door coordinates, including large rooms.
  if(image?.naturalWidth){const sw=Math.round(image.naturalWidth*.1),sh=Math.round(image.naturalHeight*.1),sx=Math.round(image.naturalWidth*.45),sy=Math.round(image.naturalHeight*.5),tile=96;for(let y=a.y;y<a.y+a.h;y+=tile)for(let x=a.x;x<a.x+a.w;x+=tile)c.drawImage(image,sx,sy,sw,sh,x,y,tile,tile);}else{c.fillStyle=g.floorIndex===1?'#8b7050':g.floorIndex===2?'#55516c':'#63794e';c.fillRect(a.x,a.y,a.w,a.h);}
  const vertical=l.dir==='n'||l.dir==='s',shade=c.createLinearGradient(a.x,a.y,vertical?a.x:a.x+a.w,vertical?a.y+a.h:a.y),outsideFirst=l.dir==='n'||l.dir==='w';shade.addColorStop(0,outsideFirst?'#102628ee':'#10262800');shade.addColorStop(1,outsideFirst?'#10262800':'#102628ee');c.fillStyle=shade;c.fillRect(a.x,a.y,a.w,a.h);
  c.fillStyle='#1026284d';if(vertical){c.fillRect(a.x,a.y,7,a.h);c.fillRect(a.x+a.w-7,a.y,7,a.h);}else{c.fillRect(a.x,a.y,a.w,7);c.fillRect(a.x,a.y+a.h-7,a.w,7);}c.restore();
 }
}
