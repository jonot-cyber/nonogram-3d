export default `.big-wrapper {
    display: flex;
    width: 100%;
    gap: 16px;
}

.edit {
    background-color: #ea565f;
    --shadow-color: #a5314d;
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

.share {
    background-color: #f3bb2e;
    --shadow-color: #a7830c;
    box-shadow: 8px 8px 0px var(--shadow-color);
    padding: 8px;
    font-family: sans-serif;
    display: block;
    aspect-ratio: 1 / 1;
    height: 128px;
    text-decoration: none;
}

.share:hover {
    box-shadow: 6px 6px 0px var(--shadow-color);
    transform: translate(2px, 2px);
}

.share:active {
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

h1 {
    margin-top: 0;
    margin-bottom: 0;
}

.stars {
    margin: 0;
}

.wrapper-2 {
    width: 100%;
}

.wrapper-3 {
    flex-grow: 1;
}`