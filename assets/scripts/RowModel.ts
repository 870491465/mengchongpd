/** Pure simulation. All times are simulation seconds, including presentation phases. */
import { PICTURE_CODES, PICTURE_WIDTH, PICTURE_HEIGHT } from './PictureData';
export { PICTURE_NAME, PICTURE_WIDTH, PICTURE_HEIGHT } from './PictureData';
export type BeanColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
    10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19;
export const PALETTE: { id: BeanColor; name: string; hex: string }[] = [
    { id: 0, name: '01 黄', hex: '#FFE174' },
    { id: 1, name: '02 红', hex: '#FF8D7E' },
    { id: 2, name: '03 蓝', hex: '#8ED9F4' },
    { id: 3, name: '04 绿', hex: '#75BD91' },
    { id: 4, name: '05 奶白', hex: '#FFF6DF' },
    { id: 5, name: '06 杏橙', hex: '#FFC398' },
    { id: 6, name: '07 淡紫', hex: '#CAB5ED' },
    { id: 7, name: '08 青色', hex: '#80DCD6' },
    { id: 8, name: '09 棕色', hex: '#795648' },
    { id: 9, name: '10 粉色', hex: '#F6B2BF' },
    { id: 10, name: '11 金黄', hex: '#F1BD37' },
    { id: 11, name: '12 朱红', hex: '#E96358' },
    { id: 12, name: '13 蔚蓝', hex: '#55AFE0' },
    { id: 13, name: '14 深绿', hex: '#489D6A' },
    { id: 14, name: '15 米白', hex: '#E8DDC6' },
    { id: 15, name: '16 橙色', hex: '#F4A668' },
    { id: 16, name: '17 紫色', hex: '#A98BD0' },
    { id: 17, name: '18 湖绿', hex: '#44BCAF' },
    { id: 18, name: '19 深棕', hex: '#574039' },
    { id: 19, name: '20 玫粉', hex: '#DE88A0' },
];
const PATTERN: BeanColor[] = [0, 1, 2, 3, 4, 0, 2, 4, 1, 3];
export const ROW: BeanColor[] = Array.from({ length: 50 }, (_, i) => PATTERN[i % PATTERN.length]);
export const COUNTS = PALETTE.map(color => ROW.filter(c => c === color.id).length);
export interface Tuning {
    rate: number; feed: number; insert: number; swap: number; flight: number;
    hit: number; recoil: number; bounce: number; volume: number;
}
export interface Magazine {
    id: number; color: BeanColor; inside: number; remaining: number;
    insertedAt: number; insertDuration: number; slot: number; insertionLocked: boolean;
    slotFrom?: number; slotAt?: number;
}
export interface Shot {
    id: number; color: BeanColor; target: number; at: number;
    flight: number; hit: number; contacted: boolean;
}
export type Phase = 'idle' | 'dock' | 'feed' | 'ready' | 'eject';
export class RowModel {
    readonly counts: number[];
    constructor(public readonly row: BeanColor[] = ROW) {
        this.counts = PALETTE.map(color => row.filter(c => c === color.id).length);
        this.targets = row.map(() => 'empty');
    }
    tuning: Tuning = { rate: 6, feed: .1, insert: .3, swap: .3, flight: .25,
        hit: .15, recoil: 7, bounce: 1, volume: .5 };
    time = 0; speed = 1; cadence = 1; held = false; suspended = false;
    used = new Set<BeanColor>(); queue: Magazine[] = []; active: Magazine | null = null;
    chamber: BeanColor | null = null;
    phase: Phase = 'idle'; phaseAt = 0; phaseDuration = 0;
    targets: ('empty' | 'reserved' | 'seated')[] = ROW.map(() => 'empty');
    shots: Shot[] = []; lastShot = -100; completedAt = -1;
    completedCount = 0; ejectCount = 0; shotCount = 0; seatedCount = 0;
    private serial = 0;
    onEvent: (name: string) => void = () => {};

