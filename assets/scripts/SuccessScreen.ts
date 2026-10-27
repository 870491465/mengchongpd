import { Node, UITransform, Sprite, SpriteFrame, Label, Color, Graphics, resources, EventTouch,
    HorizontalTextAlignment, VerticalTextAlignment, sys } from 'cc';
import { PICTURE, PICTURE_NAME, PICTURE_WIDTH, PICTURE_HEIGHT, PALETTE } from './RowModel';
import { saveCompletedArtwork } from './CompletedArtwork';
import { pictureSprite } from './PictureSprite';

/** Settlement uses the exact played matrix, never the example artwork PNG. */
export class SuccessScreen {
    readonly node: Node;
    readonly controls = new Map<string, Node>();
    private pressed = new Set<Node>();
    private savedIcon: Node;
    private status: Label;
    private message: Label;
    private artwork: Node;
    private built = false;
    private sharing = false;
    private session = 0;
    private sparkles: Sprite[] = [];
    private clock = 0;
    get visible() { return this.node.active; }
    constructor(parent: Node, home: () => void) {
        this.node = this.at(parent, 'Success', 432, 768, 864, 1536);
        this.art(this.node, 'SuccessBackground', 'background_success', 432, 768, 864, 1536);
        const frame = this.at(this.node, 'ArtworkFrame', 432, 710, 712, 712);
        const g = frame.addComponent(Graphics);
        g.fillColor = new Color('#FFF4D9'); g.roundRect(-356, -356, 712, 712, 18); g.fill();
        g.strokeColor = new Color('#EADDBD'); g.lineWidth = 3; g.roundRect(-356, -356, 712, 712, 18); g.stroke();
        this.artwork = this.at(this.node, 'CompletedMatrix', 432, 710, 688, 688);
        for (const [i, x, y, size] of [[0, 61, 310, 50], [1, 47, 354, 31], [2, 812, 978, 40], [3, 49, 1040, 35]]) {
            const n = this.art(this.node, 'Sparkle' + i, 'sparkle_gold', x, y, size, size * 238 / 224);
            this.sparkles.push(n.getComponent(Sprite)!);
        }
        this.art(this.node, 'SuccessTitle', 'title_success', 432, 187.5, 530, 163);
        this.label(this.node, 'SuccessLevelName', PICTURE_NAME, 432, 281, 34, '#526F5A', 580).isBold = false;
        this.savedIcon = this.art(this.node, 'SavedIcon', 'icon_saved', 350, 1152, 45, 45);
        this.status = this.label(this.node, 'SavedStatus', '', 458, 1152, 29, '#526F5A', 270);
        this.status.isBold = false;
        const retry = this.at(this.node, 'RetrySave', 432, 1152, 410, 64);
        this.touch('retry', retry, () => this.save());
        const next = this.art(this.node, 'ContinueButton', 'button_continue_base', 432, 1267, 488, 139);
        this.label(next, 'ContinueText', '继续拼豆', 432, 1260, 52, '#FFF9E0', 450);
        this.touch('continue', next, () => { this.close(); home(); });
        const share = this.art(this.node, 'ShareButton', 'button_share_base', 432, 1407, 324, 105);
        this.art(share, 'ShareIcon', 'icon_share', 354, 1407, 39, 41);
        this.label(share, 'ShareText', '分享作品', 465, 1407, 33, '#526F5A', 210).isBold = false;
        this.touch('share', share, () => { void this.share(); });
        const back = this.art(this.node, 'HomeButton', 'button_home', 81, 89, 82, 81);
        this.touch('home', back, () => { this.close(); home(); });
        this.message = this.label(this.node, 'SuccessMessage', '', 432, 1490, 20, '#526F5A', 750);
        this.node.active = false;
    }
    show() { this.session++; this.clock = 0; this.sharing = false; this.clearPresses(); this.node.active = true; this.message.string = ''; this.buildArtwork(); this.save(); }
    close() { this.session++; this.node.active = false; this.clearPresses(); }
    clearPresses() { for (const n of this.pressed) n.setScale(1, 1, 1); this.pressed.clear(); }
    tick(dt: number) {
        this.clock += Math.min(dt, .05);
        this.sparkles.forEach((s, i) => {
            const wave = (Math.sin(this.clock * 1.6 + i * 1.3) + 1) / 2;
            s.color = new Color(255, 255, 255, 145 + wave * 100);
            const scale = .9 + wave * .15; s.node.setScale(scale, scale, 1);
        });
    }
    private save() {
        const saved = saveCompletedArtwork(); this.savedIcon.active = saved;
        this.status.string = saved ? '作品已收藏' : '保存失败 · 点此重试';
        this.controls.get('retry')!.active = !saved;
    }
    private buildArtwork() {
        if (this.built) return;
        this.built = true;
        pictureSprite(this.artwork, 'ResultPicture', 688, 688);
    }
    private async share() {
        if (this.sharing) return;
        if (!sys.isBrowser || typeof document === 'undefined') { this.message.string = '当前平台暂未接入分享，请在浏览器中导出作品'; return; }
        this.sharing = true; const session = this.session;
        try {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 800;
            const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas unavailable');
            const cell = Math.min(800 / PICTURE_WIDTH, 800 / PICTURE_HEIGHT);
            for (let y = 0; y < PICTURE_HEIGHT; y++) for (let x = 0; x < PICTURE_WIDTH; x++) {
                ctx.fillStyle = PALETTE[PICTURE[y][x]].hex;
                ctx.fillRect(x * cell, y * cell, cell, cell);
            }
            const data = canvas.toDataURL('image/png');
            // A real user click opens the platform share sheet; otherwise export a PNG.
            const bytes = atob(data.split(',')[1]), array = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) array[i] = bytes.charCodeAt(i);
            const file = new File([array], PICTURE_NAME + '.png', { type: 'image/png' });
            const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
            if (nav.share && nav.canShare?.({ files: [file] })) {
                await nav.share({ title: PICTURE_NAME, files: [file] });
            } else {
                const link = document.createElement('a'); link.href = data; link.download = file.name;
                document.body.appendChild(link); link.click(); link.remove();
                if (session === this.session) this.message.string = '已导出作品图片，可保存后分享';
            }
        } catch (error) {
            if (session === this.session) this.message.string = (error as Error).name === 'AbortError' ? '已取消分享' : '分享未完成，请重试';
        } finally { if (session === this.session) this.sharing = false; }
    }
    private at(parent: Node, name: string, x: number, y: number, w: number, h: number) {
        const n = new Node(name); n.layer = parent.layer; parent.addChild(n);
        const origin = (parent as Node & { successOrigin?: number[] }).successOrigin || [432, 768];
        n.setPosition(x - origin[0], origin[1] - y); n.addComponent(UITransform).setContentSize(w, h);
        (n as Node & { successOrigin?: number[] }).successOrigin = [x, y]; return n;
    }
    private art(parent: Node, name: string, key: string, x: number, y: number, w: number, h: number) {
        const n = this.at(parent, name, x, y, w, h), s = n.addComponent(Sprite);
        s.sizeMode = Sprite.SizeMode.CUSTOM; s.trim = false; s.color = new Color('#FFFFFF');
        resources.load('ui-success/' + key + '/spriteFrame', SpriteFrame, (err, frame) => {
            if (!n.isValid) return;
            if (err) console.error('[Success] Missing artwork:', key, err); else s.spriteFrame = frame;
        }); return n;
    }
    private label(parent: Node, name: string, text: string, x: number, y: number, size: number, color: string, width: number) {
        const n = this.at(parent, name, x, y, width, size * 1.5), l = n.addComponent(Label);
        l.string = text; l.fontFamily = 'Microsoft YaHei'; l.fontSize = size; l.lineHeight = size * 1.3;
        l.isBold = true; l.color = new Color(color); l.overflow = Label.Overflow.SHRINK;
        l.horizontalAlign = HorizontalTextAlignment.CENTER; l.verticalAlign = VerticalTextAlignment.CENTER; return l;
    }
    private touch(id: string, n: Node, action: () => void) {
        this.controls.set(id, n); let touch = -1;
        n.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            e.propagationStopped = true; if (!this.pressed.has(n)) touch = -1;
            if (touch >= 0 || !this.visible) return;
            touch = e.getID(); this.pressed.add(n); n.setScale(.96, .96, 1);
        });
        const release = (e: EventTouch, cancel: boolean) => {
            e.propagationStopped = true; if (touch !== e.getID()) return;
            const armed = this.pressed.has(n); touch = -1; n.setScale(1, 1, 1); this.pressed.delete(n);
            if (armed && !cancel && this.visible && n.getComponent(UITransform)!.hitTest(e.getLocation(), e.windowId)) action();
        };
        n.on(Node.EventType.TOUCH_END, (e: EventTouch) => release(e, false));
        n.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => release(e, true));
    }
}
