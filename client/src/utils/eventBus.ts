
type EventCallback = (detail: any) => void;
const listeners: Record<string, EventCallback[]> = {};

export const eventBus = {
  on(event: string, callback: EventCallback) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(callback);
  },
  off(event: string, callback: EventCallback) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(cb => cb !== callback);
  },
  emit(event: string, detail: any) {
    if (listeners[event]) {
      listeners[event].forEach(cb => cb(detail));
    }
  }
};
