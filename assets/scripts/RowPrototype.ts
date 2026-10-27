import { _decorator, Component, Node, Graphics, Color, Label, UITransform, view, Sprite,
    SpriteFrame, Mask, ResolutionPolicy, game, Game, input, Input, EventTouch,
    AudioClip, AudioSource, resources } from 'cc';
import { PictureModel, RowModel, PALETTE, PICTURE, PICTURE_NAME, PICTURE_WIDTH, PICTURE_HEIGHT, BeanColor, Tuning } from './RowModel';
import { HomeScreen } from './HomeScreen';
import { SuccessScreen } from './SuccessScreen';
import { pictureSprite } from './PictureSprite';
const { ccclass } = _decorator;
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => { v = clamp(v); return v * v * (3 - 2 * v); };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const PALETTE_WIDTH = 824;
const PALETTE_LEFT = 432 - PALETTE_WIDTH / 2;
const PALETTE_BEAD = PALETTE_WIDTH / PALETTE.length - 4;
const CELL = Math.min(800 / PICTURE_WIDTH, 880 / PICTURE_HEIGHT);
export const V3_LAYOUT = {
    width: 864, height: 1536,
    boardX: 32 + (800 - CELL * PICTURE_WIDTH) / 2,
    boardY: 192 + (880 - CELL * PICTURE_HEIGHT) / 2, cell: CELL,
    queueX: 208, queuePitch: 112, queueY: 1264,
    activeX: 266, activeY: 1442, chamberX: 467, chamberY: 1450,
    muzzleX: 467, muzzleY: 1370,
};
type Layer = { node: Node; x: number; y: number };
type Visual = { node: Node; sprite: Sprite; tint?: string; alpha?: number; width?: number; height?: number };
type TouchButton = { node: Node; x: number; y: number; w: number; h: number; group: string };
type Point = { x: number; y: number };
const ART = ['background_clean', 'bead_white', 'gun_body_empty', 'gun_muzzle', 'magazine_active_empty',
    'magazine_queue_empty', 'queue_slot_empty', 'button_fire', 'button_settings', 'speed_button_base'];

/** V3 artwork presentation. Simulation, reservations and completion remain in RowModel. */
@ccclass('RowPrototype')
export class RowPrototype extends Component {
    private picture = new PictureModel();
    private get model(): RowModel { return this.picture.current; }
    private layers = new Map<string, Layer>();
    private visuals = new Map<string, Visual>();
    private frames = new Map<string, SpriteFrame>();
    private labels = new Map<string, Label>();
    private buttons = new Map<string, TouchButton>();
    private clips = new Map<string, Layer>();
    private seenVisuals = new Set<string>();
    private seenLabels = new Set<string>();
    private seenClips = new Set<string>();
    private board!: Graphics;
    private boardKey = '';
    private boardCells = new Map<string, Visual>();
    private completedBoard!: Sprite;
    private ui!: Graphics;
    private uiKey = '';
    private redrawUI = true;
    private colors = new Map<string, Color>();
    private effects!: Graphics;
    private overlay!: Graphics;
    private muzzle!: Layer;
    private firePoint!: Node;
    private origins = new Map<number, Point>();
    private settingsOpen = false;
    private speedOpen = false;
    private fireTouch = -1;
    private ignoreDelta = false;
    private presses = PALETTE.map(() => -100);
    private hint = '点选颜色装填';
    private hintAt = -100;
    private assetErrors: string[] = [];
    private audioClips = new Map<string, AudioClip>();
    private voices: AudioSource[] = [];
    private voice = 0;
    private home!: HomeScreen;
    private success!: SuccessScreen;
    private initialized = false;

