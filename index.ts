interface Block {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface Ball {
    x: number;
    y: number;
    size: number;
    angle: number;
    speed: number;
}

function intersects(block: Block, ball: Ball): boolean {
    return ball.x >= block.x && ball.x <= block.x + block.width &&
        ball.y >= block.y && ball.y <= block.y + block.height;
}

interface Character {
    x: number;
    y: number;
    width: number;
    height: number;
    image: HTMLImageElement,
    animation: 'up' | 'down';
}

interface State {
    bar: Block;
    ball: Ball;
    blocks: (Block | null)[];
    miss: number;
    character: Character;
    scene: Scene;
    isAnimation: boolean;
}

enum Scene {
    Start,
    Game,
    Clear,
    Gameover
}

interface GlobalState {
    cursorX: number;
    clicked: boolean;
}

var global: GlobalState = {
    cursorX: 0,
    clicked: false
};

function isClicked(): boolean {
    let r = global.clicked;
    global.clicked = false;
    return r;
}

function getCursorX(): number {
    return global.cursorX;
}

const baseImage = new Image();
const diffImage = new Image();
const maskImage = new Image();
const clearImage = new Image();
const gameoverImage = new Image();

function moveBar(state: State, cursorX: number): State {
    const barX = cursorX - state.bar.width / 2;
    const maxBarX = canvas.width - state.bar.width;
    if (barX < 0) {
        state.bar.x = 0;
    } else if (barX > maxBarX) {
        state.bar.x = maxBarX;
    } else {
        state.bar.x = barX;
    }
    return state;
}

function animateCharacter(state: State): State {
    const animationSpeed = 0.2
    switch (state.character.animation) {
    case 'up':
        if (state.character.y < 0) {
            state.character.animation = 'down';
        } else {
            state.character.y -= animationSpeed;
        }
        break;
    case 'down':
        if (state.character.y > 10) {
            state.character.animation = 'up';
        } else {
            state.character.y += animationSpeed;
        }
        break;
    }
    return state;
}

function updateSceneStart(state: State): State {
    const cursorX = getCursorX();

    state = moveBar(state, cursorX);

    const minBallX = state.bar.width / 2;
    const maxBallX = canvas.width - state.bar.width / 2;
    if (cursorX < minBallX) {
        state.ball.x = minBallX;
    } else if (cursorX > maxBallX) {
        state.ball.x = maxBallX;
    } else {
        state.ball.x = cursorX;
    }

    if (isClicked()) {
        state.scene = Scene.Game;
    }

    return state;
}

function updateSceneGame(state: State): State {
    const cursorX = getCursorX();

    state = moveBar(state, cursorX);

    const acceleration = 0.2;
    if (intersects(state.bar, state.ball)) {
        const r = (state.ball.x - state.bar.x) / state.bar.width - 0.5
        state.ball.angle = 360 - state.ball.angle - 90 * -r;
        state.ball.speed += acceleration;
    } else if (state.ball.y <= state.ball.size || state.ball.y >= canvas.height - state.ball.size) {
        state.ball.angle = 360 - state.ball.angle;
        state.ball.speed += acceleration;
    } else if (state.ball.x <= state.ball.size || state.ball.x >= canvas.width - state.ball.size) {
        state.ball.angle = 180 - state.ball.angle;
        state.ball.speed += acceleration;
    }

    if (state.ball.y >= canvas.height - state.ball.size) {
        state.miss++;
    }

    const rx = Math.cos(state.ball.angle / 180 * Math.PI);
    const ry = Math.sin(state.ball.angle / 180 * Math.PI);
    for (let k in state.blocks) {
        const block = state.blocks[k];
        if (!!block) {
            if (intersects(block, state.ball)) {
                state.blocks[k] = null;
                if (ry < rx) {
                    state.ball.angle = 360 - state.ball.angle;
                } else {
                    state.ball.angle = 180 - state.ball.angle;
                }
                state.ball.speed += acceleration;
                break;
            }
        }
    }

    if (state.blocks.filter(block => block != null).length < state.blocks.length / 2) {
        state.character.image = diffImage;
    }

    state.ball.x += rx * state.ball.speed;
    state.ball.y += ry * state.ball.speed;

    if (state.blocks.every(b => b == null)) {
        state.scene = Scene.Clear;
    } else if (state.miss >= 10) {
        state.character.image = gameoverImage;
        state.scene = Scene.Gameover;
    }

    return state;
}

function updateSceneClear(state: State): State {
    return state;
}

function update(state: State): State {
    if (state.isAnimation) {
        state = animateCharacter(state);
    }
    switch (state.scene) {
    case Scene.Start:
        return updateSceneStart(state);
    case Scene.Game:
        return updateSceneGame(state);
    case Scene.Clear:
        return updateSceneClear(state);
    case Scene.Gameover:
        return updateSceneClear(state);
    }
}

function renderMask(ctx: CanvasRenderingContext2D, state: State) {
    ctx.save();
    ctx.drawImage(maskImage, state.character.x, state.character.y, state.character.width, state.character.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    for (let block of state.blocks) {
        if (!!block) {
            ctx.moveTo(block.x, block.y + state.character.y);
            ctx.lineTo(block.x + block.width, block.y + state.character.y);
            ctx.lineTo(block.x + block.width, block.y + block.height + state.character.y);
            ctx.lineTo(block.x, block.y + block.height + state.character.y);
        }
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.drawImage(state.character.image, state.character.x, state.character.y, state.character.width, state.character.height);
    ctx.restore();
}

function renderInfo(ctx: CanvasRenderingContext2D, state: State) {
    ctx.save();
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);

    const blockCount = state.blocks.filter(block => block != null).length
    ctx.fillStyle = 'red';
    ctx.font = '16px sans-serif';
    ctx.fillText(`miss ${state.miss}    block ${blockCount}/${state.blocks.length}`, 16, canvas.height - 16);
    ctx.restore();
}

function renderGame(ctx: CanvasRenderingContext2D, state: State) {
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(state.bar.x, state.bar.y, state.bar.width, 10);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.strokeRect(state.bar.x, state.bar.y, state.bar.width, 10);

    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.size, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill()
    ctx.stroke();
    ctx.restore();
}

function render(ctx: CanvasRenderingContext2D, state: State) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    switch (state.scene) {
    case Scene.Start:
    case Scene.Game:
        renderMask(ctx, state);
        renderInfo(ctx, state);
        renderGame(ctx, state);
        break;
    case Scene.Gameover:
        renderMask(ctx, state);
        renderInfo(ctx, state);
        break;
    case Scene.Clear:
        ctx.drawImage(clearImage, state.character.x, state.character.y, state.character.width, state.character.height);
        break;
    }
}

function mainLoop(lastTick: number, tickLength: number, tFrame: number, ctx: CanvasRenderingContext2D, state: State): number {
    const nextTick = lastTick + tickLength;
    const timeSinceTick = tFrame - lastTick;
    const numTicks = tFrame > nextTick ? Math.floor(timeSinceTick / tickLength) : 0;

    for(let i = 0; i < numTicks; i++) {
        lastTick += tickLength;
        state = update(state);
    }

    render(ctx, state);
    return window.requestAnimationFrame(tFrame => mainLoop(lastTick, tickLength, tFrame, ctx, state));
}

function makeBlocks(image: ImageData): Block[] {
    let blocks: Block[] = [];
    let blockX = canvas.width / 2 - image.width / 2;
    let blockY = 0;
    const blockSize = Math.floor(image.width / 10);
    for (let y = 0; y < image.height; y += blockSize) {
        for (let x = 0; x < image.width; x += blockSize) {
            const w = x + blockSize;
            const h = y + blockSize;
            blockLoop: for (let yy = y; yy < h; yy++) {
                for (let xx = x; xx < w; xx++) {
                    const index = (xx + yy * image.width) * 4;
                    if (image.data[index + 3] > 0) {
                        blocks.push({x: blockX + x, y: blockY + y, width: blockSize, height: blockSize});
                        break blockLoop;
                    }
                }
            }
        }
    }
    return blocks;
}

function getImageData(image: HTMLImageElement, width: number, height: number): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!!ctx) {
        ctx.drawImage(image, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height);
    } else {
        return new ImageData(0, 0);
    }
}

