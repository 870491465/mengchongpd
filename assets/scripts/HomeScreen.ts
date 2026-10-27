import { Node, UITransform, Sprite, SpriteFrame, Label, Color, Graphics, resources, EventTouch, HorizontalTextAlignment, VerticalTextAlignment } from 'cc';
import { PICTURE_NAME, Tuning } from './RowModel';

/** Supplied home artwork, assembled at the source document's 864×1536 size. */
export class HomeScreen {
    readonly node: Node;
    readonly controls = new Map<string, Node>();
    private modal: Node;
    private volumeLabel: Label;
    private pressed = new Set<Node>();
    get visible() { return this.node.active; }
    constructor(parent: Node, start: () => void, tuning: Tuning) {
        this.node = this.at(parent, 'Home', 432, 768, 864, 1536);
        this.art(this.node, 'Background', 'background_home', 432, 768, 864, 1536);
        this.art(this.node, 'Logo', 'title_logo', 432, 123, 455, 203);
        this.label(this.node, 'Tagline', '— 一颗一颗，拼出小美好 —', 432, 252, 30, '#829A84', 650);
        this.art(this.node, 'Hero', 'hero_cat_beads', 432, 650.5, 664, 687);
        this.art(this.node, 'SproutLeft', 'icon_sprout', 306, 1061, 43, 31);
        this.art(this.node, 'SproutRight', 'icon_sprout', 558, 1061, 43, 31);
        this.label(this.node, 'LevelName', PICTURE_NAME, 432, 1060, 32, '#366D51', 224);
        const button = this.art(this.node, 'StartButton', 'button_start_base', 432, 1195, 494, 174);
        this.label(button, 'StartText', '开始拼豆', 432, 1190, 66, '#FFF9DC', 470);
        this.touch('start', button, () => { this.clearPresses(); this.node.active = false; start(); });
        // No gallery implementation exists yet: hide it as required by the asset guide.
        const settings = this.art(this.node, 'Settings', 'button_settings', 794, 69, 94, 93);
        this.touch('settings', settings, () => { this.modal.active = true; });
        this.label(this.node, 'Footer', '— 选颜色 · 装弹夹 · 按住发射 —', 432, 1459, 25, '#829A84', 760);
        this.modal = this.at(this.node, 'HomeSettings', 432, 768, 864, 1536);
        const g = this.modal.addComponent(Graphics);
        g.fillColor = new Color(30, 62, 45, 130); g.rect(-432, -768, 864, 1536); g.fill();
        g.fillColor = new Color('#FFF9E9'); g.roundRect(-290, -180, 580, 360, 32); g.fill();
        this.label(this.modal, 'SettingsTitle', '设置', 432, 640, 38, '#366D51');
        const volume = this.art(this.modal, 'VolumeButton', 'button_gallery_base', 432, 746, 340, 130);
        this.volumeLabel = this.label(volume, 'VolumeText', '', 432, 746, 30, '#366D51');
        const refresh = () => { this.volumeLabel.string = tuning.volume > 0 ? '音效：开启' : '音效：关闭'; };
        let lastVolume = tuning.volume || .5; refresh();
        this.touch('volume', volume, () => {
            if (tuning.volume > 0) { lastVolume = tuning.volume; tuning.volume = 0; }
            else tuning.volume = lastVolume;
            refresh();
        });
        const close = this.art(this.modal, 'CloseButton', 'button_gallery_base', 432, 865, 240, 92);
        this.label(close, 'CloseText', '返回', 432, 863, 29, '#366D51');
        this.touch('close', close, () => { this.modal.active = false; });
        this.modal.active = false;
    }
    show() { this.clearPresses(); this.modal.active = false; this.node.active = true; }
    clearPresses() { for (const n of this.pressed) n.setScale(1, 1, 1); this.pressed.clear(); }
    private at(parent: Node, name: string, x: number, y: number, w: number, h: number) {
        const n = new Node(name); n.layer = parent.layer; parent.addChild(n);
        // All coordinates use design-document space, including nested controls.
        const origin = (parent as Node & { homeOrigin?: number[] }).homeOrigin || [432, 768];
        n.setPosition(x - origin[0], origin[1] - y); n.addComponent(UITransform).setContentSize(w, h);
        (n as Node & { homeOrigin?: number[] }).homeOrigin = [x, y]; return n;
    }
    private art(parent: Node, name: string, key: string, x: number, y: number, w: number, h: number) {
        const n = this.at(parent, name, x, y, w, h), s = n.addComponent(Sprite);
        s.sizeMode = Sprite.SizeMode.CUSTOM; s.trim = false; s.color = new Color('#FFFFFF');
        resources.load('ui-home/' + key + '/spriteFrame', SpriteFrame, (err, frame) => {
            if (!n.isValid) return;
            if (err) console.error('[Home UI] Missing artwork:', key, err); else s.spriteFrame = frame;
        }); return n;
    }
    private label(parent: Node, name: string, text: string, x: number, y: number, size: number, color: string, width = 540) {
        const n = this.at(parent, name, x, y, width, size * 1.5), l = n.addComponent(Label);
        l.string = text; l.fontFamily = 'Microsoft YaHei'; l.fontSize = size; l.lineHeight = size * 1.3;
        l.isBold = true; l.color = new Color(color); l.overflow = Label.Overflow.SHRINK;
        l.horizontalAlign = HorizontalTextAlignment.CENTER; l.verticalAlign = VerticalTextAlignment.CENTER;
        return l;
    }
    private touch(id: string, n: Node, action: () => void) {
        this.controls.set(id, n); let touch = -1;
        n.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            e.propagationStopped = true;
            if (!this.pressed.has(n)) touch = -1;
            if (touch >= 0 || !this.visible || this.modal?.active && (id === 'start' || id === 'settings')) return;
            touch = e.getID(); this.pressed.add(n); n.setScale(.96, .96, 1);
        });
        const release = (e: EventTouch, cancel: boolean) => {
            e.propagationStopped = true; if (touch !== e.getID()) return;
            const armed = this.pressed.has(n);
            touch = -1; n.setScale(1, 1, 1); this.pressed.delete(n);
            if (armed && !cancel && this.visible && n.getComponent(UITransform)!.hitTest(e.getLocation(), e.windowId)) action();
        };
        n.on(Node.EventType.TOUCH_END, (e: EventTouch) => release(e, false));
        n.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => release(e, true));
    }
}
