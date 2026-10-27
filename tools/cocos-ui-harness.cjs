// CPU test harness for production Cocos UI code. It records the real scene tree
// and draw commands; it is not a substitute for a Creator/GPU runtime test.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const editor = process.env.COCOS_EDITOR || 'D:/ProgramData/cocos/editors/Creator/3.8.8';
const ts = require(editor + '/resources/app.asar.unpacked/node_modules/typescript');
class Color {
    constructor(r=255,g=255,b=255,a=255) {
        if(typeof r==='string'){const n=parseInt(r.replace('#',''),16);r=n>>16;g=n>>8&255;b=n&255;}
        Object.assign(this,{r,g,b,a});
    }
}
class Node {
    constructor(name=''){Object.assign(this,{name,layer:33554432,children:[],components:[],active:true,isValid:true,position:{x:0,y:0,z:0},events:new Map()});}
    addChild(node){node.parent=this;this.children.push(node);}
    setPosition(x,y,z=0){this.position=typeof x==='object'?{...x}:{x,y,z};}
    setScale(x,y,z=1){this.scale={x,y,z};}
    get worldPosition(){const p=this.parent?.worldPosition||{x:0,y:0,z:0};return{x:p.x+this.position.x,y:p.y+this.position.y,z:0};}
    addComponent(C){const c=new C();c.node=this;this.components.push(c);return c;}
    getComponent(C){return this.components.find(c=>c instanceof C);}
    on(name,fn,target){this.events.set(name,fn.bind(target));}off(){}
}
Node.EventType={TOUCH_START:'start',TOUCH_END:'end',TOUCH_CANCEL:'cancel',TOUCH_MOVE:'move'};
class UITransform {
    setContentSize(w,h){this.width=w;this.height=h;}
    convertToNodeSpaceAR(p){const w=this.node.worldPosition;return{x:p.x-w.x,y:p.y-w.y,z:0};}
    hitTest(p){const w=this.node.worldPosition;return Math.abs(p.x-w.x)<=this.width/2&&Math.abs(p.y-w.y)<=this.height/2;}
}
class Graphics {
    constructor(){this.commands=[];this.paths=[];this.lineWidth=1;}
    clear(){this.commands=[];this.paths=[];}
    rect(x,y,w,h){this.paths.push({kind:'rect',x,y,w,h,r:0});}
    roundRect(x,y,w,h,r){this.paths.push({kind:'rect',x,y,w,h,r});}
    moveTo(x,y){this.paths.push({kind:'line',points:[[x,y]]});}
    lineTo(x,y){this.paths[this.paths.length-1].points.push([x,y]);}
    fill(){this.commit('fill',this.fillColor);}
    stroke(){this.commit('stroke',this.strokeColor);}
    commit(mode,color){for(const p of this.paths)this.commands.push({...p,mode,color:{...color},lineWidth:this.lineWidth});this.paths=[];}
}
class Sprite{
 constructor(){this.color=new Color();this._fillRange=1;this._fillStart=0;}
 get fillStart(){return this._fillStart;}set fillStart(v){this.checkFilled();this._fillStart=v;}
 get fillRange(){return this._fillRange;}set fillRange(v){this.checkFilled();this._fillRange=v;}
 checkFilled(){if(this.type===Sprite.Type.FILLED&&!this.spriteFrame)throw new Error('Filled Sprite UV update requires a loaded SpriteFrame');}
}Sprite.SizeMode={CUSTOM:0};Sprite.Type={FILLED:3};Sprite.FillType={VERTICAL:1};
class SpriteFrame{}
class Mask{}Mask.Type={GRAPHICS_RECT:0};
class Label{constructor(){this.color=new Color();}}Label.Overflow={SHRINK:2};Label.CacheMode={CHAR:2};
class AudioClip{}
const view={resolution:null,setDesignResolutionSize(w,h){this.resolution=[w,h];}};
let deferResources=false;const resourceCallbacks=[];
const savedWorks=new Map();
const storage={writes:0,fail:false,getItem(k){if(this.fail)throw new Error('storage unavailable');return savedWorks.get(k)||null;},setItem(k,v){if(this.fail)throw new Error('storage unavailable');this.writes++;savedWorks.set(k,v);}};
const cc={_decorator:{ccclass:()=>C=>C},Component:class{constructor(){this.node=new Node('Canvas');}},
    Node,UITransform,Color,Graphics,Sprite,SpriteFrame,Mask,Label,view,sys:{localStorage:storage,isBrowser:false},HorizontalTextAlignment:{CENTER:1},VerticalTextAlignment:{CENTER:1},ResolutionPolicy:{SHOW_ALL:0},game:{on(){},off(){}},Game:{},
    input:{on(){},off(){}},Input:{EventType:{}},AudioClip,AudioSource:class{stop(){}play(){}},
    resources:{load(name,C,callback){
        if(C===SpriteFrame){
            const file=path.resolve('assets/resources/'+name.replace('/spriteFrame','.png'));
            assert.ok(fs.existsSync(file),'missing '+file);
            const meta=JSON.parse(fs.readFileSync(file+'.meta','utf8'));
            assert.equal(meta.userData.type,'sprite-frame');
            const frame=new SpriteFrame();frame.file=file;
            if(deferResources)resourceCallbacks.push(()=>callback(null,frame));else callback(null,frame);
        } else if(deferResources)resourceCallbacks.push(()=>callback(null,new AudioClip()));else callback(null,new AudioClip());
    }}};
