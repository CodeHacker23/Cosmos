export const getTypingDelayMs = (nextChar: string) => {
  if (nextChar === '\n') {
    return 420;
  }

  if (['.', '!', '?', ':'].includes(nextChar)) {
    return 240;
  }

  if ([',', ';'].includes(nextChar)) {
    return 165;
  }

  if (nextChar === ' ') {
    return 62;
  }

  if (/[A-ZА-Я\[]/.test(nextChar)) {
    return 88 + Math.floor(Math.random() * 74);
  }

  return 68 + Math.floor(Math.random() * 58);
};
