import { Level } from "./types";
import { getPuzzle, getPuzzleResults, getPuzzles, removePuzzle, renderStars, secondsToTime, updatePuzzle } from "./utilities";

import styles from "./puzzle.css.js";
import { unzip, zip } from "gzip-js";

function encodePuzzle(id: string): string {
    const puzzle = getPuzzle(id);
    const puzzleJson = JSON.stringify(puzzle);
    const gzipData = zip(puzzleJson);
    console.log(gzipData);
    const gzipString = String.fromCharCode(...gzipData);
    const base64 = btoa(gzipString);
    return base64;
}

// @ts-ignore
const importButton: HTMLButtonElement = document.querySelector("#import-puzzle");

export class PuzzleElement extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        const puzzleId = this.getAttribute("puzzle-id") ?? "";
        const results = getPuzzleResults(puzzleId);

        const puzzleTitle: string = this.getAttribute("title") ?? "???";
        const starCount: number = results ? results["stars"] : 0;
        const seconds: number | undefined = results ? results["seconds"] : undefined;

        const shadow = this.attachShadow({ mode: "open" });

        const style = document.createElement("style");
        style.textContent = styles;

        const bigWrapper = document.createElement("span");
        bigWrapper.className = "big-wrapper";

        const wrapper = document.createElement("span");
        wrapper.className = "wrapper wrapper-3";

        const thumbnail = document.createElement("img");
        thumbnail.src = this.getAttribute("thumbnail") ?? "./assets/logo.png";

        const title = document.createElement("h1");
        title.className = "title";
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
        bestTime.innerText = `Best Time: ${secondsToTime(seconds)}`;

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
            removePuzzle(puzzleId);
            location.reload();
        });
        const removeIcons = document.createElement("img");
        removeIcons.src = "./assets/delete.svg";
        removeIcons.className = "icon";
        removeIcons.alt = "edit";
        remove.appendChild(removeIcons);

        const share = document.createElement("div");
        share.className = "share";
        share.addEventListener("click", function() {
            const data = encodePuzzle(puzzleId);
            navigator.clipboard.writeText(data);
            alert("Puzzle Code copied to clipboard.");
        });
        const shareIcons = document.createElement("img");
        shareIcons.src = "./assets/share.svg";
        shareIcons.className = "icon";
        shareIcons.alt = "edit";
        share.appendChild(shareIcons);


        shadow.appendChild(style);
        wrapper.appendChild(block2);
        wrapper.appendChild(bestTime);
        bigWrapper.appendChild(wrapper);
        bigWrapper.appendChild(edit);
        bigWrapper.appendChild(remove);
        bigWrapper.appendChild(share);
        shadow.appendChild(bigWrapper);

        wrapper.addEventListener("click", function() {
            hiddenLink.click();
        });
    }
}

customElements.define("puzzle-info", PuzzleElement);

const puzzles = document.querySelector(".puzzles");

if (puzzles) {
    for (const puzzle of getPuzzles()) {
        const elem = document.createElement("puzzle-info");
        elem.setAttribute("stars", "0");
        elem.setAttribute("title", puzzle.name);
        elem.setAttribute("puzzle-id", puzzle.name);
        elem.setAttribute("thumbnail", puzzle.thumbnail);
        puzzles.appendChild(elem);
    }
}

importButton.addEventListener("click", function() {
    const code = prompt("Enter a puzzle code: ");
    if (!code) {
        return;
    }

    // Get data out of the string
    const binaryString = atob(code);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const pdata = String.fromCharCode(...unzip(bytes));
    // TODO: Validate the puzzle
    const puzzle: Level = JSON.parse(pdata);
    updatePuzzle(puzzle.name, function (e) {
        return puzzle;
    })
    location.reload();
})