const assert=require('node:assert/strict');
const {runtime}=require('./cocos-ui-harness.cjs');
const {p,model,cc}=runtime();p.update(0);
function nodes(n){return 1+n.children.reduce((s,c)=>s+nodes(c),0);}
assert.equal(p.boardCells.size,model.PICTURE_WIDTH);
assert.ok(nodes(p.node)<1000);
for(const l of p.labels.values())assert.equal(l.cacheMode,cc.Label.CacheMode.CHAR);
let clears=0;const clear=p.ui.clear.bind(p.ui);p.ui.clear=()=>{clears++;clear();};
for(let i=0;i<120;i++)p.update(1/60);
assert.equal(clears,0,'idle UI should not rebuild static Graphics');
let writes=0;
for(const item of p.boardCells.values()){
 let color=item.sprite.color;
 Object.defineProperty(item.sprite,'color',{get(){return color;},set(c){color=c;writes++;}});
}
p.picture.setAuto(true);let guard=0;
while(p.model.seatedCount<30&&guard++<1500)p.update(1/60);
assert.ok(guard<1500);assert.equal(writes,30,'each landing updates one cell rather than the entire board');
assert.equal(p.completedBoard.fillRange,0);
while(p.picture.rowIndex===model.PICTURE_HEIGHT-1&&guard++<2500)p.update(1/60);
assert.equal(p.completedBoard.fillRange,1/model.PICTURE_HEIGHT);
assert.equal(p.boardCells.size,model.PICTURE_WIDTH);
assert.ok(nodes(p.node)<1000);
p.picture.resetPicture();p.resetVisuals();p.update(0);assert.equal(p.completedBoard.fillRange,0);
assert.equal(p.model.shots.length,0);
console.log(`PASS render budget: ${p.boardCells.size} live board cells, ${nodes(p.node)} total scene nodes, zero idle Graphics rebuilds, one cell-color write per landing, correct completed-row reveal/reset.`);
p.picture.setAuto(true);let frames=0,previous=p.picture.rowIndex,peak=nodes(p.node);
while(!p.picture.completed&&frames++<90000){
 p.update(1/60);
 if(p.picture.rowIndex!==previous){
  previous=p.picture.rowIndex;
  assert.equal(p.completedBoard.fillRange,p.picture.completedRows/model.PICTURE_HEIGHT);
  assert.equal(p.boardCells.size,80);peak=Math.max(peak,nodes(p.node));
 }
}
assert.ok(p.picture.completed);assert.ok(p.success.visible);assert.equal(p.picture.totalSeated,6400);
assert.equal(p.success.artwork.children.length,1);assert.ok(peak<1000);
console.log(`PASS full presentation: ${frames} frames, 6400 landings, 79 row reveals, one result Sprite, peak ${peak} nodes at row transitions (CPU harness, not measured device FPS).`);
