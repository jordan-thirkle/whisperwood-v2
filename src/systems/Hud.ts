export class Hud {
  private readonly scoreValue = this.getElement('#score-value');
  private readonly targetValue = this.getElement('#target-value');
  private readonly timerValue = this.getElement('#timer-value');
  private readonly statusLine = this.getElement('#status-line');

  setTarget(target: number): void {
    this.targetValue.textContent = String(target);
  }

  update(score: number, target: number, elapsed: number, complete: boolean): void {
    this.scoreValue.textContent = String(score);
    this.targetValue.textContent = String(target);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = Math.floor(elapsed % 60).toString().padStart(2, '0');
    this.timerValue.textContent = `${minutes}:${seconds}`;
    this.statusLine.textContent = complete ? '✨ Forest complete!' : '🌿 Explore the forest';
  }

  flashPickup(): void {
    this.statusLine.animate(
      [
        { transform: 'translateY(0)', borderLeftColor: '#f0d890' },
        { transform: 'translateY(-3px)', borderLeftColor: '#4a8a3a' },
        { transform: 'translateY(0)', borderLeftColor: '#f0d890' },
      ],
      { duration: 220, easing: 'ease-out' },
    );
  }

  private getElement(selector: string): HTMLElement {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Missing HUD element: ${selector}`);
    return element;
  }
}
