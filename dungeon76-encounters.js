import {hash,random,FLOOR,reachable,nearestFree} from './dungeon74-world.js';
export const ROLE_COST={fan:1,archer:1.3,rusher:1.6,caster:1.7,guard:2};
const box=(x,y,w=65,h=54)=>({x,y,w,h});
const points={front:[390,470],rear:[900,330],flank:[880,570],center:[640,330],left:[340,330],right:[960,470],low:[640,575],far:[890,430]};
// Cover and formation are one design unit, not independent obstacle/monster rolls.
export const TEMPLATES=[
 {id:'lane',name:'좁은 틈의 회랑',hint:'전위가 길을 막아요. 틈을 옮겨 사격 각도를 만드세요.',cover:[box(400,340,65,90),box(400,515,65,75),box(800,340,65,90),box(800,515,65,75)],roles:['guard','archer','fan'],slots:['front','rear','flank','center','low','left']},
 {id:'crossfire',name:'엇갈린 사격선',hint:'양쪽 사격선을 동시에 상대하지 말고 엄폐물을 나눠 쓰세요.',cover:[box(470,350,95,54),box(700,495,95,54),box(310,535),box(930,320)],roles:['archer','rusher','fan'],slots:['left','flank','center','rear','low','front']},
 {id:'fortress',name:'책장 뒤의 전위',hint:'방패를 정면으로 두드리기보다 지원 몹의 옆을 노려요.',cover:[box(720,300,65,100),box(720,495,65,100),box(420,390,70,90)],roles:['guard','archer','caster'],slots:['far','rear','flank','left','center','low']},
 {id:'pincer',name:'좌우의 협공',hint:'가운데서 포위되지 않도록 한쪽을 먼저 정리하세요.',cover:[box(550,325,100,65),box(640,520,100,65),box(280,520),box(950,300)],roles:['rusher','archer','fan'],slots:['left','flank','rear','front','center','low']},
 {id:'islands',name:'작은 엄폐섬',hint:'돌진 예고를 보고 다른 엄폐섬으로 이동하세요.',cover:[box(400,320),box(720,335),box(520,520),box(910,510)],roles:['rusher','fan','caster'],slots:['front','rear','flank','center','right','low']},
 {id:'breach',name:'허물어진 진지',hint:'나무상자를 부수면 적의 사격선도 함께 열려요.',cover:[box(400,350),box(470,350),box(790,490),box(860,490),box(660,300)],roles:['guard','archer','fan'],slots:['rear','far','front','flank','center','low'],crates:[1,2,3]},
 {id:'crescent',name:'반달 우회로',hint:'외곽을 돌아 지원 몹을 떼어 놓을 수 있어요.',cover:[box(470,310,70,90),box(470,485,70,100),box(640,350),box(640,510)],roles:['caster','guard','fan'],slots:['rear','front','flank','far','left','low']},
 {id:'switchback',name:'엇갈린 갈림길',hint:'지형 양쪽을 오가며 돌진과 원거리 공격을 분리하세요.',cover:[box(350,315,100,54),box(530,495,100,54),box(750,315,100,54),box(900,510)],roles:['archer','rusher','fan'],slots:['rear','front','flank','center','right','low']},
 {id:'courtyard',name:'열린 안뜰',hint:'열린 중앙에서는 움직임이 중요해요. 외곽 엄폐를 활용하세요.',cover:[box(290,300),box(940,300),box(290,545),box(940,545)],roles:['fan','rusher','archer'],slots:['center','rear','flank','front','left','low']},
 {id:'gates',name:'두 개의 관문',hint:'관문 하나를 잡아 적이 한꺼번에 붙는 것을 막으세요.',cover:[box(450,310,60,105),box(450,500,60,105),box(780,310,60,105),box(780,500,60,105)],roles:['guard','caster','fan'],slots:['far','rear','front','flank','center','low']},
 {id:'diagonal',name:'대각선 사선',hint:'가까운 엄폐물을 옮겨 다니며 사격선을 끊으세요.',cover:[box(320,305),box(490,375),box(735,485),box(910,555)],roles:['archer','caster','fan'],slots:['rear','flank','front','center','right','low']},
 {id:'pressure',name:'돌진의 빈틈',hint:'첫 돌진을 엄폐물로 끊은 뒤 회복 중인 적을 노려요.',cover:[box(420,365,90,65),box(765,490,90,65),box(880,310),box(340,535)],roles:['rusher','guard','archer'],slots:['front','far','rear','flank','center','low']},
];
export function encounterFor(seed,room,wave=0){
 const rng={rng:hash(seed+':encounter76:'+room.route+':'+room.level+':'+room.id)},t=TEMPLATES[Math.floor(random(rng)*TEMPLATES.length)],flipX=random(rng)<.5,flipY=random(rng)<.5;
 const transform=p=>({x:flipX?1280-p.x:p.x,y:flipY?890-p.y:p.y});
 const cover=t.cover.map((o,i)=>({...o,x:flipX?1280-o.x-o.w:o.x,y:flipY?890-o.y-o.h:o.y,kind:t.crates?.includes(i)?'pot':room.level===1?'shelf':room.level===2?'crystal':i%2?'log':'rock',hp:1}));
 const budget=5.4+room.level*1.3+Math.min(1.8,room.depth*.2)+(room.route==='wild'?1.3:0)+wave*.6+(room.type==='rush'?.7:0),roles=[...t.roles];let threat=roles.reduce((n,id)=>n+ROLE_COST[id],0),i=0;
 while(roles.length<8&&i++<20){const role=t.roles[i%t.roles.length],cost=ROLE_COST[role];if(threat+cost<=budget){roles.push(role);threat+=cost;}}
 return {id:t.id+':'+Number(flipX)+Number(flipY),name:t.name,hint:t.hint,budget,threat,roles,cover,slots:t.slots.map(id=>transform({x:points[id][0],y:points[id][1]}))};
}
export function safeFormation(room,plan,entry){
 const used=[],out=[];
 for(let i=0;i<plan.roles.length;i++){
  const goal=plan.slots[i%plan.slots.length],spots=[];
  for(let y=285;y<=605;y+=40)for(let x=250;x<=1050;x+=40)if(reachable(room,{x,y},32)&&Math.hypot(x-entry.x,y-entry.y)>180&&used.every(p=>Math.hypot(x-p.x,y-p.y)>55))spots.push({x,y});
  const p=spots.sort((a,b)=>Math.hypot(a.x-goal.x,a.y-goal.y)-Math.hypot(b.x-goal.x,b.y-goal.y))[0]||nearestFree(room,goal,32);
  used.push(p);out.push({...p,role:plan.roles[i]});
 }
 return out;
}
export const clampPoint=p=>({x:Math.max(FLOOR.left+55,Math.min(FLOOR.right-55,p.x)),y:Math.max(FLOOR.top+55,Math.min(FLOOR.bottom-55,p.y))});
