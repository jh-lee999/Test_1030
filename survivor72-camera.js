// One pure camera definition for BOTH rendering and screen-bounded physics.
export const DEFAULT_VIEWPORT={width:1120,height:630};
export function viewportSize(value){return value&&['width','height'].every(k=>Number.isFinite(value[k])&&value[k]>0&&value[k]<=16384)?{width:value.width,height:value.height}:{...DEFAULT_VIEWPORT};}
export function cameraFor(player,viewport=DEFAULT_VIEWPORT){
 const {width,height}=viewportSize(viewport),baseWidth=width<650?650:1120;
 const zoom=Math.min(width/baseWidth,height/405),viewWidth=width/zoom,viewHeight=height/zoom;
 const left=player.x-viewWidth/2,top=player.y-viewHeight*.6;
 return {width,height,zoom,viewWidth,viewHeight,left,top,right:left+viewWidth,bottom:top+viewHeight};
}
export function arenaFor(player,viewport,radius){
 const c=cameraFor(player,viewport),inset=radius+6+14/c.zoom;
 return {left:c.left+inset,top:c.top+inset,right:c.right-inset,bottom:c.bottom-inset};
}
