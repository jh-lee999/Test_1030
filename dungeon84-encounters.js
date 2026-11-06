import {stream,shuffle,random,boundsFor,reachable,nearestFree,scalePoint,ARCHETYPES} from './dungeon84-world.js';
export const ROLE_COST={fan:1,archer:1.3,rusher:1.6,caster:1.7,guard:2};
export const CURVE={hp:[1,1.38,1.85],damage:[0,2,4],budget:[4.8,6.4,8],bossHP:[600,900,1250]};
const cards={pursuit:{name:'쫓고 끊기',roles:['fan','rusher','archer'],hint:'추격자를 먼저 떼어 놓고 빈틈에 공격하세요.'},crossfire:{name:'교차 압박',roles:['archer','archer','fan','caster'],hint:'엄폐를 옮겨 두 원거리 적을 나누세요.'},bastion:{name:'방패 진지',roles:['guard','archer','caster'],hint:'방패의 옆으로 돌아 지원 적부터 정리하세요.'},swarm:{name:'작은 포위망',roles:['fan','fan','fan','rusher'],hint:'한쪽을 먼저 열어 포위를 풀어 보세요.'},ambush:{name:'숨어든 발소리',roles:['rusher','fan','caster'],hint:'매복이 드러난 뒤 이동할 공간을 남겨 두세요.'},siege:{name:'엄폐 공성전',roles:['caster','guard','archer'],hint:'낙하 공격으로 엄폐 뒤에만 머물 수 없어요.'},hazard:{name:'위험한 숲길',roles:['caster','rusher','fan'],hint:'지형 위험은 적에게도 통합니다.'}};
export function encounterFor(seed,r,wave=0){
 const rng=stream(r.layoutKey,'encounter:'+wave),key=wave?ARCHETYPES[(ARCHETYPES.indexOf(r.archetype)+wave)%ARCHETYPES.length]:r.archetype,card=cards[key]||cards.pursuit,early=r.level===0&&r.depth<=2,budget=early?3.3:CURVE.budget[r.level]+Math.min(1.4,r.depth*.13)+(r.route==='wild'?.8:r.route==='eclipse'?1.2:0)+(wave?.45:0),roles=[],ais=[];let threat=0;
 const bag=shuffle(rng,early?['fan','archer','rusher']:card.roles);for(let i=0;i<30&&roles.length<8;i++){const role=bag[i%bag.length];if(threat+ROLE_COST[role]>budget)continue;roles.push(role);threat+=ROLE_COST[role];const advanced=!early&&r.depth>=3;ais.push(!advanced?'normal':role==='archer'?(key==='crossfire'?'turret':random(rng)<.5?'orbit':'normal'):role==='caster'?(r.branch==='echo'?'summoner':random(rng)<.5?'blink':'normal'):role==='fan'&&key==='ambush'?'burrow':'normal');}
 // Optional second challenge wave is a real source-hero guardian, not a reskin
 // of another ordinary mob. It never blocks the mandatory route or grants a boss artifact.
 const guardian=r.type==='challenge'&&wave===2&&(r.level>0||r.depth>=4)?shuffle(rng,['velvet','erpin'])[0]:null;
 if(guardian){roles.splice(0,roles.length,guardian);ais.splice(0,ais.length,'normal');threat=budget;}
 const a=boundsFor(r),slots=roles.map((_,i)=>{const u=(i%3+1)/4,v=(Math.floor(i/3)+1)/(Math.ceil(roles.length/3)+1);return {x:a.left+u*(a.right-a.left),y:a.top+v*(a.bottom-a.top)};});
 return {id:key+':'+r.variant+':'+wave,name:guardian?'아공간 수호자':card.name,hint:guardian?'선택한 도전의 마지막 수호자. 모션의 준비와 빈틈을 노리세요.':card.hint,budget,threat,roles,ais,slots,guardian,waves:r.type==='combat'&&r.shape!=='normal'&&r.depth>3?2:1};
}
export function safeFormation(r,plan,entry){
 const a=boundsFor(r),used=[],spots=[];for(let y=a.top+65;y<a.bottom-45;y+=40)for(let x=a.left+65;x<a.right-45;x+=40)if(reachable(r,{x,y},32)&&Math.hypot(x-entry.x,y-entry.y)>210)spots.push({x,y});
 return plan.roles.map((role,i)=>{const goal=plan.slots[i],candidates=spots.filter(p=>used.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>65)),point=candidates.sort((a,b)=>Math.hypot(a.x-goal.x,a.y-goal.y)-Math.hypot(b.x-goal.x,b.y-goal.y))[0]||nearestFree(r,goal,32);used.push(point);return {...point,role,ai:plan.ais[i]};});
}
export const clampPoint=p=>({x:Math.max(185,Math.min(1095,p.x)),y:Math.max(260,Math.min(625,p.y))});
