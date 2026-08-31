const svg = (body, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;

export const icons = {
  menu: svg('<path d="M3 6h18M3 12h18M3 18h18"/>', 30),
  back: svg('<path d="m15 4-8 8 8 8"/>', 30),
  arrow: svg('<path d="M5 12h14m-5-5 5 5-5 5"/>', 30),
  chevron: svg('<path d="m7 14 5-5 5 5"/>', 24),
  diamond: '<span class="diamond" aria-hidden="true"></span>',
};
