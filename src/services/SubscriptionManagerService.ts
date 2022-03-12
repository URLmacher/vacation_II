import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, BindingEngine } from 'aurelia-framework';

export enum KeyboardKey {
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Enter = 'Enter',
  Escape = 'Escape',
  Space = 'Space',
  Tab = 'Tab'
}

export class SubscriptionManager {
  private subscriptions: Array<{ dispose: () => void; }> = [];

  constructor(
    private eventAggregator: EventAggregator,
    private bindingEngine: BindingEngine
  ) {}

  public subscribeToEvent(eventName: string, callback: (...args: Array<any>) => void): void {
    this.subscriptions.push(
      this.eventAggregator.subscribe(eventName, callback),
    );
  }

  public subscribeToProperty<T, TKey extends keyof T>(obj: T, propertyName: TKey, callback: (newValue: T[TKey], oldValue: T[TKey]) => void): void {
    this.subscriptions.push(this.bindingEngine
      .propertyObserver(obj, propertyName as string)
      .subscribe(callback));
  }

  public subscribeToDomEvent(element: GlobalEventHandlers, eventName: string, callback: TEventCallback): void {
    element.addEventListener(eventName, callback);
    this.subscriptions.push({
      dispose: () => element.removeEventListener(eventName, callback),
    });
  }

  public subscribeToClickOutside(element: HTMLElement, callback: () => void): void {
    this.subscribeToDomEvent(window, 'click', (e: Event) => {
      if(e.target instanceof Element && e.target.isConnected && !element.contains(e.target)) {
        callback();
      }
    });
  }

  public subscribeToMouseDownOutside(element: HTMLElement, callback: () => void): void {
    this.subscribeToDomEvent(window, 'mousedown', (e: Event) => {
      if(e.target instanceof Element && e.target.isConnected && !element.contains(e.target)) {
        callback();
      }
    });
  }

  public subscribeToKeyboardEvent(element: GlobalEventHandlers, key: KeyboardKey, callback: () => void | boolean): void {
    this.subscribeToDomEvent(element, 'keydown', (e: Event) => {
      const event = e as KeyboardEvent;
      if(event.key === key) {
        return callback();
      }
      return false;
    });
  }

  public subscribeToResize(callback: () => void): void {
    window.addEventListener('resize', callback);

    this.subscriptions.push({
      dispose: () => window.removeEventListener('resize', callback),
    });
  }

  public disposeSubscriptions(): void {
    this.subscriptions.forEach(sub => sub.dispose());
    this.subscriptions.length = 0;
  }
}

@autoinject()
export class SubscriptionManagerService {

  constructor(
    private eventAggregator: EventAggregator,
    private bindingEngine: BindingEngine
  ) {}

  public createSubscriptionManager(): SubscriptionManager {
    return new SubscriptionManager(this.eventAggregator, this.bindingEngine);
  }
}

export type TEventCallback = (arg0: Event) => void;
