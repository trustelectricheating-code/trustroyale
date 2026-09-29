import "./styles/assets.css";

type Group = "background" | "cabinet" | "symbols" | "faces" | "emblem" | "fx" | "ui" | "fonts" | "audio";
type AssetEntry = {
  key: string;
  group: Group;
  file: string;
  status: "needed" | "placeholder" | "draft" | "approved";
  source: "supplied" | "generated" | "cc0" | "licensed" | "custom";
  licence?: string;
  sourceUrl: string | null;
  notes?: string;
};
type Manifest = { version: 1; groups: Group[]; assets: AssetEntry[] };

const board = document.querySelector<HTMLElement>("#asset-board")!;
const label = (value: string) => value.replaceAll(".", " · ").replace(/([a-z])([A-Z])/g, "$1 $2");
const assetUrl = (entry: AssetEntry) => `/assets/${entry.file}`;

function meta(entry: AssetEntry): string {
  const source = entry.sourceUrl
    ? `<a href="${entry.sourceUrl}" target="_blank" rel="noreferrer">${entry.source}</a>`
    : entry.source;
  return `<div class="asset-card__meta"><span>${source}</span><span>${entry.licence ?? "Owner supplied"}</span></div>${entry.notes ? `<p>${entry.notes}</p>` : ""}`;
}

function imageCard(entry: AssetEntry): string {
  return `<article class="asset-card" data-asset-key="${entry.key}">
    <div class="asset-card__head"><code>${entry.key}</code><span class="status status--${entry.status}">${entry.status}</span></div>
    <div class="asset-card__preview"><img src="${assetUrl(entry)}" alt="${label(entry.key)}"></div>
    ${meta(entry)}
  </article>`;
}

function fontCard(entry: AssetEntry): string {
  const family = entry.key === "font.display" ? "Trust Royale Display" : "Trust Royale UI";
  return `<article class="asset-card" data-asset-key="${entry.key}">
    <div class="asset-card__head"><code>${entry.key}</code><span class="status status--${entry.status}">${entry.status}</span></div>
    <div class="font-preview" style="font-family:'${family}'">Trust Royale<br><small>Heating for humans · 20% OFF</small></div>
    ${meta(entry)}
  </article>`;
}

function audioCard(entry: AssetEntry): string {
  return `<article class="asset-card asset-card--audio" data-asset-key="${entry.key}">
    <div class="asset-card__head"><code>${entry.key}</code><span class="status status--${entry.status}">${entry.status}</span></div>
    <button class="audio-button" type="button" data-audio-key="${entry.key}" data-audio-file="${entry.file}"><span aria-hidden="true">▶</span> Play preview</button>
    ${meta(entry)}
  </article>`;
}

function faceRows(entries: AssetEntry[]): string {
  return ["scott", "fiona", "gia", "keith"].map((person) => {
    const frames = entries.filter((entry) => entry.key.startsWith(`face.${person}.`));
    const idle = frames.find((entry) => entry.key.endsWith(".idle"))!;
    return `<article class="face-row">
      <header><h3>${person}</h3><div class="blink-preview"><img src="${assetUrl(idle)}" alt="${person} live blink preview" data-blink-person="${person}"><span>Live blink</span></div></header>
      <div class="face-row__frames">${frames.map(imageCard).join("")}</div>
    </article>`;
  }).join("");
}

function emblemSection(entries: AssetEntry[]): string {
  const idle = entries.find((entry) => entry.key === "emblem.neos.idle")!;
  const pulse = entries.find((entry) => entry.key === "emblem.neos.pulse")!;
  return `<div class="asset-grid">${entries.map(imageCard).join("")}</div>
    <figure class="pulse-preview"><div><img src="${assetUrl(idle)}" alt="Neos medallion pulse preview"><img class="pulse-preview__rings" src="${assetUrl(pulse)}" alt=""></div><figcaption>Live heat-ring pulse</figcaption></figure>`;
}

async function render(): Promise<void> {
  const response = await fetch("/assets/manifest.json");
  if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
  const manifest = await response.json() as Manifest;
  const count = manifest.assets.length;
  board.innerHTML = `<header class="board-hero"><div class="board-hero__eyebrow">Gate C · asset production</div><h1><span>trust</span> ROYALE</h1><p>${count} manifest entries ready for owner review. All statuses remain draft.</p><div class="board-hero__rule" aria-hidden="true"></div></header>
    ${manifest.groups.map((group, index) => {
      const entries = manifest.assets.filter((entry) => entry.group === group);
      let content = `<div class="asset-grid">${entries.map((entry) => group === "fonts" ? fontCard(entry) : group === "audio" ? audioCard(entry) : imageCard(entry)).join("")}</div>`;
      if (group === "faces") content = faceRows(entries);
      if (group === "emblem") content = emblemSection(entries);
      return `<section class="asset-section" id="group-${group}"><header class="asset-section__head"><span>${String(index + 1).padStart(2, "0")}</span><h2>${group}</h2><b>${entries.length}</b></header>${content}</section>`;
    }).join("")}
    <footer>Local Gate C review · no assets approved yet</footer>`;

  const faceFrames = new Map<string, string[]>();
  for (const person of ["scott", "fiona", "gia", "keith"]) {
    faceFrames.set(person, ["idle", "half", "closed", "half", "idle"].map((frame) => `/assets/faces/${person}-${frame}.webp`));
  }
  for (const image of board.querySelectorAll<HTMLImageElement>("[data-blink-person]")) {
    const frames = faceFrames.get(image.dataset.blinkPerson!)!;
    let index = 0;
    window.setInterval(() => {
      index = (index + 1) % frames.length;
      image.src = frames[index];
    }, index === 0 ? 1500 : 110);
  }

  const sprite = await fetch("/assets/audio/sprite.json").then((result) => result.json()) as Record<string, [number, number]>;
  let active: HTMLAudioElement | null = null;
  let stopTimer = 0;
  board.addEventListener("click", (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>("[data-audio-key]");
    if (!button) return;
    active?.pause();
    window.clearTimeout(stopTimer);
    const key = button.dataset.audioKey!;
    const ambient = key === "sfx.ambient.loop";
    const webm = button.dataset.audioFile!;
    active = new Audio(`/assets/${webm}`);
    active.currentTime = ambient ? 0 : (sprite[key]?.[0] ?? 0) / 1000;
    void active.play();
    stopTimer = window.setTimeout(() => active?.pause(), ambient ? 5000 : (sprite[key]?.[1] ?? 1000));
  });
  document.documentElement.dataset.ready = "true";
}

render().catch((error: unknown) => {
  document.documentElement.dataset.error = error instanceof Error ? error.message : "Asset board failed";
  board.innerHTML = `<p class="board-error">Asset board failed to load.</p>`;
});
