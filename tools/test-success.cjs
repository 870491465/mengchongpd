const assert=require('node:assert/strict');
const fs=require('node:fs');
const {runtime,displayList}=require('./cocos-ui-harness.cjs');
async function main(){
 const {p,model,cc}=runtime();p.update(0);
 assert.ok(!p.success.visible);assert.equal(cc.sys.localStorage.writes,0);
 p.showSuccess();assert.ok(!p.success.visible,'unfinished game must not settle or save');
 let complete=0;const event=p.picture.onEvent;
 p.picture.onEvent=name=>{if(name==='pictureComplete')complete++;event(name);};
 p.picture.setAuto(true);let guard=0;
 while(!p.picture.completed&&guard++<100000)p.picture.tick(1/60);
 assert.equal(p.picture.totalSeated,6400);assert.equal(complete,1);assert.ok(p.success.visible);
 assert.equal(p.model.shots.length,0);assert.equal(p.model.active,null);
 assert.ok([...p.layers.values()].every(l=>!l.node.active));
 const s=p.success;const items=displayList(p.node),beans=items.filter(i=>i.name==='ResultPicture');
 assert.equal(beans.length,1);assert.equal(beans[0].w,688);assert.equal(beans[0].h,688);
 assert.ok(beans[0].file.replace(/\\/g,'/').endsWith('levels/cat-garden/board.png'));
 assert.equal(s.artwork.children.length,1);
 assert.ok(items.some(i=>i.text==='作品已收藏'));assert.ok(!items.some(i=>i.text==='发射'));
 assert.ok(!items.some(i=>i.file?.includes('artwork_example')));
 assert.equal(cc.sys.localStorage.writes,1);
 s.show();p.showSuccess();assert.equal(cc.sys.localStorage.writes,1);
 const count=s.artwork.children.length;s.show();assert.equal(s.artwork.children.length,count);
 fs.mkdirSync('temp/success-ui',{recursive:true});
 fs.writeFileSync('temp/success-ui/success.json',JSON.stringify({width:864,height:1536,items:displayList(p.node)}));
 const time=p.model.time;p.update(1);assert.equal(p.model.time,time);
 function touch(id,cancel=false){const n=s.controls.get(id),e={getID:()=>1,getLocation:()=>n.worldPosition,windowId:0};n.events.get('start')(e);assert.equal(n.scale.x,.96);n.events.get(cancel?'cancel':'end')(e);assert.equal(n.scale.x,1);}
 touch('home',true);assert.ok(s.visible);
 const warn=console.warn;console.warn=()=>{};cc.sys.localStorage.fail=true;s.show();console.warn=warn;
 assert.equal(s.savedIcon.active,false);assert.ok(s.controls.get('retry').active);
 cc.sys.localStorage.fail=false;touch('retry');assert.ok(s.savedIcon.active);assert.equal(cc.sys.localStorage.writes,1);
 await s.share();assert.ok(s.message.string.includes('暂未接入'));
 // Browser API contracts: user-triggered file sharing and PNG-export fallback.
 cc.sys.isBrowser=true;let shares=0,downloads=0,draws=0;
 global.document={createElement(kind){return kind==='canvas'?{getContext:()=>({fillRect(){draws++;}}),toDataURL:()=> 'data:image/png;base64,AA=='}:{click(){downloads++;},remove(){}};},body:{appendChild(){}}};
 Object.defineProperty(global,'navigator',{configurable:true,value:{canShare:()=>true,async share(data){shares++;assert.equal(data.files[0].name,'小猫的花园.png');}}});
 await s.share();assert.equal(shares,1);assert.equal(downloads,0);assert.equal(draws,6400);
 navigator.canShare=()=>false;await s.share();assert.equal(downloads,1);assert.equal(draws,12800);
 navigator.canShare=()=>true;navigator.share=async()=>{const e=new Error();e.name='AbortError';throw e;};
 await s.share();assert.equal(s.message.string,'已取消分享');
 touch('continue');assert.ok(p.home.visible);assert.ok(!s.visible);assert.equal(p.picture.totalSeated,6400);
 const n=p.home.controls.get('start'),e={getID:()=>7,getLocation:()=>n.worldPosition,windowId:0};n.events.get('start')(e);n.events.get('end')(e);p.update(0);
 assert.equal(p.picture.totalSeated,0);assert.ok(!p.picture.completed);assert.equal(p.picture.rowIndex,79);
 // Returning to the home icon also retains the saved record.
 s.show();touch('home');assert.ok(p.home.visible);assert.equal(cc.sys.localStorage.writes,1);
 console.log('PASS success: real 6400-bead completion, exact artwork, one save, failure/retry, press/cancel, continue/home/restart, share/export/cancel API contracts.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
