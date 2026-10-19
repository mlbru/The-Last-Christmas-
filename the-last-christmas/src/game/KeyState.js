// Keyboard state kept in the DOM (not in Phaser) so that Phaser never swallows keys the HTML UI needs.

const LEFT = ['a', 'A', 'ArrowLeft'], RIGHT = ['d', 'D', 'ArrowRight'], UP = ['w', 'W', 'ArrowUp'], DOWN = ['s', 'S', 'ArrowDown'];

export class KeyState {
  constructor(target = window) {
    this.down = new Set();
    target.addEventListener('keydown', (e) => { this.down.add(e.key); });
    target.addEventListener('keyup', (e) => { this.down.delete(e.key); });
    target.addEventListener('blur', () => this.down.clear());
  }
  any(list) { return list.some((k) => this.down.has(k)); }
  get dx() { return (this.any(RIGHT) ? 1 : 0) - (this.any(LEFT) ? 1 : 0); }
  get dd() { return (this.any(DOWN) ? 1 : 0) - (this.any(UP) ? 1 : 0); }
  clear() { this.down.clear(); }
}
