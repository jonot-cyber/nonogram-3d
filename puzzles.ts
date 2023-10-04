class PuzzleElement extends HTMLElement {
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
        .wrapper {
            --shadow-color: #0a7563;
            background-color: #0abb8f;
            width: 100%;
            color: white;
            box-shadow: 8px 8px 0px var(--shadow-color);
            padding: 8px;
            font-family: sans-serif;
            display: block;
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

        const wrapper = document.createElement("span");
        wrapper.className = "wrapper";

        const thumbnail = document.createElement("img");
        thumbnail.src = this.getAttribute("thumbnail") ?? "./assets/logo.png";

        const title = document.createElement("h1");
        title.className = "title";
        title.textContent = this.getAttribute("title") ?? "???";

        const starCount: number = Number.parseInt(this.getAttribute("stars") ?? "");
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
        const seconds = this.getAttribute("seconds");
        if (seconds) {
            bestTime.innerText = `Best Time: ${this.createTime(Number.parseInt(seconds))}`;
        }
        bestTime.innerText = `Best Time: --:--`;

        const puzzleId = this.getAttribute("puzzle-id");
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