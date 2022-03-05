export class Brick {
  public rows: number = 5;
  public cols: number = 10;
  public height: number = 30;
  public width: number = 30;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  public getWidth(): number {
    return this.canvas.width / this.cols;
  }
}