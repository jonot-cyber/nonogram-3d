const body = document.querySelector("body");

if (body) {
    for (let i = 0; i < localStorage.length; i++) {
        const name = localStorage.key(i);
        if (!name) {
            break;
        }
        const elem = document.createElement("a");
        elem.innerText = name;
        elem.href = `./game.html?local=${name}`;
        body.appendChild(elem);
    }
}