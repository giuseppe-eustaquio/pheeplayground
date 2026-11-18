import { loadCss } from "../shared.js";

export async function mount(container) {
  await loadCss(new URL("./game.css", import.meta.url));

  const root = document.createElement("div");
  root.className = "dh";
  root.innerHTML = `
    <div class="dh-toolbar">
      <p><strong>Welcome home, Giuseppe.</strong><span> Phee and all your favourite things have arrived.</span></p>
      <button type="button" class="button dh-reset">Reset room</button>
    </div>
    <div class="dh-room" aria-label="A furnished, two-storey living room" role="img">
      <div class="dh-ceiling-window">
        <i></i><i></i><i></i><i></i>
      </div>

      <div class="dh-upper">
        <div class="dh-balcony">
          <span class="dh-rail rail-a"></span>
          <span class="dh-rail rail-b"></span>
          <span class="dh-rail rail-c"></span>
          <div class="dh-stairs"></div>
        </div>
      </div>

      <div class="dh-back-wall">
        <button class="dh-item dh-shelf" type="button" data-note="A shelf for ideas, automations, and stories">
          <span class="shelf-top"></span>
          <span class="book b1"></span><span class="book b2"></span><span class="book b3"></span>
          <span class="book b4"></span><span class="book b5"></span>
          <span class="shelf-object">&#9881;</span>
        </button>
        <button class="dh-item dh-window" type="button" data-note="A bright window for a sunny Phee nap">
          <span class="pane pane-left"></span><span class="pane pane-right"></span>
        </button>
        <button class="dh-item dh-art" type="button" data-note="Phee, the unofficial head of the household">
          <img src="../../images/phee/phee.jpg" alt="" />
        </button>
      </div>

      <button class="dh-item dh-dogbed" type="button" data-note="Phee's prime spot">
        <span class="dh-dog"><img src="../../images/phee/phee4.jpg" alt="" /></span>
        <span class="dh-bed"><i></i></span>
      </button>

      <button class="dh-item dh-chess" type="button" data-note="One-player chess is always ready">
        <span class="dh-tabletop"></span>
        <span class="dh-table-leg left"></span><span class="dh-table-leg right"></span>
        <span class="dh-board">
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
        </span>
        <span class="chess-piece king">&#9818;</span>
        <span class="chess-piece rook">&#9814;</span>
      </button>

      <button class="dh-item dh-desk" type="button" data-note="A quiet desk for AI-assisted making">
        <span class="monitor"><i>&lt;/&gt;</i></span>
        <span class="desk-top"></span>
        <span class="desk-leg leg-left"></span><span class="desk-leg leg-right"></span>
        <span class="chair"></span>
        <span class="desk-paw">&#9675;</span>
      </button>

      <button class="dh-item dh-sofa" type="button" data-note="A soft corner for games and movie nights">
        <span class="sofa-back"></span><span class="sofa-seat"></span>
        <span class="sofa-arm arm-left"></span><span class="sofa-arm arm-right"></span>
        <span class="cushion c1"></span><span class="cushion c2"></span>
      </button>

      <button class="dh-item dh-plant plant-left" type="button" data-note="Fresh greenery for the working garden">
        <span class="plant-pot"></span><span class="leaf l1"></span><span class="leaf l2"></span>
        <span class="leaf l3"></span><span class="leaf l4"></span>
      </button>
      <button class="dh-item dh-plant plant-right" type="button" data-note="A little jungle in the corner">
        <span class="plant-pot"></span><span class="leaf l1"></span><span class="leaf l2"></span>
        <span class="leaf l3"></span><span class="leaf l4"></span>
      </button>

      <p class="dh-note" aria-live="polite" data-note-output></p>
    </div>`;
  container.append(root);

  const note = root.querySelector("[data-note-output]");
  const onItem = (event) => {
    const item = event.currentTarget;
    root.querySelectorAll(".dh-item").forEach((el) => el.classList.remove("is-selected"));
    item.classList.add("is-selected");
    note.textContent = item.dataset.note;
  };
  root.querySelectorAll(".dh-item").forEach((item) => item.addEventListener("click", onItem));

  const reset = root.querySelector(".dh-reset");
  reset.addEventListener("click", () => {
    root.querySelectorAll(".dh-item").forEach((item) => item.classList.remove("is-selected"));
    note.textContent = "Room reset - everything is right where it belongs.";
  });

  return {
    destroy() {
      root.remove();
    },
  };
}
