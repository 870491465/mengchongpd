const assert=require('node:assert/strict');
const {runtime,press}=require('./cocos-ui-harness.cjs');
// Real resources.load callbacks are asynchronous. Filled setters must not touch
// UVs until their frame exists (Creator 3.8.8's actual startup failure).
const r=runtime(false,true),p=r.p;
assert.ok(p.initialized);assert.ok(p.home.visible);assert.ok(p.success);
assert.equal(p.completedBoard.spriteFrame,undefined);
for(let i=0;i<5;i++)assert.doesNotThrow(()=>p.update(1/60));
// Opening the game before texture IO finishes must also be safe.
const n=p.home.controls.get('start'),e={getID:()=>1,getLocation:()=>n.worldPosition,windowId:0};
n.events.get('start')(e);n.events.get('end')(e);
assert.ok(!p.home.visible);assert.doesNotThrow(()=>p.update(1/60));
assert.doesNotThrow(()=>r.flushResources());
assert.ok(p.completedBoard.spriteFrame);assert.equal(p.completedBoard.fillStart,0);assert.equal(p.completedBoard.fillRange,0);
press(p,'auto');for(let i=0;i<300;i++)p.update(1/60);assert.ok(p.model.shotCount>0);
// An aborted onLoad (or engine lifecycle boundary) must not generate a visible
// error every update while hiding the original startup error.
const fresh=new r.ui.RowPrototype();assert.doesNotThrow(()=>fresh.update(1/60));
fresh.initialized=false;assert.doesNotThrow(()=>fresh.showSuccess());
console.log('PASS deferred startup: home/game safe before assets, filled UV setup after SpriteFrame, auto firing after load, pre-initialization update guarded.');