    reset() {
        this.time = 0; this.held = false; this.used.clear(); this.queue = [];
        this.active = null; this.chamber = null; this.phase = 'idle';
        this.phaseAt = 0; this.phaseDuration = 0; this.targets = this.row.map(() => 'empty');
        this.shots = []; this.lastShot = -100; this.completedAt = -1;
        this.completedCount = this.ejectCount = this.shotCount = this.seatedCount = 0;
        // No asynchronous callbacks survive reset. IDs are never reused.
    }
    canLoad(color: BeanColor): boolean {
        return !this.held && !this.suspended && this.completedAt < 0 && !this.used.has(color) &&
            this.queue.length < 5 && this.counts[color] > 0;
    }
    load(color: BeanColor): boolean {
        if (!this.canLoad(color)) return false;
        this.used.add(color);
        const slots = new Set(this.queue.map(m => m.slot));
        let slot = 0; while (slots.has(slot)) slot++;
        this.queue.push({ id: ++this.serial, color, inside: this.counts[color], remaining: this.counts[color],
            insertedAt: this.time, insertDuration: this.tuning.insert, slot, insertionLocked: false });
        return true;
    }
    hold(value: boolean) { this.held = value && !this.suspended && this.completedAt < 0; }
    suspend(value: boolean) { this.suspended = value; this.held = false; }
    get remaining() { return this.queue.reduce((s, m) => s + m.remaining, this.active?.remaining || 0); }
    get feedDuration() { return this.tuning.feed / this.cadence; }
    get progress() { return Math.min(1, (this.time - this.phaseAt) / Math.max(.001, this.phaseDuration)); }
    private phaseTo(phase: Phase, duration: number) {
        this.phase = phase; this.phaseAt = this.time; this.phaseDuration = Math.max(.001, duration);
    }
    private feed() {
        if (!this.active || this.active.inside === 0) return;
        this.active.inside--; this.chamber = this.active.color;
        this.phaseTo('feed', this.feedDuration);
    }
    tick(realDelta: number) {
        if (this.suspended) return;
        // Integrate long frames without catch-up bursts on resume (host also discards resume delta).
        let left = Math.min(realDelta, .1) * this.speed;
        while (left > 1e-8) { const dt = Math.min(left, 1 / 240); this.step(dt); left -= dt; }
    }
    private step(dt: number) {
        this.time += dt;
        for (const mag of this.queue) {
            if (!mag.insertionLocked && this.time >= mag.insertedAt + mag.insertDuration * .85) {
                mag.insertionLocked = true; this.onEvent('lock');
            }
        }
        for (const s of this.shots) {
            const age = this.time - s.at;
            if (!s.contacted && age >= s.flight) { s.contacted = true; this.onEvent('hit'); }
            if (age >= s.flight + s.hit && this.targets[s.target] === 'reserved') {
                this.targets[s.target] = 'seated'; this.seatedCount++;
            }
        }
        if (this.shots.length) this.shots = this.shots.filter(s => this.targets[s.target] !== 'seated');
        if (this.phase === 'eject' && this.progress >= 1) {
            this.active = null; this.ejectCount++; this.phaseTo('idle', 0);
        }
        if (!this.active && this.queue.length &&
            this.time >= this.queue[0].insertedAt + this.queue[0].insertDuration) {
            this.active = this.queue.shift()!;
            this.queue.forEach((mag, slot) => {
                if (mag.slot !== slot) { mag.slotFrom = mag.slot; mag.slot = slot; mag.slotAt = this.time; }
            });
            // swap includes eject, dock and first feed; feed still respects the feed parameter.
            this.phaseTo('dock', Math.max(.02, this.tuning.swap - this.feedDuration) * .5);
        }
        if (this.phase === 'dock' && this.progress >= 1) { this.onEvent('lock'); this.feed(); }
        else if (this.phase === 'feed' && this.progress >= 1) {
            this.phaseTo('ready', 0); this.onEvent('feed');
        }
        if (this.held && this.phase === 'ready' && this.chamber !== null &&
            this.time - this.lastShot >= 1 / (this.tuning.rate * this.cadence)) {
            const target = this.row.findIndex((c, i) => c === this.chamber && this.targets[i] === 'empty');
            if (target >= 0 && this.active) {
                this.targets[target] = 'reserved';
                this.shots.push({ id: ++this.serial, color: this.chamber, target, at: this.time,
                    flight: this.tuning.flight, hit: this.tuning.hit, contacted: false });
                this.lastShot = this.time; this.shotCount++; this.active.remaining--;
                this.chamber = null; this.onEvent('shot');
                if (this.active.inside > 0) this.feed();
                else { this.phaseTo('eject', Math.max(.02, this.tuning.swap - this.feedDuration) * .5); this.onEvent('eject'); }
            }
        }
        if (this.completedAt < 0 && this.seatedCount === this.row.length &&
            this.shots.length === 0 && !this.active && this.queue.length === 0) {
            this.completedAt = this.time; this.completedCount++; this.held = false; this.onEvent('complete');
        }
    }
}

