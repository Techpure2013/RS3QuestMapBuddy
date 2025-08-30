interface Alt1Event<T = any> {
  subscribe(callback: (data: T) => void): void;
  unsubscribe(callback: (data: T) => void): void;
}

interface Alt1Events {
  [eventName: string]: Alt1Event;
  close: Alt1Event<void>;
  beforeclose: Alt1Event<{ cancel: boolean }>;
}

declare global {
  interface Window {
    alt1?: {
      events: Alt1Events;
      closeApp(): void;
      [key: string]: any;
    };
  }
}

// 5. This line turns the file into a "module," which is a requirement
//    for using `declare global`.
export {};
