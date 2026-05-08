const ICONS = {
  crosshair:
    '<circle cx="12" cy="12" r="8"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><circle cx="12" cy="12" r="2"></circle>',
  download:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M7 10l5 5 5-5"></path><path d="M12 15V3"></path>',
  fish:
    '<path d="M6.5 12c3.5-4.5 8.5-6 14.5-3-1.2 1.8-2.7 3.1-4.5 4 1.8.9 3.3 2.2 4.5 4-6 3-11 1.5-14.5-3L3 17V7l3.5 5Z"></path><circle cx="16" cy="10.5" r=".8"></circle>',
  "map-pin":
    '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>',
  "maximize-2":
    '<path d="M15 3h6v6"></path><path d="M21 3l-7 7"></path><path d="M9 21H3v-6"></path><path d="M3 21l7-7"></path>',
  plus: '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
  "rotate-ccw":
    '<path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 3v6h6"></path>',
  sparkles:
    '<path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"></path><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"></path><path d="M5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8L5 14Z"></path>',
  "trash-2":
    '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 15H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
  upload:
    '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="M17 8l-5-5-5 5"></path><path d="M12 3v12"></path>',
};

function createIcons() {
  document.querySelectorAll("[data-lucide]").forEach((node) => {
    const name = node.getAttribute("data-lucide");
    const paths = ICONS[name];
    if (!paths) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = paths;
    node.replaceWith(svg);
  });
}

window.lucide = { createIcons };
