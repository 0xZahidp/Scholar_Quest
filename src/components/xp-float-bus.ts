type XpListener = (xp: number) => void;

let listeners: XpListener[] = [];

export function fireXp(amount: number) {
  listeners.forEach((listener) => listener(amount));
}

export function subscribeXp(listener: XpListener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
  };
}
