import type { Animated } from "react-native";

/** Pauses at the current native values. Resume rebuilds just the interrupted beat,
 * never calls a cancelled callback, and never replays completed beats/side effects.
 */
export class AnimationQueue {
  private current: { create: () => Animated.CompositeAnimation; done: () => void } | null = null;
  private animation: Animated.CompositeAnimation | null = null;
  private paused = false;
  private generation = 0;
  run(create: () => Animated.CompositeAnimation, done: () => void) {
    this.stop();
    this.current = { create, done };
    this.start();
  }
  private start() {
    if (this.paused || !this.current) return;
    const generation = ++this.generation;
    const step = this.current;
    this.animation = step.create();
    this.animation.start(({ finished }) => {
      if (generation !== this.generation || !finished) return;
      this.current = null;
      this.animation = null;
      step.done();
    });
  }
  pause(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) { this.generation++; this.animation?.stop(); }
    else this.start();
  }
  stop() { this.generation++; this.current = null; this.animation?.stop(); this.animation = null; }
}
