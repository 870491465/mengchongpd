const assert=require('node:assert/strict');
const fs=require('node:fs');
const {runtime,displayList,press}=require('./cocos-ui-harness.cjs');
const {p,model,view}=runtime();let frames=0;
function frame(dt=1/60){p.update(dt);frames++;
    for(const item of p.visuals.values())if(item.node.active){
        const size=item.node.components.find(c=>c.width!==undefined);
        assert.ok(size.width>0&&size.width<=864&&size.height>0&&size.height<=1536);
        assert.ok(item.sprite.spriteFrame);assert.ok(item.sprite.color.a>=0&&item.sprite.color.a<=255);
    }
}
frame();assert.deepEqual(view.resolution,[864,1536]);
assert.equal(p.labels.get('title').string,'小猫的花园');
assert.equal(p.buttons.get('speed').x,p.muzzle.x);
assert.equal(p.buttons.get('speed').y,p.muzzle.y+24);
assert.equal(p.visuals.get('speedBase').node.parent,p.layers.get('Feedback').node);
assert.ok(p.node.children.indexOf(p.layers.get('Feedback').node)>p.node.children.indexOf(p.layers.get('GunRoot').node));
assert.ok(p.buttons.get('speed').x+p.buttons.get('speed').w/2<p.buttons.get('fire').x-p.buttons.get('fire').w/2);
assert.equal(p.buttons.size,model.PALETTE.length+31);
assert.equal(p.assetErrors.length,0);
assert.equal(model.PALETTE.length,20);
for(const c of model.PALETTE){const sprite=p.visuals.get('palette'+c.id);const u=sprite.node.components.find(c=>c.width!==undefined);assert.ok(u.width>37&&u.width<38&&u.height>37&&u.height<38);assert.equal(p.buttons.get('color'+c.id).h,84);}
assert.equal(new Set(model.PALETTE.map(c=>p.buttons.get('color'+c.id).y)).size,1);
function rawColorTap(id){p.buttons.get('color'+id).node.events.get('start')({getID:()=>9,propagationStopped:false});}
for(const c of model.PALETTE){
    assert.equal(p.buttons.get('color'+c.id).node.active,p.model.counts[c.id]>0);
    assert.equal(p.visuals.get('palette'+c.id).sprite.grayscale,!p.model.counts[c.id]);
    assert.ok(p.visuals.get('palette'+c.id).node.active);
}
const colorButtons=model.PALETTE.map(c=>p.buttons.get('color'+c.id));
assert.ok(Math.abs(Math.min(...colorButtons.map(b=>b.x-b.w/2))-20)<1e-6);
assert.ok(Math.abs(Math.max(...colorButtons.map(b=>b.x+b.w/2))-844)<1e-6);
// Use a full-color test row to check used/held-state disable behavior separately.
p.picture.current=new model.RowModel(model.ROW);p.picture.bind();frame();
press(p,'color0');rawColorTap(0);assert.equal(p.model.queue.length,1);
frame();assert.ok(!p.buttons.get('color0').node.active);assert.equal(p.visuals.get('palette0').sprite.grayscale,true);
const gray=p.visuals.get('palette0').sprite.color;assert.equal(gray.r,gray.g);assert.equal(gray.g,gray.b);
press(p,'fire');rawColorTap(1);assert.equal(p.model.queue.length,1);frame();
for(const c of model.PALETTE)assert.ok(!p.buttons.get('color'+c.id).node.active);
p.releaseHold();frame();assert.ok(p.buttons.get('color1').node.active);assert.equal(p.visuals.get('palette1').sprite.grayscale,false);
assert.ok(!p.buttons.get('color0').node.active);
p.picture.current=new model.RowModel(Array(50).fill(0));p.picture.bind();frame();
for(const c of model.PALETTE.map(c=>c.id).slice(1)){assert.ok(!p.buttons.get('color'+c).node.active);assert.equal(p.visuals.get('palette'+c).sprite.grayscale,true);}
rawColorTap(1);assert.equal(p.model.queue.length,0);
p.picture.resetPicture();p.resetVisuals();frame();
const body=p.visuals.get('gunBody').node;const original={...body.position};
for(const row of [model.PICTURE_HEIGHT-1,48,32,0]){
    p.picture.resetPicture();p.picture.rowIndex=row;p.picture.current=new model.RowModel(model.PICTURE[row]);p.picture.bind();
    frame();
    const m=p.model;let guard=0;
    while(m.completedAt<0&&guard++<1600){
        if(m.held&&!m.remaining){p.releaseHold();frame();}
        if(!m.held&&m.completedAt<0){
            for(const color of model.PALETTE)if(m.canLoad(color.id))press(p,'color'+color.id);
            if(m.remaining)press(p,'fire');
        }
        frame();assert.deepEqual(body.position,original);
    }
    assert.equal(m.seatedCount,model.PICTURE_WIDTH);assert.equal(m.shots.length,0);assert.equal(m.active,null);
    assert.equal(m.remaining,0);
    if(row===model.PICTURE_HEIGHT-1){
        for(let i=0;i<60&&p.model===m;i++)frame();
        assert.notEqual(p.model,m);assert.equal(p.model.used.size,0);
        for(const c of model.PALETTE){
            assert.equal(p.buttons.get('color'+c.id).node.active,p.model.counts[c.id]>0);
            assert.equal(p.visuals.get('palette'+c.id).sprite.grayscale,!p.model.counts[c.id]);
            assert.ok(p.visuals.get('palette'+c.id).node.active);
        }
    }
    p.picture.resetRow();p.resetVisuals();frame();assert.equal(p.model.seatedCount,0);
}
press(p,'speed');frame();assert.ok(!p.buttons.get('fire').node.active);
for(let i=0;i<3;i++)assert.equal(p.buttons.get('speed'+i).x,p.muzzle.x);
press(p,'speed2');frame();assert.equal(p.model.cadence,2);
press(p,'settings');frame();assert.ok(!p.buttons.get('fire').node.active);assert.ok(p.buttons.get('plusrate').node.active);
press(p,'resetPicture');frame();assert.equal(p.picture.totalSeated,0);assert.equal(p.model.cadence,2);
assert.ok(p.layers.get('GunRoot').node.children.indexOf(p.muzzle.node)<p.layers.get('GunRoot').node.children.indexOf(body));
press(p,'auto');frame();assert.ok(p.picture.autoEnabled);assert.ok(!p.buttons.get('fire').node.active);
assert.equal(p.labels.get('auto').string,'停止自动');
let autoGuard=0;
while((p.picture.rowIndex===model.PICTURE_HEIGHT-1||p.model.shotCount<2)&&autoGuard++<1400)frame();
assert.ok(p.picture.rowIndex<model.PICTURE_HEIGHT-1);assert.ok(p.model.shotCount>=2);
press(p,'auto');frame();assert.equal(p.picture.autoEnabled,false);const stopped=p.model.shotCount;
for(let i=0;i<60;i++)frame();assert.equal(p.model.shotCount,stopped);assert.equal(p.model.shots.length,0);
press(p,'auto');frame();press(p,'speed');frame();assert.equal(p.picture.autoEnabled,false);
press(p,'speed1');frame();press(p,'auto');frame();p.hide();frame();assert.equal(p.picture.autoEnabled,false);
p.show();frame();assert.equal(p.model.held,false);p.picture.resetPicture();p.resetVisuals();frame();
// Capture the production scene tree at the reference's 40% state (not a live GPU screenshot).
p.model.cadence=1;
p.picture.finished=model.PICTURE.map((_,i)=>i>=30);p.picture.rowIndex=29;p.picture.current=new model.RowModel(model.PICTURE[29]);p.picture.bind();
for(const c of [0,1,2])if(p.model.counts[c])p.model.load(c);
for(let i=0;i<60;i++)frame();
fs.mkdirSync('temp/v3-ui',{recursive:true});
fs.writeFileSync('temp/v3-ui/reference-state.json',JSON.stringify({width:864,height:1536,items:displayList(p.node)},null,2));
p.picture.resetPicture();p.resetVisuals();frame();
fs.writeFileSync('temp/v3-ui/start-state.json',JSON.stringify({width:864,height:1536,items:displayList(p.node)},null,2));
p.picture.current=new model.RowModel(Array.from({length:50},(_,i)=>i%20));p.picture.bind();frame();
fs.writeFileSync('temp/v3-ui/palette-all-20.json',JSON.stringify({width:864,height:1536,items:displayList(p.node)},null,2));
press(p,'settings');frame();
fs.writeFileSync('temp/v3-ui/settings-state.json',JSON.stringify({width:864,height:1536,items:displayList(p.node)},null,2));
console.log(`PASS ${frames} V3 UI frames: original SpriteFrames load, fixed gun body, four rows, clipping, fire/speed/settings/reset inputs, 864x1536 scene captures.`);
console.log('PASS gray disabled colors, no same-frame duplicate load, held-fire lock, absent-color lock and per-row color restoration.');
