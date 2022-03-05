import { Ball } from 'parts/Ball';
import { Brick } from 'parts/Brick';
import { Game } from 'parts/Game';
import { Paddle } from 'parts/Paddle';
import { assertNotNullOrUndefined } from 'utils/assert';
import './sass/style.scss';

interface IBrickFieldBrick {
  x: number;
  y: number;
  height: number;
  width: number;
  color: string;
  points: number;
  hitsLeft: number;
}

export class App {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private game: Game | null = null;
  private paddle: Paddle | null = null;
  private ball: Ball | null = null;
  private brick: Brick | null = null;
  private brickField: IBrickFieldBrick[] = [];
  private images: Record<string, HTMLImageElement> = {
    background: new Image(),
    ball: new Image(),
    paddle: new Image()
  };
  private sounds: Record<string, HTMLAudioElement> = {
    ballLost: new Audio('./sounds/ball-lost.mp3'),
    breakout: new Audio('./sounds/breakout.mp3'),
    brick: new Audio('./sounds/brick.mp3'),
    gameOver: new Audio('./sounds/game-over.mp3'),
    levelCompleted: new Audio('./sounds/level-completed.mp3'),
    music: new Audio('./sounds/music.mp3'),
    paddle: new Audio('./sounds/paddle.mp3')
  };

  protected attached(): void {
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    this.game = new Game();
    this.brick = new Brick(this.canvas);
    this.paddle = new Paddle(this.canvas);
    this.ball = new Ball();

    this.ctx = this.canvas.getContext('2d');
    this.initSounds();
    this.initImages();
    this.setStartState();
  }

  private initImages(): void {
    this.images.background.src = './images/bg-space.webp';
    this.images.ball.src = './images/ball.webp';
    this.images.paddle.src = './images/paddle.webp';
  }

  private setStartState(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    this.resetGame();
    this.initBricks();
    this.resetPaddle();
    this.paint();
    this.ctx.font = '50px ArcadeClassic';
    this.ctx.fillStyle = 'lime';
    this.ctx.fillText('PRESS START', this.canvas.width / 2 - 120, this.canvas.height / 2);
  };

  private play(): void {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    assertNotNullOrUndefined(this.game.requestId, 'game.requestId cannot be null or undefined');
    if(this.game.requestId && this.game.timeoutId) {
      cancelAnimationFrame(this.game.requestId);
      clearTimeout(this.game.timeoutId);
    }
    this.game.on = true;

    this.resetGame();
    this.resetBall();
    this.resetPaddle();
    this.initBricks();

    this.game.sfx && this.sounds.breakout.play();
    // Start music after starting sound ends.
    setTimeout(() => this.game?.music && this.sounds.music.play(), 2000);

    this.animate();
  }

  private resetGame(): void {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    this.game.speed = 7;
    this.game.score = 0;
    this.game.level = 1;
    this.game.lives = 3;
    this.game.time = { start: performance.now(), elapsed: 0, refreshRate: 16 };
  }

  private initSounds(): void {
    this.sounds.music.loop = true;
    this.sounds.ballLost.volume = 0.5;
    this.sounds.breakout.volume = 0.5;
    this.sounds.brick.volume = 0.5;
    this.sounds.gameOver.volume = 0.5;
    this.sounds.levelCompleted.volume = 0.5;
    this.sounds.music.volume = 0.5;
    this.sounds.paddle.volume = 0.5;
  }

  private resetBall(): void {
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');

    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height - this.paddle.height - 2 * this.ball.radius;
    this.ball.dx = this.game.speed * (Math.random() * 2 - 1);  // Random trajectory
    this.ball.dy = -this.game.speed; // Up
  }

  private resetPaddle(): void {
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');

    this.paddle.x = (this.canvas.width - this.paddle.width) / 2;
    this.paddle.dx = this.game.speed + 7;
  }

  private initBricks(): void {
    assertNotNullOrUndefined(this.brick, 'brick cannot be null or undefined');

    this.brickField = [];
    const topMargin = 30;
    const colors = ['red', 'orange', 'yellow', 'blue', 'green'];

    for(let row = 0;row < this.brick.rows;row++) {
      for(let col = 0;col < this.brick.cols;col++) {
        this.brickField.push({
          x: col * this.brick.width,
          y: row * this.brick.height + topMargin,
          height: this.brick.height,
          width: this.brick.width,
          color: colors[row],
          points: (5 - row) * 2,
          hitsLeft: row === 0 ? 2 : 1
        });
      }
    }
  }

