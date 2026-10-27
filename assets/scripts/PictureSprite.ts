import { Node, UITransform, Sprite, SpriteFrame, Color, resources } from 'cc';

/** Shared by game and settlement: one cached texture, no thousands of static nodes. */
export function pictureSprite(parent: Node, name: string, width: number, height: number, ready?: (sprite: Sprite) => void): Sprite {
    const node = new Node(name); node.layer = parent.layer; parent.addChild(node);
    node.addComponent(UITransform).setContentSize(width, height);
    const sprite = node.addComponent(Sprite); sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.trim = false; sprite.color = new Color('#FFFFFF');
    resources.load('levels/cat-garden/board/spriteFrame', SpriteFrame, (err, frame) => {
        if (!node.isValid) return;
        if (err) console.error('[Picture] Failed to load baked matrix:', err);
        else { sprite.spriteFrame = frame; ready?.(sprite); }
    }); return sprite;
}
