export class Game {
  public requestId: number = 1;
  public timeoutId: number | null = null;
  public on: boolean = false;
  public speed = 7;
  public score = 0;
  public level = 1;
  public lives = 3;
  public time = { start: performance.now(), elapsed: 0, refreshRate: 16 };
  public leftKey: boolean = false;
  public rightKey: boolean = false;
}