  private animate(now = 0): void {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');

    this.game.time.elapsed = now - this.game.time.start;
    if(this.game.time.elapsed > this.game.time.refreshRate) {
      this.game.time.start = now;

      this.paint();
      this.update();
      this.detectCollision();
      this.detectBrickCollision();

      if(this.isLevelCompleted() || this.isGameOver()) return;
    }

    this.game.requestId = requestAnimationFrame(this.animate);
  }

  private paint(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'ball cannot be null or undefined');

    this.ctx.drawImage(this.images.background, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.images.ball, this.ball.x, this.ball.y, 2 * this.ball.radius, 2 * this.ball.radius);
    this.ctx.drawImage(this.images.paddle, this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    this.drawBricks();
    this.drawScore();
    this.drawLives();
  }

  private update(): void {
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    if(this.game.rightKey) {
      this.paddle.x += this.paddle.dx;
      if(this.paddle.x + this.paddle.width > this.canvas.width) {
        this.paddle.x = this.canvas.width - this.paddle.width;
      }
    }
    if(this.game.leftKey) {
      this.paddle.x -= this.paddle.dx;
      if(this.paddle.x < 0) {
        this.paddle.x = 0;
      }
    }
  }

  private drawBricks(): void {
    this.brickField.forEach((brick) => {
      if(brick.hitsLeft && this.ctx) {
        this.ctx.fillStyle = brick.color;
        this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
        this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      }
    });
  }

  private drawScore(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');

    this.ctx.font = '24px ArcadeClassic';
    this.ctx.fillStyle = 'white';
    const { level, score } = this.game;
    this.ctx.fillText(`Level: ${level}`, 5, 23);
    this.ctx.fillText(`Score: ${score}`, this.canvas.width / 2 - 50, 23);
  }

  private drawLives(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    if(this.game.lives > 2) { this.ctx.drawImage(this.images.paddle, this.canvas.width - 150, 9, 40, 13); }
    if(this.game.lives > 1) { this.ctx.drawImage(this.images.paddle, this.canvas.width - 100, 9, 40, 13); }
    if(this.game.lives > 0) { this.ctx.drawImage(this.images.paddle, this.canvas.width - 50, 9, 40, 13); }
  }

  private detectCollision() {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');

    const hitTop = () => !!this.ball && this.ball.y < 0;
    const hitLeftWall = () => !!this.ball && this.ball.x < 0;
    const hitRightWall = () => !!this.ball && !!this.canvas && this.ball.x + this.ball.radius * 2 > this.canvas.width;
    const hitPaddle = () =>
      this.ball && this.canvas && this.paddle &&
      this.ball.y + 2 * this.ball.radius > this.canvas.height - this.paddle.height &&
      this.ball.y + this.ball.radius < this.canvas.height &&
      this.ball.x + this.ball.radius > this.paddle.x &&
      this.ball.x + this.ball.radius < this.paddle.x + this.paddle.width;

    if(hitLeftWall()) {
      this.ball.dx = -this.ball.dx;
      this.ball.x = 0;
    }
    if(hitRightWall()) {
      this.ball.dx = -this.ball.dx;
      this.ball.x = this.canvas.width - 2 * this.ball.radius;
    }
    if(hitTop()) {
      this.ball.dy = -this.ball.dy;
      this.ball.y = 0;
    }
    if(hitPaddle()) {
      this.ball.dy = -this.ball.dy;
      this.ball.y = this.canvas.height - this.paddle.height - 2 * this.ball.radius;
      this.game.sfx && this.sounds.paddle.play();
      // TODO change this logic to angles with sin/cos
      // Change x depending on where on the paddle the ball bounces.
      // Bouncing ball more on one side draws ball a little to that side.
      const drawingConst = 5;
      const paddleMiddle = 2;
      const algo = (((this.ball.x - this.paddle.x) / this.paddle.width) * drawingConst);
      this.ball.dx = this.ball.dx + algo - paddleMiddle;
    }
  }

  private detectBrickCollision(): void {
    let directionChanged = false;
    const isBallInsideBrick = (brick: IBrickFieldBrick): boolean =>
      !!this.ball &&
      this.ball.x + 2 * this.ball.radius > brick.x &&
      this.ball.x < brick.x + brick.width &&
      this.ball.y + 2 * this.ball.radius > brick.y &&
      this.ball.y < brick.y + brick.height;

    this.brickField.forEach((brick) => {
      if(brick.hitsLeft && isBallInsideBrick(brick)) {
        this.sounds.brick.currentTime = 0;
        this.game?.sfx && this.sounds.brick.play();
        brick.hitsLeft--;
        if(brick.hitsLeft === 1) {
          brick.color = 'darkgray';
        }
        if(this.game) {
          this.game.score += brick.points;
        }

        if(!directionChanged) {
          directionChanged = true;
          this.detectCollisionDirection(brick);
        }
      }
    });
  }

