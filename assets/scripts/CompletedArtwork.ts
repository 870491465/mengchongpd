import { sys } from 'cc';
import { PICTURE_CODES, PICTURE_NAME, PICTURE_WIDTH, PICTURE_HEIGHT } from './PictureData';

/** One record per matrix; reentering settlement never creates duplicate works. */
export function saveCompletedArtwork(): boolean {
    let hash = 2166136261;
    for (const c of PICTURE_CODES.join('')) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
    const key = `beads.completed.v1.${PICTURE_WIDTH}x${PICTURE_HEIGHT}.${hash.toString(16)}`;
    try {
        const old = sys.localStorage.getItem(key);
        if (old) {
            try {
                const data = JSON.parse(old);
                if (data.width === PICTURE_WIDTH && data.height === PICTURE_HEIGHT &&
                    JSON.stringify(data.rows) === JSON.stringify(PICTURE_CODES)) return true;
            } catch { /* Replace a corrupted record with the completed matrix. */ }
        }
        const record = JSON.stringify({ version: 1, name: PICTURE_NAME, width: PICTURE_WIDTH,
            height: PICTURE_HEIGHT, rows: PICTURE_CODES, completedAt: new Date().toISOString() });
        sys.localStorage.setItem(key, record);
        return sys.localStorage.getItem(key) === record;
    } catch (error) {
        console.warn('[Success] Could not save completed artwork:', error); return false;
    }
}