function runtime(enterGame=true,deferred=false){
    deferResources=deferred;
    const cache=new Map();
    function load(file){
        file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
        const module={exports:{}};cache.set(file,module);
        const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
        vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename:file})(id=>id==='cc'?cc:load(path.resolve(path.dirname(file),id+'.ts')),module,module.exports);
        return module.exports;
    }
    const ui=load('assets/scripts/RowPrototype.ts');const model=load('assets/scripts/RowModel.ts');
    const p=new ui.RowPrototype();p.onLoad();
    if(enterGame){p.home.node.active=false;for(const layer of p.layers.values())layer.node.active=true;}
    return {p,ui,model,cc,view,flushResources(){deferResources=false;while(resourceCallbacks.length)resourceCallbacks.shift()();}};
}
function displayList(node,clip=null,items=[]){
    if(!node.active)return items;
    const pos=node.worldPosition,u=node.getComponent(UITransform);
    const mask=node.getComponent(Mask);
    if(mask)clip={x:pos.x+432-u.width/2,y:768-pos.y-u.height/2,w:u.width,h:u.height};
    for(const c of node.components){
        if(c instanceof Graphics)for(const cmd of c.commands)items.push({type:'graphics',...cmd,position:pos,clip});
        if(c instanceof Sprite&&c.spriteFrame){
            let region=clip;
            if(c.type===Sprite.Type.FILLED){
                if(c.fillRange<=0)continue;
                const fill={x:pos.x+432-u.width/2,y:768-pos.y+u.height/2-u.height*c.fillRange,w:u.width,h:u.height*c.fillRange};
                region=fill;
            }
            items.push({type:'sprite',name:node.name,file:c.spriteFrame.file,color:c.color,grayscale:!!c.grayscale,x:pos.x+432,y:768-pos.y,w:u.width,h:u.height,clip:region});
        }
        if(c instanceof Label)items.push({type:'text',name:node.name,text:c.string,size:c.fontSize,bold:c.isBold,color:c.color,x:pos.x+432,y:768-pos.y,clip});
    }
    for(const child of node.children)displayList(child,clip,items);
    return items;
}
function press(p,id,touchId=1){const b=p.buttons.get(id);assert.ok(b&&b.node.active,'inactive button '+id);b.node.events.get('start')({getID:()=>touchId,propagationStopped:false});}
module.exports={runtime,displayList,press};
