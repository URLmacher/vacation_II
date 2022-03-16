import { autoinject } from 'aurelia-framework';
import { texts } from '../data/texts';
import { KeyboardKey, SubscriptionManager, SubscriptionManagerService } from '../../services/SubscriptionManagerService';
import { assertNotNullOrUndefined } from '../../utils/assert';

interface IBrickInfo {
  w: number;
  h: number;
  padding: number;
  offsetX: number;
  offsetY: number;
  visible: boolean;
}

interface IBrick extends IBrickInfo {
  x: number;
  y: number;
}

interface IBall {
  x: number;
  y: number;
  size: number;
  speed: number;
  dx: number;
  dy: number;
  visible: boolean;
}

interface IPaddle {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  dx: number;
  visible: boolean;
}

@autoinject()
export class GoodGame {
  private element: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private subscriptionManager: SubscriptionManager;

  private score = 0;
  private brickRowCount = 9;
  private brickColumnCount = 5;
  private delay = 500;
  private timeoutId: number = 0;
  private requestId: number = 0;

  private overlayVisible = true;
  private texts = texts;

  private ball: IBall | null = null;
  private paddle: IPaddle | null = null;
  private bricks: IBrick[][] = [];

  constructor(
    subscriptionManagerService: SubscriptionManagerService,
    element: Element
  ) {
    this.element = element as HTMLElement;
    this.subscriptionManager = subscriptionManagerService.createSubscriptionManager();
  }

  protected attached(): void {
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    this.ctx = this.canvas.getContext('2d');
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');

    if(this.requestId && this.timeoutId) {
      cancelAnimationFrame(this.requestId);
      clearTimeout(this.timeoutId);
    }

    this.updateSizes();
    this.update();

    // Keyboard event handlers
    this.subscriptionManager.subscribeToDomEvent(window, 'keydown', (e) => this.keyDownHandler(e as KeyboardEvent));
    this.subscriptionManager.subscribeToDomEvent(window, 'keyup', (e) => this.keyUpHandler(e as KeyboardEvent));
    this.subscriptionManager.subscribeToDomEvent(window, 'mousemove', (e) => this.mouseMoveHandler(e as MouseEvent));
    this.subscriptionManager.subscribeToResize(() => { this.updateSizes(); });
  }

  protected detached(): void {
    this.subscriptionManager.disposeSubscriptions();
  }

  private startGame(): void {
    this.overlayVisible = false;
  }

  private updateSizes(): void {
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    const { width } = this.element.getBoundingClientRect();
    const heightRatio = 1.2;
    this.canvas.width = width / 2;
    this.canvas.height = this.canvas.width * heightRatio;

    // Create ball props
    this.ball = {
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      size: this.canvas.width / 50,
      speed: 4,
      dx: 4,
      dy: -4,
      visible: true
    };

    // Create paddle props
    const paddleHeight = (this.canvas.height / 20);
    const paddleWidth = this.canvas.width / 2;
    this.paddle = {
      x: (this.canvas.width / 2) - (paddleWidth / 2),
      y: this.canvas.height - paddleHeight,
      w: paddleWidth,
      h: paddleHeight,
      speed: 8,
      dx: 0,
      visible: true
    };


    // Create brick props
    const padding = (this.canvas.width / this.brickColumnCount) / 20;
    const brickWidth = (this.canvas.width / this.brickColumnCount) - (padding);
    const brickHeight = (this.canvas.height / this.brickRowCount) / 4;

    const brickInfo: IBrickInfo = {
      w: brickWidth,
      h: brickHeight,
      padding: padding,
      offsetX: padding / 2,
      offsetY: brickHeight * 2,
      visible: true
    };

    // Create bricks
    for(let i = 0;i < this.brickColumnCount;i++) {
      this.bricks[i] = this.bricks[i] ?? [];

      for(let j = 0;j < this.brickRowCount;j++) {
        const x = i * (brickInfo.w + brickInfo.padding) + brickInfo.offsetX;
        const y = j * (brickInfo.h + brickInfo.padding) + brickInfo.offsetY;
        this.bricks[i][j] = { x, y, ...brickInfo };
      }
    }
  }

  private mouseMoveHandler(e: MouseEvent): void {
    const mouseX = e.clientX - (this.canvas?.getBoundingClientRect().left ?? 0);
    const isInsideCourt = (): boolean => !!this.canvas && mouseX > 0 && mouseX < this.canvas.width;
    if(isInsideCourt() && this.paddle) {
      this.paddle.x = mouseX - this.paddle.w / 2;
    }
  }

  // Keyup event
  private keyUpHandler(e: KeyboardEvent): void {
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');

    if(
      e.key === KeyboardKey.ArrowRight ||
      e.key === KeyboardKey.ArrowLeft
    ) {
      this.paddle.dx = 0;
    }
  }

