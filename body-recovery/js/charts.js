// Jednoduché SVG grafy kreslené v měřítku, barvy z CSS tokenů.
window.Charts = (function () {
  const esc = s => String(s).replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  // Sloupce: tréninky za týden s čárou cíle.
  function weeklyBars(weeks, goal) {
    const W = 340, H = 150, padL = 26, padR = 8, padT = 12, padB = 28;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const max = Math.max(goal, ...weeks.map(w => w.count)) + 1;
    const y = v => padT + innerH - (v / max) * innerH;
    const n = weeks.length, slot = innerW / n, bw = Math.min(28, slot * 0.6);

    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tréninky za týden">`;
    for (let v = 0; v <= max; v++) {
      s += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
      s += `<text x="${padL - 6}" y="${y(v) + 3.5}" class="tick" text-anchor="end">${v}</text>`;
    }
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y(goal)}" y2="${y(goal)}" class="goal"/>`;
    s += `<text x="${W - padR}" y="${y(goal) - 4}" class="tick goal-label" text-anchor="end">cíl ${goal}</text>`;
    weeks.forEach((w, i) => {
      const x = padL + slot * i + (slot - bw) / 2;
      const h = Math.max(0, y(0) - y(w.count));
      const cls = w.count >= goal ? "bar hit" : (w.current ? "bar current" : "bar");
      s += `<rect x="${x}" y="${y(w.count)}" width="${bw}" height="${h}" rx="4" class="${cls}"/>`;
      if (w.count > 0) s += `<text x="${x + bw / 2}" y="${y(w.count) - 4}" class="val" text-anchor="middle">${w.count}</text>`;
      s += `<text x="${x + bw / 2}" y="${H - 10}" class="tick" text-anchor="middle">${esc(w.label)}</text>`;
    });
    return s + "</svg>";
  }

  // Čára: bolest po tréninku (0–10).
  function painLine(points) {
    const W = 340, H = 130, padL = 26, padR = 10, padT = 10, padB = 24;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const y = v => padT + innerH - (v / 10) * innerH;
    const n = points.length;
    const x = i => n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW;

    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bolest po tréninku">`;
    [0, 2, 4, 6, 8, 10].forEach(v => {
      s += `<line x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>`;
      s += `<text x="${padL - 6}" y="${y(v) + 3.5}" class="tick" text-anchor="end">${v}</text>`;
    });
    s += `<rect x="${padL}" y="${y(10)}" width="${innerW}" height="${y(5) - y(10)}" class="zone-bad"/>`;
    if (n) {
      const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.pain).toFixed(1)}`).join(" ");
      const area = `${path} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
      s += `<path d="${area}" class="area"/><path d="${path}" class="line"/>`;
      points.forEach((p, i) => {
        s += `<circle cx="${x(i)}" cy="${y(p.pain)}" r="${i === n - 1 ? 4.5 : 3}" class="dot${i === n - 1 ? " last" : ""}"/>`;
      });
      const step = Math.ceil(n / 6);
      points.forEach((p, i) => {
        if (i % step === 0 || i === n - 1) s += `<text x="${x(i)}" y="${H - 8}" class="tick" text-anchor="middle">${esc(p.label)}</text>`;
      });
    }
    return s + "</svg>";
  }

  // Kruhový ukazatel: tréninky tento týden vs. cíl.
  function ring(count, goal) {
    const r = 34, c = 2 * Math.PI * r, frac = Math.min(1, goal ? count / goal : 0);
    return `<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="${count} z ${goal} tréninků tento týden">
      <circle cx="42" cy="42" r="${r}" class="ring-bg"/>
      <circle cx="42" cy="42" r="${r}" class="ring-fg${frac >= 1 ? " done" : ""}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - frac)}" transform="rotate(-90 42 42)"/>
      <text x="42" y="40" class="ring-num" text-anchor="middle">${count}</text>
      <text x="42" y="56" class="ring-sub" text-anchor="middle">z ${goal}</text>
    </svg>`;
  }

  return { weeklyBars, painLine, ring };
})();
