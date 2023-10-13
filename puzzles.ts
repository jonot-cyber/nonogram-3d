import { getPuzzleResults, renderStars, secondsToTime } from "./utilities";
import styles from "./puzzle.css.js";

export class PuzzleElement extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const puzzleId = this.getAttribute("puzzle-id");
        const results = getPuzzleResults(puzzleId ?? "");

        const starCount = results ? results["stars"] : 0;
        const seconds = results ? results["seconds"] : undefined;
        const puzzleTitle = results ? this.getAttribute("title") : "???";
        const thumbnailSource = results ? this.getAttribute("thumbnail") ?? "./assets/unsolved.png" : "./assets/unsolved.png";

        const shadow = this.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = styles;


        const wrapper = document.createElement("span");
        wrapper.className = "wrapper wrapper-2";

        const thumbnail = document.createElement("img");
        thumbnail.src = thumbnailSource;

        const title = document.createElement("h1");
        title.textContent = puzzleTitle;


        const stars = document.createElement("p");
        stars.className = "stars";
        stars.textContent = renderStars(starCount);

        const block1 = document.createElement("div");
        block1.className = "block1";
        block1.appendChild(title);
        block1.appendChild(stars);

        const block2 = document.createElement("div");
        block2.className = "block2";
        block2.appendChild(thumbnail);
        block2.appendChild(block1);

        const bestTime = document.createElement("p");
        bestTime.className = "best-time";
        bestTime.textContent = `Best Time: ${secondsToTime(seconds)}`;

        const hiddenLink = document.createElement("a");
        hiddenLink.href = `./game.html?puzzle=${puzzleId ?? ""}`;

        shadow.appendChild(style);
        wrapper.appendChild(block2);
        wrapper.appendChild(bestTime);
        shadow.appendChild(wrapper);

        this.addEventListener("click", function() {
            hiddenLink.click();
        })
    }
}

customElements.define("puzzle-info", PuzzleElement);