  // Keydown event
  private keyDownHandler(e: KeyboardEvent): void {
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');

    if(e.key === KeyboardKey.ArrowRight) {
      this.paddle.dx = this.paddle.speed;
    } else if(e.key === KeyboardKey.ArrowLeft) {
      this.paddle.dx = -this.paddle.speed;
    }
  }

  // Update canvas drawing and animation
  private update(): void {
    this.movePaddle();
    this.moveBall();

    // Draw everything
    this.draw();

    this.requestId = requestAnimationFrame(this.update.bind(this));
  }

  // Draw everything
  private draw(): void {
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');

    // clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBall();
    this.drawPaddle();
    this.drawScore();
    this.drawBricks();
  }

  // Make all bricks appear
  private showAllBricks() {
    this.bricks.forEach(column => {
      column.forEach(brick => (brick.visible = true));
    });
  }

  // Increase score
  private increaseScore(): void {
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');

    this.score++;

    if(this.score % (this.brickRowCount * this.brickColumnCount) === 0) {

      this.ball.visible = false;
      this.paddle.visible = false;

      //After 0.5 sec restart the game
      this.timeoutId = window.setTimeout(() => {
        assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');
        assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');
        assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');

        this.showAllBricks();
        this.updateSizes();
        this.score = 0;
        this.ball.visible = true;
        this.paddle.visible = true;
      }, this.delay);
    }
  }

  // Move ball on canvas
  private moveBall(): void {
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');

    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Wall collision (right/left)
    if(this.ball.x + this.ball.size > this.canvas.width || this.ball.x - this.ball.size < 0) {
      this.ball.dx *= -1; // ball.dx = ball.dx * -1
    }

    // Wall collision (top/bottom)
    if(this.ball.y + this.ball.size > this.canvas.height || this.ball.y - this.ball.size < 0) {
      this.ball.dy *= -1;
    }

    // Paddle collision
    if(
      this.ball.x - this.ball.size > this.paddle.x &&
      this.ball.x + this.ball.size < this.paddle.x + this.paddle.w &&
      this.ball.y + this.ball.size > this.paddle.y
    ) {
      this.ball.dy = -this.ball.speed;
    }

    // Brick collision
    this.bricks.forEach(column => {
      column.forEach(brick => {
        assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');

        if(brick.visible) {
          if(
            this.ball.x - this.ball.size > brick.x && // left brick side check
            this.ball.x + this.ball.size < brick.x + brick.w && // right brick side check
            this.ball.y + this.ball.size > brick.y && // top brick side check
            this.ball.y - this.ball.size < brick.y + brick.h // bottom brick side check
          ) {
            this.ball.dy *= -1;
            brick.visible = false;

            this.increaseScore();
          }
        }
      });
    });

    // Hit bottom wall - Lose
    if(this.ball.y + this.ball.size > this.canvas.height) {
      this.showAllBricks();
      this.score = 0;
    }
  }

  // Move paddle on canvas
  private movePaddle(): void {
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');

    this.paddle.x += this.paddle.dx;

    // Wall detection
    if(this.paddle.x + this.paddle.w > this.canvas.width) {
      this.paddle.x = this.canvas.width - this.paddle.w;
    }

    if(this.paddle.x < 0) {
      this.paddle.x = 0;
    }
  }

  // Draw bricks on canvas
  private drawBricks(): void {
    this.bricks.forEach(column => {
      column.forEach(brick => {
        assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');

        this.ctx.beginPath();
        this.ctx.rect(brick.x, brick.y, brick.w, brick.h);
        this.ctx.fillStyle = brick.visible ? '#0095dd' : 'transparent';
        this.ctx.fill();
        this.ctx.closePath();
      });
    });
  }

  // Draw score on canvas
  private drawScore(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.canvas, 'canvas cannot be null or undefined');

    this.ctx.font = `${this.canvas.width / 30}px Arial`;
    this.ctx.fillText(`Score: ${this.score}`, (this.canvas.width / 100), (this.canvas.height / 30));
  }

  // Draw ball on canvas
  private drawBall(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.ball, 'ball cannot be null or undefined');

    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.size, 0, Math.PI * 2);
    this.ctx.fillStyle = this.ball.visible ? '#0095dd' : 'transparent';
    this.ctx.fill();
    this.ctx.closePath();
  }

  // Draw paddle on canvas
  private drawPaddle(): void {
    assertNotNullOrUndefined(this.ctx, 'ctx cannot be null or undefined');
    assertNotNullOrUndefined(this.paddle, 'paddle cannot be null or undefined');

    this.ctx.beginPath();
    this.ctx.rect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);
    this.ctx.fillStyle = this.paddle.visible ? '#0095dd' : 'transparent';
    this.ctx.fill();
    this.ctx.closePath();
  }
}
