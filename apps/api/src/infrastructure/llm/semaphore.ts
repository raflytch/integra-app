/** Caps how many async tasks run at once; extra callers wait in FIFO order. */
export class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('Semaphore limit must be a positive integer');
    }
  }

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active < this.limit) this.active++;
    else await new Promise<void>((resolve) => this.waiting.push(resolve));

    try {
      return await task();
    } finally {
      // Hand the slot straight to the next waiter instead of releasing it,
      // so a new caller cannot slip in between and exceed the limit.
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}