// Keep the artwork's natural row colors. The palette always displays every color;
// absent colors are disabled in the UI instead of being inserted into the image.
export const PICTURE: BeanColor[][] = PICTURE_CODES.map(code => code.split('').map(c => parseInt(c, 36) as BeanColor));
/** Owns persistent picture progress; each row has its own isolated simulation. */
export class PictureModel {
    rowIndex = PICTURE_HEIGHT - 1;
    finished = PICTURE.map(() => false);
    current = new RowModel(PICTURE[this.rowIndex]);
    completed = false;
    autoEnabled = false;
    onEvent: (name: string) => void = () => {};
    constructor() { this.bind(); }
    private bind() { this.current.onEvent = name => this.onEvent(name); }
    get completedRows() { return this.finished.filter(Boolean).length; }
    get totalSeated() { return this.completedRows * PICTURE_WIDTH + (this.finished[this.rowIndex] ? 0 : this.current.seatedCount); }
    setAuto(enabled: boolean): boolean {
        this.autoEnabled = enabled && !this.completed && !this.current.suspended;
        if (!this.autoEnabled) this.current.hold(false);
        return this.autoEnabled;
    }
    private driveAuto() {
        const m = this.current;
        if (!this.autoEnabled || this.completed || m.completedAt >= 0 || m.suspended) return;
        // Load between batches, never while the chamber still has ammunition.
        // All insert/feed/flight/eject work still runs through the ordinary model.
        if (m.remaining === 0) {
            m.hold(false);
            for (const color of PALETTE) if (m.canLoad(color.id) && m.load(color.id)) this.onEvent('autoLoad:' + color.id);
        }
        if (m.remaining > 0) m.hold(true);
    }
    tick(dt: number) {
        if (this.current.suspended) this.setAuto(false);
        this.driveAuto();
        this.current.tick(dt);
        if (this.current.completedAt < 0 || this.completed) return;
        this.finished[this.rowIndex] = true;
        if (this.current.time - this.current.completedAt < .65) return;
        if (this.rowIndex === 0) { this.completed = true; this.setAuto(false); this.onEvent('pictureComplete'); return; }
        const old = this.current;
        this.current = new RowModel(PICTURE[--this.rowIndex]);
        this.current.tuning = old.tuning; this.current.speed = old.speed; this.current.cadence = old.cadence;
        this.current.suspended = old.suspended;
        this.bind(); this.onEvent('nextRow');
    }
    resetRow() {
        this.setAuto(false);
        this.finished[this.rowIndex] = false; this.completed = false; this.current.reset();
    }
    resetPicture() {
        this.setAuto(false);
        const old = this.current;
        this.rowIndex = PICTURE_HEIGHT - 1; this.finished = PICTURE.map(() => false); this.completed = false;
        this.current = new RowModel(PICTURE[this.rowIndex]);
        this.current.tuning = old.tuning; this.current.speed = old.speed; this.current.cadence = old.cadence; this.current.suspended = old.suspended;
        this.bind();
    }
}
