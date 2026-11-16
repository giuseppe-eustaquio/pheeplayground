import { loadCss } from "../shared.js";

const MIN_NUMBER = 1;
const MAX_NUMBER = 1_000_000;

function randomNumber() {
  return Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER;
}

export async function mount(container) {
  await loadCss(new URL("./game.css", import.meta.url));

  const root = document.createElement("section");
  root.className = "ng";
  root.innerHTML = `
    <div class="ng-panel">
      <div class="ng-topline">
        <p class="ng-eyebrow">The number machine</p>
        <p class="ng-round">Rounds played <strong data-rounds>0</strong></p>
      </div>

      <div class="ng-display" aria-hidden="true">
        <span class="ng-display-label">YOUR DESTINY</span>
        <output class="ng-number" data-secret>??????</output>
        <span class="ng-display-spark" data-spark></span>
      </div>

      <div class="ng-odds">
        <span class="ng-odds-badge" aria-hidden="true">1<br>SHOT</span>
        <p>One guess to find the machine's secret number. Pick anywhere between 1 and 1,000,000. Make it count.</p>
      </div>

      <form class="ng-form">
        <label for="ng-guess">Pick your number</label>
        <p class="ng-hint" id="ng-range">Any whole number from 1 to 1,000,000.</p>
        <div class="ng-controls">
          <input
            id="ng-guess"
            name="guess"
            type="text"
            placeholder="e.g. 482091"
            aria-describedby="ng-range"
            required
          >
          <button class="button ng-submit" type="submit">Lock it in <span aria-hidden="true">↗</span></button>
        </div>
      </form>

      <div class="ng-result" data-result role="status" aria-live="polite" hidden>
        <p class="ng-verdict" data-verdict></p>
        <p class="ng-explanation" data-explanation></p>
      </div>

      <div class="ng-footer">
        <span>ONE GUESS. ONE NUMBER. NO TAKE-BACKS.</span>
        <button class="ng-again" data-again type="button" hidden>Try another round <span aria-hidden="true">↻</span></button>
      </div>
    </div>`;
  container.append(root);

  const form = root.querySelector(".ng-form");
  const input = root.querySelector("#ng-guess");
  const submit = root.querySelector(".ng-submit");
  const secretOut = root.querySelector("[data-secret]");
  const roundsOut = root.querySelector("[data-rounds]");
  const result = root.querySelector("[data-result]");
  const verdict = root.querySelector("[data-verdict]");
  const explanation = root.querySelector("[data-explanation]");
  const again = root.querySelector("[data-again]");
  const spark = root.querySelector("[data-spark]");
  let rounds = 0;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.checkValidity()) {
      input.reportValidity();
      return;
    }

    const entered = input.value.trim();
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(entered)) {
      input.setCustomValidity("Enter a whole number, using commas only as thousands separators.");
      input.reportValidity();
      return;
    }

    const guess = Number(entered.replaceAll(",", ""));
    if (!Number.isSafeInteger(guess) || guess < MIN_NUMBER || guess > MAX_NUMBER) {
      input.setCustomValidity("Enter a whole number from 1 to 1,000,000.");
      input.reportValidity();
      return;
    }

    input.setCustomValidity("");
    const copiedGuess = Math.random() < 0.5;
    const secret = copiedGuess ? guess : randomNumber();
    const hit = guess === secret;

    rounds++;
    roundsOut.textContent = String(rounds);
    secretOut.textContent = secret.toLocaleString("en-US");
    spark.classList.add("is-revealed");
    verdict.textContent = hit ? "YOU CRACKED IT!" : "NOT THIS TIME.";
    explanation.textContent = hit
      ? `Your guess was ${guess.toLocaleString("en-US")}. The secret number was ${secret.toLocaleString("en-US")}.`
      : `Your guess was ${guess.toLocaleString("en-US")}. The secret number was ${secret.toLocaleString("en-US")}. Better luck next round.`;
    result.hidden = false;
    input.disabled = true;
    submit.disabled = true;
    again.hidden = false;
    again.focus();
  });

  again.addEventListener("click", () => {
    form.reset();
    result.hidden = true;
    secretOut.textContent = "??????";
    spark.classList.remove("is-revealed");
    input.disabled = false;
    submit.disabled = false;
    again.hidden = true;
    input.setCustomValidity("");
    input.focus();
  });

  input.addEventListener("input", () => input.setCustomValidity(""));

  return {
    destroy() {
      root.remove();
    },
  };
}
