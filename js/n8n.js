// Renders the n8n workflow cards from n8n/workflows.json.
// The n8n-demo component (and each workflow's JSON) is only loaded when a card is opened.

const COMPONENT_URL =
  "https://cdn.jsdelivr.net/npm/@n8n_io/n8n-demo-component@1.0.20/n8n-demo.bundled.js";

let componentReady;
function loadComponent() {
  if (!componentReady) {
    componentReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "module";
      s.src = COMPONENT_URL;
      s.onload = resolve;
      s.onerror = () => reject(new Error("Could not load the n8n preview component."));
      document.head.appendChild(s);
    });
  }
  return componentReady;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function renderCard(item) {
  const card = el("article", "n8n-card");
  card.appendChild(el("h2", "", item.title));
  card.appendChild(el("p", "", item.summary));

  // Origin: honest about adapted vs. original work
  const origin = el("p", "n8n-origin");
  if (item.source) {
    origin.append("Adapted from ");
    const a = el("a", "", item.sourceLabel || "the original template");
    a.href = item.source;
    a.rel = "noopener";
    origin.appendChild(a);
  } else {
    origin.textContent = "Built from scratch";
  }
  card.appendChild(origin);

  if (item.changes && item.changes.length) {
    card.appendChild(el("p", "n8n-label", "What I changed"));
    const ul = el("ul");
    item.changes.forEach((c) => ul.appendChild(el("li", "", c)));
    card.appendChild(ul);
  }

  if (item.tools && item.tools.length) {
    const tags = el("ul", "n8n-tags");
    item.tools.forEach((t) => tags.appendChild(el("li", "", t)));
    card.appendChild(tags);
  }

  // Canvas preview, created on first open
  const details = el("details", "n8n-canvas");
  details.appendChild(el("summary", "", "View workflow"));
  const holder = el("div", "n8n-holder");
  details.appendChild(holder);

  details.addEventListener(
    "toggle",
    async () => {
      if (!details.open) return;
      holder.textContent = "Loading preview…";
      try {
        const [res] = await Promise.all([fetch(item.file), loadComponent()]);
        if (!res.ok) throw new Error(`Workflow file not found (${res.status}).`);
        const workflow = await res.json();
        const demo = document.createElement("n8n-demo");
        demo.setAttribute("workflow", JSON.stringify(workflow));
        holder.replaceChildren(demo);
      } catch (err) {
        holder.textContent = `${err.message} Try reloading, or open the file on GitHub.`;
      }
    },
    { once: true }
  );
  card.appendChild(details);

  if (item.repo) {
    const link = el("a", "", "Source on GitHub");
    link.href = item.repo;
    link.rel = "noopener";
    card.appendChild(link);
  }
  return card;
}

async function init() {
  const list = document.getElementById("n8n-list");
  try {
    const res = await fetch("n8n/workflows.json");
    if (!res.ok) throw new Error(`Manifest not found (${res.status}).`);
    const items = await res.json();
    list.replaceChildren(...items.map(renderCard));
  } catch (err) {
    list.textContent = `Couldn't load the workflow list. ${err.message}`;
  }
}

init();
