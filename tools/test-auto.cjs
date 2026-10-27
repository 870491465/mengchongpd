const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const path=require('node:path');
const compiler=process.env.COCOS_TSC||'D:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js';
execFileSync(process.execPath,[compiler,'assets/scripts/RowModel.ts','--target','ES2017','--module','commonjs','--outDir','temp/row-tests','--skipLibCheck'],{stdio:'inherit'});
const {PictureModel,PICTURE,PICTURE_WIDTH:W,PICTURE_HEIGHT:H}=require(path.resolve('temp/row-tests/RowModel.js'));
for(const [cadence,speed] of [[1,1],[2,1],[1,.5]]){
    const p=new PictureModel();p.current.cadence=cadence;p.current.speed=speed;
    const targets=new Set();let done=0,rows=0,steps=0,previous=p.current;
    p.onEvent=name=>{
        if(name.startsWith('autoLoad:'))assert.equal(p.current.held,false);
        if(name==='shot'){
            const s=p.current.shots[p.current.shots.length-1],key=p.rowIndex*W+s.target;
            assert.ok(!targets.has(key));targets.add(key);assert.equal(s.color,PICTURE[p.rowIndex][s.target]);
        }
        if(name==='nextRow'){
            assert.equal(previous.seatedCount,W);assert.equal(previous.shots.length,0);assert.equal(previous.active,null);
            assert.ok(p.autoEnabled);previous=p.current;rows++;
        }
        if(name==='pictureComplete'){done++;assert.equal(p.autoEnabled,false);}
    };
    assert.ok(p.setAuto(true));
    while(!p.completed&&steps++<200000){
        p.tick(1/60);const m=p.current;
        assert.ok(m.queue.length<=5);
        assert.equal(m.remaining+m.shotCount,[...m.used].reduce((n,c)=>n+m.counts[c],0));
        assert.equal(new Set(m.shots.map(s=>s.target)).size,m.shots.length);
    }
    assert.ok(p.completed);assert.equal(p.totalSeated,W*H);assert.equal(targets.size,W*H);assert.equal(rows,H-1);assert.equal(done,1);
    assert.equal(p.setAuto(true),false);for(let i=0;i<90;i++)p.tick(1/60);assert.equal(done,1);
    console.log(`PASS one-click full-auto: ${W*H} unique landings, ${H-1} transitions, cadence ${cadence}x / simulation ${speed}x, ${steps} ticks.`);
}
const p=new PictureModel();p.setAuto(true);
let guard=0;while(p.current.shotCount<2&&guard++<500)p.tick(1/60);
assert.equal(p.current.shotCount,2);const shots=p.current.shotCount;
p.setAuto(false);for(let i=0;i<90;i++)p.tick(1/60);
assert.equal(p.current.shotCount,shots);assert.equal(p.current.shots.length,0);assert.equal(p.current.held,false);
assert.ok(p.setAuto(true));for(let i=0;i<30;i++)p.tick(1/60);assert.ok(p.current.shotCount>shots);
p.current.suspend(true);p.tick(1/60);assert.equal(p.autoEnabled,false);assert.equal(p.setAuto(true),false);
p.current.suspend(false);const count=p.current.shotCount;for(let i=0;i<30;i++)p.tick(1/60);assert.equal(p.current.shotCount,count);
p.setAuto(true);p.resetRow();assert.equal(p.autoEnabled,false);assert.equal(p.current.shots.length,0);assert.equal(p.current.shotCount,0);
p.setAuto(true);p.tick(.1);p.resetPicture();for(let i=0;i<90;i++)p.tick(1/60);assert.equal(p.autoEnabled,false);assert.equal(p.totalSeated,0);
console.log('PASS stop/resume, in-flight completion, background suspension, completed-picture guard and reset cancellation.');