  private detectCollisionDirection(brick: IBrickFieldBrick): void {
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');

    const hitFromLeft = (): boolean => !!this.ball && this.ball.x + 2 * this.ball.radius - this.ball.dx <= brick.x;
    const hitFromRight = (): boolean => !!this.ball && this.ball.x - this.ball.dx >= brick.x + brick.width;

    if(hitFromLeft() || hitFromRight()) {
      this.ball.dx = -this.ball.dx;
    } else { // Hit from above or below
      this.ball.dy = -this.ball.dy;
    }
  }

  private keyDownHandler(e: KeyboardEvent): void {
    if(!this.game?.on && e.key === ' ') {
      this.play();
    }
    if(this.game?.on && (e.key === 'm' || e.key === 'M')) {
      this.game.music = !this.game.music;
      this.game.music ? this.sounds.music.play() : this.sounds.music.pause();
    }
    if(this.game?.on && (e.key === 's' || e.key === 'S')) {
      this.game.sfx = !this.game.sfx;
    }
    if(e.key === 'ArrowUp') {
      this.volumeUp();
    }
    if(e.key === 'ArrowDown') {
      this.volumeDown();
    }
    if(this.game && e.key === 'ArrowRight') {
      this.game.rightKey = true;
    } else if(this.game && e.key === 'ArrowLeft') {
      this.game.leftKey = true;
    }
  }

  private keyUpHandler(e: KeyboardEvent): void {
    if(this.game && e.key === 'ArrowRight') {
      this.game.rightKey = false;
    } else if(this.game && e.key === 'ArrowLeft') {
      this.game.leftKey = false;
    }
  }

  private mouseMoveHandler(e: MouseEvent): void {
    const mouseX = e.clientX - (this.canvas?.offsetLeft ?? 0);
    const isInsideCourt = (): boolean => !!this.canvas && mouseX > 0 && mouseX < this.canvas.width;

    if(isInsideCourt() && this.paddle) {
      this.paddle.x = mouseX - this.paddle.width / 2;
    }
  }

  private isLevelCompleted(): boolean {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');

    const levelComplete = this.brickField.every((b) => b.hitsLeft === 0);

    if(levelComplete) {
      this.initNextLevel();
      this.resetBall();
      this.resetPaddle();
      this.initBricks();
      this.game.timeoutId = window.setTimeout(() => {
        this.animate();
        this.sounds.music.play();
      }, 3000);

      return true;
    }
    return false;
  }

  private initNextLevel(): void {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');

    this.game.level++;
    this.game.speed++;
    this.sounds.music.pause();
    this.game.sfx && this.sounds.levelCompleted.play();
    this.ctx.font = '50px ArcadeClassic';
    this.ctx.fillStyle = 'yellow';
    this.ctx.fillText(`LEVEL ${this.game.level}!`, this.canvas.width / 2 - 80, this.canvas.height / 2);
  }

  private isGameOver(): boolean {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');

    const isBallLost = (): boolean => !!this.ball && !!this.canvas && this.ball.y - this.ball.radius > this.canvas.height;

    if(isBallLost()) {
      this.game.lives -= 1;
      this.game.sfx && this.sounds.ballLost.play();
      if(this.game.lives === 0) {
        this.gameOver();
        return true;
      }
      this.resetBall();
      this.resetPaddle();
    }
    return false;
  }

  private gameOver(): void {
    assertNotNullOrUndefined(this.game, 'game cannot be null or undefined');
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');

    this.game.on = false;
    this.sounds.music.pause();
    this.sounds.music.currentTime = 0;
    this.game.sfx && this.sounds.gameOver.play();
    this.ctx.font = '50px ArcadeClassic';
    this.ctx.fillStyle = 'red';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2 - 100, this.canvas.height / 2);
  }

  private volumeDown() {
    if(this.sounds.music.volume >= 0.1) {
      for(const [key] of Object.entries(this.sounds)) {
        this.sounds[key].volume -= 0.1;
      }
    }
  }


  private volumeUp() {
    if(this.sounds.music.volume <= 0.9) {
      for(const [key] of Object.entries(this.sounds)) {
        this.sounds[key].volume += 0.1;
      }
    }
  }
}
