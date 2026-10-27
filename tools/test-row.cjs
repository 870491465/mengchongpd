const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const compiler = process.env.COCOS_TSC || 'D:/ProgramData/cocos/editors/Creator/3.8.8/resources/app.asar.unpacked/node_modules/typescript/lib/tsc.js';
execFileSync(process.execPath, [compiler, 'assets/scripts/RowModel.ts', '--target', 'ES2017', '--module', 'commonjs', '--outDir', 'temp/row-tests', '--skipLibCheck'], { stdio: 'inherit' });
const { RowModel, ROW, COUNTS, PALETTE } = require(path.resolve('temp/row-tests/RowModel.js'));
const ALL = PALETTE.filter(c => COUNTS[c.id] > 0).map(c => c.id);
const permutations = xs => xs.length ? xs.flatMap((x, i) => permutations(xs.filter((_, j) => i !== j)).map(rest => [x, ...rest])) : [[]];
let checks = 0;
function invariant(m) {
    const mags = [...m.queue, ...(m.active ? [m.active] : [])];
    for (const mag of mags) assert.equal(mag.inside + (mag === m.active && m.chamber !== null ? 1 : 0), mag.remaining);
    assert.equal(m.shots.length, m.targets.filter(s => s === 'reserved').length);
    assert.equal(new Set(m.shots.map(s => s.target)).size, m.shots.length);
    assert.equal(m.shotCount, m.shots.length + m.seatedCount);
    assert.equal(m.remaining + m.shotCount, [...m.used].reduce((s, c) => s + COUNTS[c], 0));
    assert.ok(m.completedCount <= 1);
    if (m.completedCount) { assert.equal(m.seatedCount, ROW.length); assert.equal(m.active, null); assert.equal(m.shots.length, 0); }
    checks++;
}
function advance(m, seconds, dt = 1 / 120) { for (let i = 0; i < seconds / dt; i++) { m.tick(dt); invariant(m); } }
function until(m, predicate, timeout = 10) { for (let i = 0; i < timeout * 240; i++) { if (predicate()) return; m.tick(1 / 240); invariant(m); } throw Error('Timed out: ' + m.phase); }
let tests = 0;
function test(name, fn) { fn(); tests++; console.log('PASS ' + name); }
test('50 beans (10 each of five colors), all 120 queue orders, left-to-right unique targets and single completion', () => {
    for (const order of permutations(ALL)) {
        const m = new RowModel(), bound = [];
        m.onEvent = name => { if (name === 'shot') bound.push(m.shots[m.shots.length - 1].target); };
        assert.equal(ROW.length, 50); assert.deepEqual(COUNTS.slice(0,5), [10, 10, 10, 10, 10]); assert.equal(COUNTS.slice(5).reduce((a,b)=>a+b,0),0);
        order.forEach(c => assert.ok(m.load(c))); m.hold(true); until(m, () => m.completedCount === 1, 30);
        assert.equal(m.seatedCount, ROW.length); assert.equal(m.remaining, 0); assert.equal(m.ejectCount, ALL.length); assert.equal(m.completedCount, 1);
        order.forEach(c => assert.deepEqual(bound.filter(i => ROW[i] === c), ROW.map((v,i) => v === c ? i : -1).filter(i => i >= 0)));
        advance(m, 3); assert.equal(m.shotCount, ROW.length); assert.equal(m.completedCount, 1);
    }
});
test('release stops new shots; in-flight landing and started feed finish; reloading after release', () => {
    const m = new RowModel(); m.load(0); m.hold(true); until(m, () => m.shotCount === 1);
    m.hold(false); const n = m.shotCount; assert.ok(m.load(1)); advance(m, 1);
    assert.equal(m.shotCount, n); assert.equal(m.seatedCount, 1); assert.equal(m.phase, 'ready');
    m.hold(true); advance(m, 10); assert.equal(m.seatedCount, COUNTS[0] + COUNTS[1]);
});
test('release during automatic swap prepares next clip without firing', () => {
    const m = new RowModel(); m.load(0); m.load(1); m.hold(true);
    until(m, () => m.phase === 'eject'); m.hold(false); advance(m, 1);
    assert.equal(m.shotCount, COUNTS[0]); assert.equal(m.phase, 'ready'); assert.equal(m.chamber, 1); assert.equal(m.remaining, COUNTS[1]);
});
test('one 10-bean blue clip works; last chamber bean survives empty container; empty gun never fires', () => {
    const m = new RowModel(); m.load(2); m.hold(true); until(m, () => m.active?.inside === 0 && m.chamber === 2);
    m.hold(false); advance(m, .3); assert.equal(m.active.remaining, 1); assert.equal(m.chamber, 2);
    m.hold(true); advance(m, 3); assert.equal(m.shotCount, COUNTS[2]); assert.equal(m.ejectCount, 1); assert.equal(m.completedCount, 0);
});
test('rapid duplicate color clicks and firing-time loads are rejected', () => {
    const m = new RowModel(); assert.ok(m.load(0)); for (let i=0;i<50;i++) assert.equal(m.load(0), false);
    assert.equal(m.queue.length, 1); m.hold(true); assert.equal(m.load(1), false); m.hold(false); assert.ok(m.load(1));
});
test('reset clears flights / reservations / old completion at every action phase', () => {
    for (const delay of [.1,.35,.45,.6,1.2,1.5,2]) {
        const m = new RowModel(); ALL.forEach(c => m.load(c)); m.hold(true); advance(m, delay);
        m.reset(); advance(m, 4); assert.equal(m.shotCount, 0); assert.equal(m.seatedCount, 0); assert.equal(m.completedCount, 0);
        [...ALL].reverse().forEach(c => m.load(c)); m.hold(true); until(m, () => m.completedCount === 1, 30);
    }
});
test('background suspends clock, releases hold, resumes preparation without automatic fire', () => {
    const m = new RowModel(); m.load(0); m.hold(true); until(m, () => m.shotCount === 1);
    const at = m.time; m.suspend(true); advance(m, 5); assert.equal(m.time, at); assert.equal(m.held, false);
    m.suspend(false); advance(m, 1); assert.equal(m.shotCount, 1); assert.equal(m.phase, 'ready');
});
test('0.5 speed slows both simulation phases and shot cadence', () => {
    const counts = [];
    for (const speed of [1,.5]) { const m = new RowModel(); m.speed = speed; ALL.forEach(c => m.load(c)); m.hold(true); advance(m, 1.2); counts.push(m.shotCount); assert.ok(Math.abs(m.time - 1.2 * speed) < .01); }
    assert.ok(counts[0] > counts[1]);
});
test('slow feed limits actual rate; no catch-up shots; flight overlaps feed', () => {
    const m = new RowModel(); m.tuning.rate=10; m.tuning.feed=.4; m.load(0); const times=[];
    m.onEvent = e => { if(e==='shot') { times.push(m.time); assert.ok(m.active); } }; m.hold(true);
    until(m, () => m.shotCount === 1); assert.ok(m.shots.length); assert.equal(m.phase, 'feed');
    advance(m, 12); assert.equal(times.length, COUNTS[0]); times.slice(1).forEach((t,i) => assert.ok(t-times[i] >= .4 - 1e-6));
});
test('random rapid hold/load/reset/speed changes preserve conservation and unique reservations', () => {
    let seed=427; const random=()=> ((seed=(seed*1664525+1013904223)>>>0)/4294967296);
    const m=new RowModel(); for(let i=0;i<18000;i++) {
        const r=random(); if(r<.003) m.reset(); else if(r<.03) m.load(Math.floor(random()*ALL.length));
        else if(r<.06) m.hold(random()>.4); else if(r<.065) m.speed=random()>.5?1:.5;
        m.tick(random()*.04); invariant(m);
    }
});
test('full row completes at half speed with the same 50 unique landings', () => {
    const m = new RowModel(); m.speed = .5; ALL.forEach(c => m.load(c)); m.hold(true);
    until(m, () => m.completedCount === 1, 30); assert.equal(m.shotCount, 50); assert.equal(m.seatedCount, 50); assert.equal(m.ejectCount, ALL.length);
});
test('green and cream clips load, chamber, fire and eject on their own', () => {
    for (const color of [3,4]) {
        const m = new RowModel(); assert.ok(m.load(color)); assert.equal(m.load(color), false);
        m.hold(true); advance(m, 4);
        assert.equal(m.seatedCount, 10); assert.equal(m.ejectCount, 1); assert.equal(m.remaining, 0);
        assert.equal(m.completedCount, 0);
    }
});
test('five waiting slots accept five unique clips, then exchange in click order', () => {
    const m = new RowModel(); const order = [4,3,2,1,0]; order.forEach(c => assert.ok(m.load(c)));
    assert.equal(m.queue.length, 5); assert.equal(new Set(m.queue.map(c => c.slot)).size, 5);
    assert.equal(m.remaining, 50); m.hold(true); until(m, () => m.completedCount === 1, 30);
    assert.equal(m.ejectCount, 5);
});
test('0.5/1/2 firing cadence changes only shot/feed timing, with no skipped chambers', () => {
    const durations=[];
    for(const cadence of [.5,1,2]) {
        const m=new RowModel();m.cadence=cadence;ALL.forEach(c=>m.load(c));const times=[];
        m.onEvent=e=>{if(e==='shot') {
            const s=m.shots[m.shots.length-1];times.push(m.time);
            assert.equal(s.flight,.25);assert.equal(s.hit,.15);
        }};
        m.hold(true);until(m,()=>m.completedCount===1,30);
        assert.equal(m.speed,1);assert.equal(m.shotCount,50);
        times.slice(1).forEach((t,i)=>assert.ok(t-times[i]>=1/(6*cadence)-1e-6));durations.push(m.time);
    }
    assert.ok(durations[0]>durations[1]&&durations[1]>durations[2]);
});
test('queue compacts without duplicating inventory when the first clip docks', () => {
    const m=new RowModel();ALL.forEach(c=>m.load(c));until(m,()=>m.phase==='dock');
    assert.deepEqual(m.queue.map(c=>c.slot),[0,1,2,3]);
    assert.deepEqual(m.queue.map(c=>c.slotFrom),[1,2,3,4]);assert.equal(m.remaining,50);
});
test('canLoad rejects absent/used colors, held fire, background and completed row', () => {
    const m=new RowModel(Array(50).fill(0));assert.ok(m.canLoad(0));
    for(const c of PALETTE.map(c=>c.id).slice(1)) {assert.equal(m.canLoad(c),false);assert.equal(m.load(c),false);}
    m.hold(true);assert.equal(m.canLoad(0),false);m.hold(false);
    assert.ok(m.load(0));assert.equal(m.canLoad(0),false);m.reset();assert.ok(m.canLoad(0));
    m.suspend(true);assert.equal(m.canLoad(0),false);m.suspend(false);
    m.completedAt=0;assert.equal(m.canLoad(0),false);
});
test('20 distinct colors finish a 50-bean row across multiple five-slot batches', () => {
    assert.equal(PALETTE.length,20);assert.equal(new Set(PALETTE.map(c=>c.hex)).size,20);
    const m=new RowModel(Array.from({length:50},(_,i)=>i%20));const colors=new Set();
    m.onEvent=e=>{if(e==='shot')colors.add(m.shots[m.shots.length-1].color);};
    let steps=0;
    while(m.completedCount===0&&steps++<6000){
        if(m.held&&m.remaining===0)m.hold(false);
        if(!m.held&&m.completedAt<0){for(const c of PALETTE)if(m.canLoad(c.id))m.load(c.id);if(m.remaining)m.hold(true);}
        m.tick(1/120);
        assert.ok(m.queue.length<=5);assert.equal(m.remaining+m.shotCount,[...m.used].reduce((n,c)=>n+m.counts[c],0));
        assert.equal(new Set(m.shots.map(s=>s.target)).size,m.shots.length);
    }
    assert.equal(m.completedCount,1);assert.equal(m.seatedCount,50);assert.equal(m.ejectCount,20);assert.equal(colors.size,20);
});
console.log(`${tests} scenarios passed; ${checks} invariant checkpoints.`);
