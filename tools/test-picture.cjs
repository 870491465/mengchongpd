const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const compiler = process.env.COCOS_TSC || 'D:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js';
execFileSync(process.execPath, [compiler, 'assets/scripts/RowModel.ts', '--target', 'ES2017', '--module', 'commonjs', '--outDir', 'temp/row-tests', '--skipLibCheck'], { stdio: 'inherit' });
const { PictureModel, PICTURE, PALETTE, PICTURE_WIDTH: W, PICTURE_HEIGHT: H } = require(path.resolve('temp/row-tests/RowModel.js'));
assert.equal(W,80);assert.equal(H,80);assert.equal(PICTURE.length,H);PICTURE.forEach(r=>assert.equal(r.length,W));
const {PICTURE_CODES,PICTURE_NAME}=require(path.resolve('temp/row-tests/PictureData.js'));
assert.equal(PICTURE_NAME,'小猫的花园');
PICTURE.forEach((row,y)=>{
    assert.equal(row.map(c=>c.toString(36)).join(''),PICTURE_CODES[y]);
    row.forEach(c=>assert.ok(c>=0&&c<20));
});
assert.ok(PICTURE.some(row=>new Set(row).size<20));
assert.equal(PALETTE.length,20);
console.log('PASS 20-color chart decoding and unused-color rows.');
for(const speed of [1,.5]) {
    const p=new PictureModel();p.current.speed=speed;const bound=new Set();let oldTotal=0,rows=0,steps=0,events=0;
    p.onEvent=name=>{
        if(name==='shot'){
            const shot=p.current.shots[p.current.shots.length-1],key=p.rowIndex*W+shot.target;
            assert.ok(!bound.has(key));bound.add(key);assert.equal(PICTURE[p.rowIndex][shot.target],shot.color);
        }
        if(name==='nextRow'){rows++;assert.equal(p.current.held,false);assert.equal(p.current.remaining,0);assert.equal(p.current.used.size,0);}
        if(name==='pictureComplete')events++;
    };
    while(!p.completed && steps++<200000){
        const m=p.current;
        if(m.held && !m.remaining)m.hold(false);
        if(!m.held && m.completedAt<0){
            for(const c of [...PALETTE].reverse()){const allowed=m.canLoad(c.id);assert.equal(m.load(c.id),allowed);}
            if(m.remaining)m.hold(true);
        }
        p.tick(1/60);
        const live=p.current;
        assert.equal(live.remaining+live.shotCount,[...live.used].reduce((s,c)=>s+live.counts[c],0));
        assert.equal(live.shots.length,live.targets.filter(t=>t==='reserved').length);
        for(const mag of [...live.queue,...(live.active?[live.active]:[])]) assert.equal(mag.inside+(mag===live.active&&live.chamber!==null?1:0),mag.remaining);
        assert.ok(p.totalSeated>=oldTotal);oldTotal=p.totalSeated;
    }
    assert.ok(p.completed);assert.equal(p.totalSeated,W*H);assert.equal(p.completedRows,H);
    assert.equal(rows,H-1);assert.equal(events,1);assert.equal(bound.size,W*H);
    for(let i=0;i<100;i++)p.tick(1/60);assert.equal(events,1);
    p.resetRow();assert.equal(p.completedRows,H-1);assert.equal(p.totalSeated,W*(H-1));assert.equal(p.current.shots.length,0);
    p.resetPicture();assert.equal(p.totalSeated,0);assert.equal(p.completedRows,0);assert.equal(p.rowIndex,H-1);
    console.log(`PASS full ${W}x${H} at ${speed}x: ${W*H} unique landings, ${H-1} safe transitions, row/picture reset, ${steps} ticks.`);
}
const p=new PictureModel();
for(const c of PALETTE) p.current.load(c.id);p.current.hold(true);
while(p.current.shotCount<2)p.tick(1/60);
p.current.hold(false);const n=p.current.shotCount;
for(let i=0;i<90;i++)p.tick(1/60);assert.equal(p.current.shotCount,n);
p.current.suspend(true);const time=p.current.time;for(let i=0;i<90;i++)p.tick(1/60);assert.equal(p.current.time,time);
p.resetPicture();p.current.suspend(false);for(let i=0;i<90;i++)p.tick(1/60);assert.equal(p.totalSeated,0);
console.log('PASS release/background/reset never fires or lands an old-row bean.');
