import { Level } from "./types";

export class PuzzleElement extends HTMLElement {

    pad(input: string, len: number): string {
        while (input.length < len) {
            input = "0" + input;
        }
        return input;
    }

    createTime(seconds?: number): string {
        if (seconds == null) {
            return "--:--";
        }
        const minutes = Math.floor(seconds / 60);
        const leftoverSeconds = seconds % 60;
        return `${this.pad(minutes.toString(), 2)}:${this.pad(leftoverSeconds.toString(), 2)}`
    }

    constructor() {
        super();
    }

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = `
        .big-wrapper {
            display: flex;
            width: 100%;
            gap: 16px;
        }

        .edit {
            background-color: #ea565f;
            --shadow-color: #a5314d;
            color: white;
            box-shadow: 8px 8px 0px var(--shadow-color);
            padding: 8px;
            font-family: sans-serif;
            display: block;
            aspect-ratio: 1 / 1;
            height: 128px;
            text-decoration: none;
        }

        .edit:hover {
            box-shadow: 6px 6px 0px var(--shadow-color);
            transform: translate(2px, 2px);
        }

        .edit:active {
            box-shadow: 0px 0px 0px var(--shadow-color);
            transform: translate(8px, 8px);
        }

        .icon {
            width: 100%;
            aspect-ratio: 1 / 1;
        }

        .remove {
            background-color: #567dea;
            --shadow-color: #404bcd;
            color: white;
            box-shadow: 8px 8px 0px var(--shadow-color);
            padding: 8px;
            font-family: sans-serif;
            display: block;
            aspect-ratio: 1 / 1;
            height: 128px;
            text-decoration: none;
        }

        .remove:hover {
            box-shadow: 6px 6px 0px var(--shadow-color);
            transform: translate(2px, 2px);
        }

        .remove:active {
            box-shadow: 0px 0px 0px var(--shadow-color);
            transform: translate(8px, 8px);
        }

        .wrapper {
            --shadow-color: #0a7563;
            background-color: #0abb8f;
            color: white;
            box-shadow: 8px 8px 0px var(--shadow-color);
            padding: 8px;
            font-family: sans-serif;
            display: block;
            flex-grow: 1;
        }

        .wrapper:hover {
            box-shadow: 6px 6px 0px var(--shadow-color);
            transform: translate(2px, 2px);
        }

        .wrapper:active {
            box-shadow: 0px 0px 0px var(--shadow-color);
            transform: translate(8px, 8px);
        }

        .wrapper img {
            height: 64px;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            margin-right: 8px;
        }

        .block2 {
            display: flex;
        }

        .title {
            margin-top: 0;
            margin-bottom: 0;
        }

        .stars {
            margin: 0;
        }
        `
        const dat: Object = JSON.parse(localStorage.getItem("nonogram-3d-results") ?? "{}");

        const puzzleId = this.getAttribute("puzzle-id") ?? "";

        const bigWrapper = document.createElement("span");
        bigWrapper.className = "big-wrapper";

        const wrapper = document.createElement("span");
        wrapper.className = "wrapper";

        const thumbnail = document.createElement("img");
        thumbnail.src = this.getAttribute("thumbnail") ?? "./assets/logo.png";

        const title = document.createElement("h1");
        title.className = "title";
        title.textContent = this.getAttribute("title") ?? "???";

        let starCount: number = 0;
        if (dat.hasOwnProperty(puzzleId)) {
            starCount = dat[puzzleId].stars;
        }
        const stars = document.createElement("p");
        stars.className = "stars";
        stars.textContent = "★".repeat(starCount) + "☆".repeat(3 - starCount);

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
        let seconds = null;
        if (dat.hasOwnProperty(puzzleId)) {
            seconds = dat[puzzleId].seconds;
        }
        if (seconds) {
            bestTime.innerText = `Best Time: ${this.createTime(Number.parseInt(seconds))}`;
        } else {
            bestTime.innerText = `Best Time: --:--`;
        }

        const hiddenLink = document.createElement("a");
        hiddenLink.href = `./game.html?local=${puzzleId}`;

        const edit = document.createElement("a");
        edit.href = `./create.html?local=${puzzleId}`;
        edit.className = "edit";
        const editIcon = document.createElement("img");
        editIcon.src = "./assets/edit.svg";
        editIcon.className = "icon";
        editIcon.alt = "edit";
        edit.appendChild(editIcon);

        const remove = document.createElement("div");
        remove.className = "remove";
        remove.addEventListener("click", function() {
            const storage = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
            delete storage[puzzleId];
            localStorage.setItem("nonogram-3d-puzzle", JSON.stringify(storage));
            location.reload();
        });
        const removeIcons = document.createElement("img");
        removeIcons.src = "./assets/delete.svg";
        removeIcons.className = "icon";
        removeIcons.alt = "edit";
        remove.appendChild(removeIcons);

        shadow.appendChild(style);
        wrapper.appendChild(block2);
        wrapper.appendChild(bestTime);
        bigWrapper.appendChild(wrapper);
        bigWrapper.appendChild(edit);
        bigWrapper.appendChild(remove);
        shadow.appendChild(bigWrapper);

        wrapper.addEventListener("click", function() {
            hiddenLink.click();
        });
    }
}

customElements.define("puzzle-info", PuzzleElement);

const body = document.querySelector("body");
const puzzles = document.querySelector(".puzzles");

if (puzzles) {
    const storage = JSON.parse(localStorage.getItem("nonogram-3d-puzzle") ?? "{}");
    for (const [key, value] of Object.entries(storage)) {
        const nv = value as Level;
        const elem = document.createElement("puzzle-info");
        elem.setAttribute("stars", "0");
        elem.setAttribute("title", nv.name);
        elem.setAttribute("puzzle-id", nv.name);
        elem.setAttribute("thumbnail", nv.thumbnail);
        puzzles.appendChild(elem);
    }
}