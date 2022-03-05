export class Paddle {
  private canvas: HTMLCanvasElement;
  public height: number = 20;
  public width: number = 100;
  public x: number = 0;
  public y: number = 0;
  public dx: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public getY(): number {
    return this.canvas.height - this.height;
  }
}