const canvas = <HTMLCanvasElement>document.getElementById('canvas');

canvas.onclick = (e: MouseEvent) => {
    global.clicked = true;
}

window.onmousemove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    global.cursorX = e.pageX - rect.x;
};

window.ontouchstart = (e: TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    global.cursorX = e.changedTouches[e.changedTouches.length - 1].pageX - rect.x;
}

window.ontouchmove = (e: TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    global.cursorX = e.changedTouches[e.changedTouches.length - 1].pageX - rect.x;
}

function main(isAnimation: boolean) {
    const barMargin = 100;
    const clientWidth = document.body.clientWidth;
    const clientHeight = document.body.clientHeight;
    let imageHeight = clientHeight;
    let imageWidth = Math.floor(imageHeight * baseImage.width / baseImage.height);
    if (clientWidth < imageWidth) {
        imageWidth = clientWidth;
        imageHeight = Math.floor(imageWidth * baseImage.height / baseImage.width);
    }
    canvas.width = imageWidth;
    canvas.height = imageHeight + barMargin;
    const barWidth = 100;
    const barX = canvas.width / 2 - barWidth / 2;
    const barY = canvas.height - barMargin / 2;
    const bar = {
        x: barX,
        y: barY,
        width: barWidth,
        height: 25
    };
    const ball = {
        x: barX,
        y: barY - 5,
        size: 5,
        speed: 3,
        angle: 270
    };
    const blocks = makeBlocks(getImageData(maskImage, imageWidth, imageHeight));
    const character: Character = {
        x: canvas.width / 2 - imageWidth / 2,
        y: 0,
        width: imageWidth,
        height: imageHeight,
        image: baseImage,
        animation: 'down'
    };
    const state = {
        bar: bar,
        ball: ball,
        blocks: blocks,
        miss: 0,
        character: character,
        scene: Scene.Start,
        isAnimation: isAnimation
    }
    const ctx = canvas.getContext('2d');
    const now = performance.now();
    if (!!ctx) {
        mainLoop(now, 16.6, now, ctx, state);
    }
}

function loadImage(image: HTMLImageElement, src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = e => reject(e);
        image.src = src;
    });
}

const stage = new URLSearchParams(location.search).get('s');
if (stage === '2021') {
    Promise.all([
        loadImage(baseImage, "./2021/base.png"),
        loadImage(diffImage, "./2021/diff.png"),
        loadImage(maskImage, "./2021/mask.png"),
        loadImage(clearImage, "./2021/clear.png"),
        loadImage(gameoverImage, "./2021/clear.png")
    ]).then(() => main(false));
} else {
    Promise.all([
        loadImage(baseImage, "./base.png"),
        loadImage(diffImage, "./diff.png"),
        loadImage(maskImage, "./mask.png"),
        loadImage(clearImage, "./clear.png"),
        loadImage(gameoverImage, "./gameover.png")
    ]).then(() => main(true));
}