    onLoad() {
        view.setDesignResolutionSize(864, 1536, ResolutionPolicy.SHOW_ALL);
        // Explicit source-document order; flying beans sit above glass and the board.
        for (const name of ['Background', 'Header', 'Board', 'BoardText', 'Palette', 'QueueBase',
            'QueueBeans', 'QueueGlass', 'BottomDock', 'BottomBeans', 'GunRoot', 'FlyingBeans', 'Feedback', 'Modal', 'Labels', 'Input']) this.layer(name);
        this.ui = this.layers.get('Header')!.node.addComponent(Graphics);
        this.board = this.layers.get('Board')!.node.addComponent(Graphics);
        const ghost = pictureSprite(this.layers.get('Board')!.node, 'GhostPicture', 800, 800);
        ghost.node.setPosition(0, 768 - (V3_LAYOUT.boardY + 400)); ghost.color = new Color(255,255,255,26);
        this.completedBoard = pictureSprite(this.layers.get('Board')!.node, 'CompletedPicture', 800, 800, sprite => {
            // Creator 3.8.8 updates filled UVs immediately. Its SpriteFrame must
            // already exist, including when resources.load completes next frame.
            sprite.type = Sprite.Type.FILLED; sprite.fillType = Sprite.FillType.VERTICAL;
            sprite.fillStart = 0; sprite.fillRange = this.picture.completedRows / PICTURE_HEIGHT;
        });
        this.completedBoard.node.setPosition(0, 768 - (V3_LAYOUT.boardY + 400));
        const tray = this.layers.get('BottomDock')!.node.addComponent(Graphics);
        this.box(tray, 432, 1531, 940, 194, '#FFF0DE', '#FFFBF2', 255, 78);
        this.effects = this.layers.get('Feedback')!.node.addComponent(Graphics);
        this.overlay = this.layers.get('Modal')!.node.addComponent(Graphics);
        this.muzzle = this.layer('MuzzleRoot', this.layers.get('GunRoot')!, V3_LAYOUT.muzzleX, V3_LAYOUT.muzzleY);
        this.firePoint = new Node('FirePoint'); this.firePoint.layer = this.node.layer;
        this.muzzle.node.addChild(this.firePoint); this.firePoint.setPosition(0, 23);
        this.model.tuning.recoil = 4;
        for (let i = 0; i < 4; i++) this.voices.push(this.node.addComponent(AudioSource));
        for (const key of ART) resources.load('ui-v3/' + key + '/spriteFrame', SpriteFrame, (err, frame) => {
            if (!this.node.isValid) return;
            if (err) { this.assetErrors.push(key); console.error('[V3 UI] Missing SpriteFrame:', key, err); }
            else this.frames.set(key, frame);
        });
        for (const name of ['lock', 'feed', 'shot', 'hit', 'eject', 'complete']) resources.load('audio/' + name, AudioClip, (err, clip) => {
            if (!err && this.node.isValid) this.audioClips.set(name, clip);
        });
        this.picture.onEvent = name => {
            if (name.startsWith('autoLoad:')) { this.presses[Number(name.slice(9))] = this.model.time; return; }
            if (name === 'shot') {
                this.positionMuzzle();
                const shot = this.model.shots[this.model.shots.length - 1];
                const local = this.layers.get('FlyingBeans')!.node.getComponent(UITransform)!.convertToNodeSpaceAR(this.firePoint.worldPosition);
                this.origins.set(shot.id, { x: local.x + 432, y: 768 - local.y });
            }
            if (name === 'nextRow') {
                this.releaseHold(); this.origins.clear(); this.presses = PALETTE.map(() => -100);
                this.say(this.picture.autoEnabled ? '全自动 · 正在准备下一排' : '下一排已就绪 · 点选颜色装填');
            } else if (name === 'pictureComplete') {
                this.say(PICTURE_NAME + ' · 拼豆完成'); this.sound('complete'); this.showSuccess();
            }
            else this.sound(name);
        };
        this.createButtons();
        this.home = new HomeScreen(this.node, () => {
            if (this.picture.completed) { this.picture.resetPicture(); this.resetVisuals(); }
            this.ignoreDelta = true;
            for (const layer of this.layers.values()) layer.node.active = true;
            this.render(); this.renderBoard();
        }, this.model.tuning);
        this.success = new SuccessScreen(this.node, () => {
            this.picture.setAuto(false); this.releaseHold(); this.home.show();
            for (const layer of this.layers.values()) layer.node.active = false;
        });
        for (const layer of this.layers.values()) layer.node.active = false;
        game.on(Game.EVENT_HIDE, this.hide, this); game.on(Game.EVENT_SHOW, this.show, this);
        input.on(Input.EventType.TOUCH_END, this.release, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.release, this);
        this.initialized = true;
    }
    private layer(name: string, parent?: Layer, x = 432, y = 768): Layer {
        const node = new Node(name); node.layer = this.node.layer;
        (parent?.node || this.node).addChild(node);
        node.setPosition(x - (parent?.x || 432), (parent?.y || 768) - y);
        node.addComponent(UITransform).setContentSize(864, 1536);
        const layer = { node, x, y }; this.layers.set(name, layer); return layer;
    }
    private button(id: string, x: number, y: number, w: number, h: number, group: string, action: () => void) {
        const node = new Node('Touch-' + id); node.layer = this.node.layer;
        this.layers.get('Input')!.node.addChild(node); node.setPosition(x - 432, 768 - y);
        node.addComponent(UITransform).setContentSize(w, h);
        this.buttons.set(id, { node, x, y, w, h, group });
        node.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            e.propagationStopped = true;
            if (!this.initialized || this.home?.visible || this.success?.visible) return;
            if ((group === 'game' || group === 'auto') && (this.settingsOpen || this.speedOpen) ||
                group === 'settings' && !this.settingsOpen || group === 'speed' && (!this.speedOpen || this.settingsOpen)) return;
            if (this.picture.autoEnabled && id === 'fire') return;
            if (id.startsWith('color') && !this.colorEnabled(Number(id.slice(5)) as BeanColor)) return;
            if (id === 'fire') { if (this.fireTouch >= 0) return; this.fireTouch = e.getID(); this.model.hold(true); }
            else action();
        });
        if (id === 'fire') {
            node.on(Node.EventType.TOUCH_END, this.release, this);
            node.on(Node.EventType.TOUCH_CANCEL, this.release, this);
            node.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
                if (!node.getComponent(UITransform)!.hitTest(e.getLocation(), e.windowId)) this.release(e);
            });
        }
    }
    private createButtons() {
        this.button('dismiss', 432, 768, 864, 1536, 'dismiss', () => { this.settingsOpen = false; this.speedOpen = false; });
        PALETTE.forEach((color, i) => this.button('color' + i, PALETTE_LEFT + (i + .5) * PALETTE_WIDTH / PALETTE.length, 1171, PALETTE_WIDTH / PALETTE.length, 84, 'game', () => {
            this.presses[i] = this.model.time;
            if (this.model.load(color.id)) this.say('点选颜色装填');
            else this.say(this.model.held ? '松开发射后可继续装填' : !this.model.counts[i] ? '当前排不需要该颜色' : '该颜色已装填');
        }));
        this.button('fire', 640, 1443, 136, 136, 'game', () => {});
        this.button('auto', 704, V3_LAYOUT.boardY - 32, 200, 54, 'auto', () => {
            this.releaseHold();
            const enabled = this.picture.setAuto(!this.picture.autoEnabled);
            this.say(enabled ? '全自动已开启 · 自动装填并逐排发射' : this.picture.completed ? '整图已完成，可在设置中重置' : '全自动已暂停');
        });
        this.button('settings', 782, 78, 88, 88, 'always', () => { this.picture.setAuto(false); this.releaseHold(); this.settingsOpen = !this.settingsOpen; this.speedOpen = false; });
        this.button('speed', V3_LAYOUT.muzzleX, V3_LAYOUT.muzzleY + 24, 100, 48, 'game', () => { this.picture.setAuto(false); this.releaseHold(); this.speedOpen = true; });
        [.5, 1, 2].forEach((speed, i) => this.button('speed' + i, V3_LAYOUT.muzzleX, 1195 + i * 54, 116, 50, 'speed', () => {
            this.model.cadence = speed; this.speedOpen = false;
        }));
        this.button('close', 738, 410, 64, 64, 'settings', () => { this.settingsOpen = false; });
        const tuning: [keyof Tuning, number, number, number][] = [
            ['rate', 1, 3, 10], ['feed', .025, .025, .6], ['insert', .05, .1, 1], ['swap', .05, .15, 1.5],
            ['flight', .05, .05, 1], ['hit', .025, .05, .6], ['recoil', 1, 0, 20], ['bounce', .25, 0, 2], ['volume', .1, 0, 1],
        ];
        tuning.forEach(([key, step, min, max], i) => {
            this.button('minus' + key, 631, 576 + i * 54, 52, 44, 'settings', () => {
                this.model.tuning[key] = Math.max(min, +(this.model.tuning[key] - step).toFixed(4));
            });
            this.button('plus' + key, 703, 576 + i * 54, 52, 44, 'settings', () => {
                this.model.tuning[key] = Math.min(max, +(this.model.tuning[key] + step).toFixed(4));
            });
        });
        this.button('simSlow', 432, 1124, 390, 54, 'settings', () => { this.model.speed = this.model.speed === 1 ? .5 : 1; });
        this.button('resetRow', 269, 1224, 250, 62, 'settings', () => { this.picture.resetRow(); this.resetVisuals(); });
        this.button('resetPicture', 595, 1224, 250, 62, 'settings', () => { this.picture.resetPicture(); this.resetVisuals(); });
        this.button('home', 432, 1350, 250, 60, 'settings', () => {
            this.picture.setAuto(false); this.releaseHold(); this.settingsOpen = false; this.speedOpen = false;
            this.voices.forEach(v => v.stop()); this.home.show();
            for (const layer of this.layers.values()) layer.node.active = false;
        });
    }
    private resetVisuals() {
        this.releaseHold(); this.origins.clear(); this.boardKey = ''; this.presses = PALETTE.map(() => -100);
        this.settingsOpen = false; this.speedOpen = false; this.voices.forEach(v => v.stop()); this.say('点选颜色装填');
    }
    private say(value: string) { this.hint = value; this.hintAt = this.model.time; }
    private colorEnabled(color: BeanColor): boolean {
        return !this.picture.autoEnabled && !this.settingsOpen && !this.speedOpen && this.model.canLoad(color);
    }
    private releaseHold() { this.model.hold(false); this.fireTouch = -1; }
    private release(e: EventTouch) { if (e.getID() === this.fireTouch) this.releaseHold(); }
    private hide() { this.home?.clearPresses(); this.success?.clearPresses(); this.picture.setAuto(false); this.model.suspend(true); this.fireTouch = -1; this.speedOpen = false; this.voices.forEach(v => v.stop()); }
    private show() { this.model.suspend(false); this.ignoreDelta = true; this.say('请重新按住发射'); }
    private sound(name: string) {
        const clip = this.audioClips.get(name); if (!clip) return;
        const voice = this.voices[this.voice++ % this.voices.length];
        voice.stop(); voice.clip = clip; voice.volume = this.model.tuning.volume * .65; voice.play();
    }
    private sprite(id: string, art: string, x: number, y: number, w: number, h: number, layer: Layer, color = '#FFFFFF', alpha = 255): Node {
        let item = this.visuals.get(id);
        if (!item) {
            const node = new Node(id); node.layer = this.node.layer; layer.node.addChild(node); node.addComponent(UITransform);
            const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.trim = false;
            item = { node, sprite }; this.visuals.set(id, item);
        }
        this.seenVisuals.add(id); item.node.active = alpha > 0;
        const px = x - layer.x, py = layer.y - y;
        if (item.node.position.x !== px || item.node.position.y !== py) item.node.setPosition(px, py);
        const frame = this.frames.get(art); if (frame && item.sprite.spriteFrame !== frame) item.sprite.spriteFrame = frame;
        if (item.width !== w || item.height !== h) {
            item.node.getComponent(UITransform)!.setContentSize(w, h); item.width = w; item.height = h;
        }
        alpha = Math.round(clamp(alpha / 255) * 255);
        if (item.tint !== color || item.alpha !== alpha) {
            const c = this.color(color); item.sprite.color = new Color(c.r, c.g, c.b, alpha);
            item.tint = color; item.alpha = alpha;
        }
        return item.node;
    }
    private color(hex: string): Color {
        let c = this.colors.get(hex); if (!c) { c = new Color(hex); this.colors.set(hex, c); } return c;
    }
    private text(id: string, value: string, x: number, y: number, size: number, color = '#174F51', bold = false, layer = 'Labels') {
        let label = this.labels.get(id);
        if (!label) {
            const node = new Node('Text-' + id); node.layer = this.node.layer; this.layers.get(layer)!.node.addChild(node);
            node.addComponent(UITransform).setContentSize(layer === 'BoardText' ? CELL * 2 : 840, size + 12); label = node.addComponent(Label);
            label.cacheMode = Label.CacheMode.CHAR;
            label.fontFamily = 'Microsoft YaHei'; this.labels.set(id, label);
        }
        this.seenLabels.add(id); label.node.active = true;
        if (label.node.position.x !== x - 432 || label.node.position.y !== 768 - y) label.node.setPosition(x - 432, 768 - y);
        if (label.string !== value) label.string = value;
        if (label.fontSize !== size) label.fontSize = size;
        if (label.lineHeight !== size * 1.2) label.lineHeight = size * 1.2;
        if (label.isBold !== bold) label.isBold = bold;
        const c = this.color(color);
        if (label.color.r !== c.r || label.color.g !== c.g || label.color.b !== c.b) label.color = c;
    }
    private box(g: Graphics, x: number, y: number, w: number, h: number, color: string, edge = '', alpha = 255, radius = 8) {
        if (g === this.ui && !this.redrawUI) return;
        if (![x, y, w, h, alpha].every(Number.isFinite) || w <= 0 || h <= 0) return;
        const c = new Color(color); g.fillColor = new Color(c.r, c.g, c.b, Math.round(clamp(alpha / 255) * 255));
        const path = () => { if (radius < 1) g.rect(x - w / 2 - 432, 768 - y - h / 2, w, h);
            else g.roundRect(x - w / 2 - 432, 768 - y - h / 2, w, h, Math.min(radius, w / 2, h / 2)); };
        path(); g.fill();
        if (edge) { g.strokeColor = new Color(edge); g.lineWidth = 1.5; path(); g.stroke(); }
    }
    private bead(id: string, color: BeanColor, x: number, y: number, size: number, layer: Layer, alpha = 255, scaleX = 1, scaleY = 1) {
        this.sprite(id, 'bead_white', x, y, size * scaleX, size * scaleY, layer, PALETTE[color].hex, alpha);
    }
    private clip(id: string, parent: Layer, x: number, y: number, w: number, h: number): Layer {
        let region = this.clips.get(id);
        if (!region) {
            region = this.layer('Clip-' + id, parent, x, y);
            region.node.addComponent(Mask).type = Mask.Type.GRAPHICS_RECT;
            this.clips.set(id, region);
        }
        region.x = x; region.y = y; region.node.active = true;
        region.node.setPosition(x - parent.x, parent.y - y);
        region.node.getComponent(UITransform)!.setContentSize(w, h);
        this.seenClips.add(id); return region;
    }
    private queuePoint(slot: number): Point { return { x: V3_LAYOUT.queueX + slot * V3_LAYOUT.queuePitch, y: V3_LAYOUT.queueY }; }
    private queueBean(index: number, total: number): Point & { size: number } {
        const columns = Math.min(5, Math.max(1, Math.ceil(total / 8))), rows = Math.ceil(total / columns);
        const pitch = Math.min(10, 22 / columns, 56 / rows);
        const row = Math.floor(index / columns), c = index % columns;
        return { x: (c - (columns - 1) / 2) * pitch, y: -29 + (row + .5) * pitch, size: pitch * .95 };
    }
    private activeBean(index: number, total: number): Point & { size: number } {
        const columns = Math.min(14, Math.max(1, Math.ceil(Math.sqrt(total * 164 / 44)))), rows = Math.ceil(total / columns);
        const pitch = Math.min(22, 164 / columns, 44 / rows);
        const row = Math.floor(index / columns), col = index % columns;
        const lane = row % 2 === 0 ? col : columns - 1 - col;
        return { x: 340 - (lane + .5) * pitch, y: 1426 + (row + .5) * pitch, size: pitch * .95 };
    }
    private positionMuzzle() {
        const m = this.model, duration = m.cadence === 2 ? .05 : .08, age = m.time - m.lastShot;
        const peak = duration * .3125;
        const p = age < 0 || age >= duration ? 0 : age < peak ? age / peak : 1 - (age - peak) / (duration - peak);
        this.muzzle.y = V3_LAYOUT.muzzleY + p * m.tuning.recoil;
        this.muzzle.node.setPosition(V3_LAYOUT.muzzleX - 432, 768 - this.muzzle.y);
    }
    update(dt: number) {
        if (!this.initialized) return;
        if (this.home.visible) return;
        if (this.success.visible) { if (!this.model.suspended) this.success.tick(dt); return; }
        if (this.ignoreDelta) { dt = 0; this.ignoreDelta = false; }
        this.picture.tick(dt);
        if (this.success.visible) return;
        this.render(); this.renderBoard();
    }
    private showSuccess() {
        if (!this.initialized || !this.picture.completed || this.success.visible) return;
        this.picture.setAuto(false); this.releaseHold(); this.settingsOpen = this.speedOpen = false;
        for (const layer of this.layers.values()) layer.node.active = false;
        this.success.show();
    }
    private render() {
        const m = this.model, t = m.time;
        this.seenVisuals.clear(); this.seenLabels.clear(); this.seenClips.clear();
        const uiKey = this.picture.totalSeated + ':' + PALETTE.map(c => +this.colorEnabled(c.id)).join('') + ':' +
            this.presses.map(at => Math.max(0, 1 - (t - at) / .18)).join(',');
        this.redrawUI = this.uiKey !== uiKey;
        if (this.redrawUI) { this.uiKey = uiKey; this.ui.clear(); }
        this.effects.clear(); this.overlay.clear(); this.positionMuzzle();
        this.sprite('background', 'background_clean', 432, 768, 864, 1536, this.layers.get('Background')!);
        this.text('title', PICTURE_NAME, 432, 86, 46, '#07555B', true);
        this.text('progressTitle', '完成进度', 170, 150, 27, '#103C36', true);
        const progress = this.picture.totalSeated / (PICTURE_WIDTH * PICTURE_HEIGHT);
        this.box(this.ui, 440, 150, 420, 28, '#D5F4DC', '#9FDFB8', 255, 13);
        if (progress > 0) this.box(this.ui, 230 + progress * 420 / 2, 150, progress * 420, 27, '#00DCC1', '', 255, 13);
        if (progress > .02) this.box(this.ui, 230 + progress * 420 / 2, 142, progress * 420 - 9, 5, '#C6FFEE', '', 110, 2);
        this.text('percent', Math.floor(progress * 100) + '%', 706, 150, 38, '#111B17', true);
        this.sprite('settingsArt', 'button_settings', 782, 78, 86, 86, this.layers.get('Header')!);
        this.sprite('autoBase', 'speed_button_base', 704, V3_LAYOUT.boardY - 32, 188, 56, this.layers.get('Header')!, this.picture.autoEnabled ? '#B9FFE2' : '#FFFFFF');
        this.text('auto', this.picture.autoEnabled ? '停止自动' : '全自动', 704, V3_LAYOUT.boardY - 32, 24, '#07594D', true);
        // Number labels are attached to the current physical row; no enlarged detached strip.
        const currentY = V3_LAYOUT.boardY + (this.picture.rowIndex + .5) * CELL;
        if (!this.picture.completed) m.row.forEach((color, i) => {
            if (m.targets[i] !== 'seated') this.text('cell' + i, String(color + 1), V3_LAYOUT.boardX + (i + .5) * CELL, currentY, CELL * .55, '#173D37', true, 'BoardText');
        });
        const unassigned = PALETTE.some(c => m.counts[c.id] > 0 && !m.used.has(c.id));
        const prompt = this.picture.completed ? PICTURE_NAME + ' · 拼豆完成' : this.picture.autoEnabled ? '全自动 · 装填、发射、换排进行中' : m.held && !m.remaining && unassigned
            ? '松手后继续装填本排剩余颜色' : m.queue.length >= 5 && unassigned ? '待发槽已满 · 按住发射' : '点选颜色装填';
        this.text('prompt', t - this.hintAt < 1.8 ? this.hint : prompt, 432, 1110, 29, '#073E32', true);
        this.box(this.ui, 432, 1171, PALETTE_WIDTH + 16, PALETTE_BEAD + 12, '#FFF8E6', '#F1D0A6', 255, 7);
        PALETTE.forEach((color, i) => {
            const enabled = this.colorEnabled(color.id);
            const x = PALETTE_LEFT + (i + .5) * PALETTE_WIDTH / PALETTE.length;
            const p = Math.max(0, 1 - (t - this.presses[i]) / .18);
            const width = PALETTE_WIDTH / PALETTE.length - 1;
            this.box(this.ui, x, 1171 + p * 2, width, PALETTE_BEAD + 4, enabled ? '#FFFAED' : '#E5E6E5', enabled ? '#F0D4B5' : '#C4C8C6', 255, 4);
            this.sprite('palette' + i, 'bead_white', x, 1171 + p * 2, PALETTE_BEAD, PALETTE_BEAD * (1 - .04 * p), this.layers.get('Palette')!, enabled ? color.hex : '#B8B8B8');
            this.visuals.get('palette' + i)!.sprite.grayscale = !enabled;
            this.text('color' + i, String(color.id + 1), x, 1172, Math.min(24, PALETTE_BEAD * .56), enabled ? '#16342D' : '#858A87', true);
        });
        for (let slot = 0; slot < 5; slot++) {
            const q = this.queuePoint(slot);
            this.sprite('slot' + slot, 'queue_slot_empty', q.x, q.y, 100, 104, this.layers.get('QueueBase')!);
            this.text('slotNumber' + slot, String(slot + 1), q.x, 1330, 21, '#729C94', true);
        }
        for (const mag of m.queue) {
            const destination = this.queuePoint(mag.slot), previous = this.queuePoint(mag.slotFrom === undefined ? mag.slot : mag.slotFrom);
            const advance = mag.slotAt === undefined ? 1 : smooth((t - mag.slotAt) / .18);
            const q = { x: mix(previous.x, destination.x, advance), y: destination.y };
            const p = clamp((t - mag.insertedAt) / mag.insertDuration);
            const sourceX = PALETTE_LEFT + (mag.color + .5) * PALETTE_WIDTH / PALETTE.length;
            const x = mix(sourceX, q.x, smooth(p / .75));
            const y = mix(1192, q.y, smooth(p / .75)) + (p > .75 ? Math.sin((p - .75) / .25 * Math.PI) * 4 * m.tuning.bounce : 0);
            const inside = this.clip('queue' + mag.slot, this.layers.get('QueueBeans')!, x, y + 8, 24, 60);
            for (let j = 0; j < mag.inside; j++) {
                const b = this.queueBean(j, m.counts[mag.color]); this.bead('queue' + mag.slot + '-bean' + j, mag.color, x + b.x, y + 8 + b.y, b.size, inside);
            }
            this.sprite('queueGlass' + mag.slot, 'magazine_queue_empty', x, y, 50, 94, this.layers.get('QueueGlass')!);
        }
        this.renderGun(); this.renderShots();
        this.sprite('fireArt', 'button_fire', 640, 1443 + (m.held ? 2 : 0), m.held ? 121 : 124, m.held ? 119 : 122, this.layers.get('BottomDock')!);
        this.text('fire', '发射', 640, 1445, 34, '#FFFFFF', true);
        const speedY = this.muzzle.y + 24;
        // Draw above both gun sprites so the control covers their neck seam.
        this.sprite('speedBase', 'speed_button_base', V3_LAYOUT.muzzleX, speedY, 88, 27, this.layers.get('Feedback')!);
        this.text('speed', '射速 ' + m.cadence + '×', V3_LAYOUT.muzzleX - 5, speedY - 1, 15, '#173A31', true);
        const speedTouch = this.buttons.get('speed')!;
        speedTouch.y = speedY; speedTouch.node.setPosition(V3_LAYOUT.muzzleX - 432, 768 - speedY);
        this.overlay.strokeColor = new Color('#23584B'); this.overlay.lineWidth = 2;
        this.overlay.moveTo(V3_LAYOUT.muzzleX + 23 - 432, 768 - speedY + 3);
        this.overlay.lineTo(V3_LAYOUT.muzzleX + 28 - 432, 768 - speedY - 2);
        this.overlay.lineTo(V3_LAYOUT.muzzleX + 33 - 432, 768 - speedY + 3); this.overlay.stroke();
        if (this.speedOpen) this.renderSpeedMenu();
        if (this.settingsOpen) { this.seenLabels.clear(); this.renderSettings(); }
        for (const [id, item] of this.visuals) item.node.active = this.seenVisuals.has(id) && item.sprite.color.a > 0;
        for (const [id, label] of this.labels) label.node.active = this.seenLabels.has(id);
        for (const [id, clip] of this.clips) clip.node.active = this.seenClips.has(id);
        for (const [id, button] of this.buttons) button.node.active = (button.group === 'always' ||
            (button.group === 'game' || button.group === 'auto') && !this.settingsOpen && !this.speedOpen ||
            button.group === 'settings' && this.settingsOpen || button.group === 'speed' && this.speedOpen && !this.settingsOpen ||
            button.group === 'dismiss' && (this.settingsOpen || this.speedOpen)) &&
            (!id.startsWith('color') || this.colorEnabled(Number(id.slice(5)) as BeanColor)) &&
            (id !== 'fire' || !this.picture.autoEnabled);
    }
    private renderGun() {
        const m = this.model, a = m.active;
        let x = V3_LAYOUT.activeX, y = V3_LAYOUT.activeY, opacity = 255, dock = 1;
        if (a && m.phase === 'dock') {
            dock = smooth(m.progress); const q = this.queuePoint(a.slot);
            x = mix(q.x, x, dock); y = mix(q.y, y, dock);
        } else if (a && m.phase === 'eject') {
            const p = smooth(m.progress); x -= p * 70; y -= Math.sin(p * Math.PI / 2) * 25; opacity *= 1 - p;
        }
        if (a) {
            const inside = this.clip('active', this.layers.get('BottomBeans')!, x - 8 * dock, y + mix(8, 6, dock), mix(24, 166, dock), mix(60, 46, dock));
            for (let j = 0; j < a.inside; j++) {
                const b = this.activeBean(j, m.counts[a.color]), next = this.activeBean(j + 1, m.counts[a.color]);
                const feed = m.phase === 'feed' ? 1 - smooth(m.progress) : 0;
                const q = this.queueBean(j, m.counts[a.color]);
                const bx = mix(q.x, mix(b.x, next.x, feed) - V3_LAYOUT.activeX, dock);
                const by = mix(8 + q.y, mix(b.y, next.y, feed) - V3_LAYOUT.activeY, dock);
                this.bead('activeBean' + j, a.color, x + bx, y + by, mix(q.size, b.size, dock), inside, opacity);
            }
            if (dock < 1) this.sprite('activeVertical', 'magazine_queue_empty', x, y, 50, 94, this.layers.get('GunRoot')!, '#FFFFFF', (1 - dock) * opacity);
        }
        this.sprite('activeGlass', 'magazine_active_empty', x, y, 250, 109, this.layers.get('GunRoot')!, '#FFFFFF', dock * opacity);
        if (m.chamber !== null) {
            const p = m.phase === 'feed' ? smooth(clamp((m.progress - .12) / .88)) : 1;
            const start = this.activeBean(0, m.counts[m.chamber]);
            // Window mask is separate from the short visible interface feed path.
            if (p < .8) this.bead('feeding', m.chamber, mix(start.x, V3_LAYOUT.chamberX, p), mix(start.y, V3_LAYOUT.chamberY, p), mix(start.size, 32, p), this.layers.get('BottomBeans')!);
            const chamber = this.clip('chamber', this.layers.get('BottomBeans')!, V3_LAYOUT.chamberX, V3_LAYOUT.chamberY, 62, 49);
            if (p >= .8) this.bead('chamberBean', m.chamber, mix(start.x, V3_LAYOUT.chamberX, p), mix(start.y, V3_LAYOUT.chamberY, p), mix(start.size, 32, p), chamber);
        }
        this.sprite('muzzleArt', 'gun_muzzle', V3_LAYOUT.muzzleX, this.muzzle.y, 80, 63, this.muzzle);
        // The body has a fixed position. It never inherits muzzle recoil.
        this.sprite('gunBody', 'gun_body_empty', 460, 1445, 164, 126, this.layers.get('GunRoot')!);
    }
    private renderShots() {
        const m = this.model, layer = this.layers.get('FlyingBeans')!, live = new Set<number>();
        m.shots.forEach((shot, i) => {
            live.add(shot.id); const age = m.time - shot.at;
            const target = { x: V3_LAYOUT.boardX + (shot.target + .5) * CELL, y: V3_LAYOUT.boardY + (this.picture.rowIndex + .5) * CELL };
            const from = this.origins.get(shot.id) || { x: V3_LAYOUT.muzzleX, y: V3_LAYOUT.muzzleY - 23 };
            if (age < shot.flight) {
                const p = clamp(age / shot.flight);
                this.bead('flight' + i, shot.color, mix(from.x, target.x, p), mix(from.y, target.y, p) - 45 * Math.sin(p * Math.PI), mix(29, CELL * .95, p), layer);
            } else {
                const p = clamp((age - shot.flight) / shot.hit), wave = Math.sin(p * Math.PI * 2) * (1 - p) * .16 * m.tuning.bounce;
                this.box(this.effects, target.x, target.y, CELL + 7, CELL + 7, PALETTE[shot.color].hex, '', 45 * (1 - p), 4);
                this.bead('flight' + i, shot.color, target.x, target.y, CELL * .95, layer, 255, 1 + wave, 1 - wave);
            }
        });
        for (const id of this.origins.keys()) if (!live.has(id)) this.origins.delete(id);
    }
    private renderBoard() {
        const m = this.model, frame = this.frames.get('bead_white');
        const key = `${this.picture.rowIndex}:${m.seatedCount}:${this.picture.completedRows}:${this.picture.completed}:${!!frame}`;
        if (this.boardKey === key) return;
        this.boardKey = key; const g = this.board; g.clear();
        this.box(g, 432, V3_LAYOUT.boardY + PICTURE_HEIGHT * CELL / 2, PICTURE_WIDTH * CELL, PICTURE_HEIGHT * CELL, '#FFF5E7', '#EEE1CF', 255, 2);
        // Finished rows are revealed from the bottom in one filled Sprite. Only
        // the current row remains live for individual physical landings.
        if (this.completedBoard.spriteFrame) this.completedBoard.fillRange = this.picture.completedRows / PICTURE_HEIGHT;
        const y = this.picture.rowIndex;
        for (let x = 0; x < PICTURE_WIDTH; x++) {
            const id = String(x); let item = this.boardCells.get(id);
            if (!item) {
                const node = new Node('Cell-' + id); node.layer = this.node.layer;
                this.layers.get('Board')!.node.addChild(node); node.addComponent(UITransform).setContentSize(CELL + .1, CELL + .1);
                const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM; sprite.trim = false;
                item = { node, sprite }; this.boardCells.set(id, item);
            }
            const px = V3_LAYOUT.boardX + (x + .5) * CELL - 432, py = 768 - V3_LAYOUT.boardY - (y + .5) * CELL;
            if (item.node.position.x !== px || item.node.position.y !== py) item.node.setPosition(px, py);
            if (frame && item.sprite.spriteFrame !== frame) item.sprite.spriteFrame = frame;
            const seated = this.picture.finished[y] || y === this.picture.rowIndex && m.targets[x] === 'seated';
            const color = this.color(PALETTE[PICTURE[y][x]].hex);
            // 49 over the 26-alpha ghost gives the former 70-alpha current row.
            const alpha = seated ? 255 : 49;
            if (item.sprite.color.r !== color.r || item.sprite.color.g !== color.g || item.sprite.color.b !== color.b || item.sprite.color.a !== alpha)
                item.sprite.color = new Color(color.r, color.g, color.b, alpha);
        }
        if (!this.picture.completed) {
            const top = V3_LAYOUT.boardY + this.picture.rowIndex * CELL, bottom = top + CELL;
            g.strokeColor = new Color('#137378'); g.lineWidth = 4;
            for (const x of [V3_LAYOUT.boardX - 9, V3_LAYOUT.boardX + CELL * PICTURE_WIDTH + 9]) {
                const sign = x < 432 ? 1 : -1;
                g.moveTo(x + sign * 10 - 432, 768 - top); g.lineTo(x - 432, 768 - top);
                g.lineTo(x - 432, 768 - bottom); g.lineTo(x + sign * 10 - 432, 768 - bottom); g.stroke();
            }
        }
    }
    private renderSpeedMenu() {
        for (const id of this.seenLabels) {
            const position = this.labels.get(id)!.node.position, x = position.x + 432, y = 768 - position.y;
            if (x >= V3_LAYOUT.muzzleX - 74 && x <= V3_LAYOUT.muzzleX + 74 && y >= 1155 && y <= 1342) this.seenLabels.delete(id);
        }
        this.box(this.overlay, V3_LAYOUT.muzzleX, 1249, 134, 180, '#FFFAEF', '#85CFC2', 255, 14);
        [.5, 1, 2].forEach((speed, i) => {
            this.sprite('speedOption' + i, 'speed_button_base', V3_LAYOUT.muzzleX, 1195 + i * 54, 116, 45, this.layers.get('Modal')!);
            this.text('speedOptionText' + i, speed + '×', V3_LAYOUT.muzzleX, 1195 + i * 54, 24, '#1D5347', speed === this.model.cadence);
        });
    }
    private renderSettings() {
        const m = this.model;
        this.box(this.overlay, 432, 768, 864, 1536, '#244B43', '', 125, 0);
        this.box(this.overlay, 432, 895, 714, 1080, '#FFFAF0', '#B7DDCE', 255, 28);
        this.text('settingsTitle', '设置与动作调试', 414, 417, 34, '#0C5957', true);
        this.text('close', '×', 738, 410, 38);
        this.text('rowInfo', `第 ${PICTURE_HEIGHT - this.picture.rowIndex}/${PICTURE_HEIGHT} 排 · 已归位 ${this.picture.totalSeated}/${PICTURE_WIDTH * PICTURE_HEIGHT}`, 432, 480, 22);
        this.text('ammoInfo', `弹药 ${m.remaining} · 在途 ${m.shots.length} · 枪仓 ${m.chamber === null ? '空' : m.chamber + 1}`, 432, 515, 21);
        const rows: [keyof Tuning, string, string][] = [['rate', '基础射速', '颗/秒'], ['feed', '补位及上膛', 'ms'], ['insert', '装夹时间', 'ms'],
            ['swap', '自动换夹', 'ms'], ['flight', '飞行时间', 'ms'], ['hit', '击中归位', 'ms'], ['recoil', '枪头后坐', 'px'], ['bounce', '归位回弹', '×'], ['volume', '音效音量', '%']];
        rows.forEach(([key, name, unit], i) => {
            const value = m.tuning[key], n = unit === 'ms' ? Math.round(value * 1000) : unit === '%' ? Math.round(value * 100) : +value.toFixed(2);
            this.text('param' + key, `${name}   ${n} ${unit}`, 351, 576 + i * 54, 23);
            for (const [prefix, x, label] of [['minus', 631, '−'], ['plus', 703, '+']] as [string, number, string][]) {
                this.box(this.overlay, x, 576 + i * 54, 52, 44, '#E7F4E9', '#B8DBCB'); this.text(prefix + key, label, x, 576 + i * 54, 27);
            }
        });
        this.box(this.overlay, 432, 1124, 390, 54, '#E5F3E8', '#B8DBCB');
        this.text('simSlow', `动作慢放 ${m.speed}×`, 432, 1124, 24);
        this.box(this.overlay, 269, 1224, 250, 62, '#FFF0D9', '#E6CBA6'); this.text('resetRow', '重置本排', 269, 1224, 25);
        this.box(this.overlay, 595, 1224, 250, 62, '#DDF4E9', '#A9D8C5'); this.text('resetPicture', '重置整图', 595, 1224, 25);
        this.text('assetStatus', this.assetErrors.length ? '素材加载失败：' + this.assetErrors.join(', ') : '临时音效 · 发射倍率只调整射击与补豆节奏', 432, 1280, 16, '#718A7D');
        this.box(this.overlay, 432, 1350, 250, 60, '#DDF4E9', '#A9D8C5'); this.text('home', '返回首页', 432, 1350, 25);
    }
    onDestroy() {
        this.initialized = false;
        this.success?.close();
        this.picture.setAuto(false);
        game.off(Game.EVENT_HIDE, this.hide, this); game.off(Game.EVENT_SHOW, this.show, this);
        input.off(Input.EventType.TOUCH_END, this.release, this); input.off(Input.EventType.TOUCH_CANCEL, this.release, this);
        this.picture.onEvent = () => {}; this.model.onEvent = () => {}; this.voices.forEach(v => v.stop());
    }
}
