import type { Pointer } from "./types";

function makePointer(id: number): Pointer {
  return {
    id,
    down: false,
    moved: false,
    texcoordX: 0,
    texcoordY: 0,
    prevTexcoordX: 0,
    prevTexcoordY: 0,
    deltaX: 0,
    deltaY: 0,
    color: [1, 1, 1],
  };
}

// junta mouse e toque num só tipo de ponteiro, já em coordenadas normalizadas
// com deltas; o loop principal consome os ponteiros ativos
export class InputManager {
  readonly pointers: Pointer[] = [];
  private canvas: HTMLCanvasElement;
  private colorFor: () => [number, number, number];

  constructor(
    canvas: HTMLCanvasElement,
    colorFor: () => [number, number, number]
  ) {
    this.canvas = canvas;
    this.colorFor = colorFor;
    this.pointers.push(makePointer(-1)); // o mouse
    this.attach();
  }

  private getPointer(id: number): Pointer {
    let p = this.pointers.find((x) => x.id === id);
    if (!p) {
      p = makePointer(id);
      this.pointers.push(p);
    }
    return p;
  }

  private updatePosition(p: Pointer, clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    p.prevTexcoordX = p.texcoordX;
    p.prevTexcoordY = p.texcoordY;
    p.texcoordX = x;
    p.texcoordY = y;
    p.deltaX = this.correctDeltaX(x - p.prevTexcoordX);
    p.deltaY = this.correctDeltaY(y - p.prevTexcoordY);
    p.moved = Math.abs(p.deltaX) > 0 || Math.abs(p.deltaY) > 0;
  }

  private correctDeltaX(delta: number): number {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    return aspect < 1 ? delta * aspect : delta;
  }

  private correctDeltaY(delta: number): number {
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    return aspect > 1 ? delta / aspect : delta;
  }

  private startPointer(p: Pointer, clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    p.down = true;
    p.moved = true; // garante que o clique já aplica algo
    p.texcoordX = x;
    p.texcoordY = y;
    p.prevTexcoordX = x;
    p.prevTexcoordY = y;
    p.deltaX = 0;
    p.deltaY = 0;
    p.color = this.colorFor();
  }

  private attach(): void {
    const c = this.canvas;
    const target = window;

    // mouse
    c.addEventListener("mousedown", (e) => {
      const p = this.getPointer(-1);
      this.startPointer(p, e.clientX, e.clientY);
    });
    target.addEventListener("mousemove", (e) => {
      const p = this.getPointer(-1);
      if (!p.down) return;
      this.updatePosition(p, e.clientX, e.clientY);
    });
    target.addEventListener("mouseup", () => {
      this.getPointer(-1).down = false;
    });

    // toque
    c.addEventListener(
      "touchstart",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          const p = this.getPointer(t.identifier);
          this.startPointer(p, t.clientX, t.clientY);
        }
      },
      { passive: false }
    );
    c.addEventListener(
      "touchmove",
      (e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          const p = this.getPointer(t.identifier);
          if (!p.down) continue;
          this.updatePosition(p, t.clientX, t.clientY);
        }
      },
      { passive: false }
    );
    const endTouch = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const p = this.pointers.find((x) => x.id === t.identifier);
        if (p) p.down = false;
      }
    };
    target.addEventListener("touchend", endTouch);
    target.addEventListener("touchcancel", endTouch);
  }
}
