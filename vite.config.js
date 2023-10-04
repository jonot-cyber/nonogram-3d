import  { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default {
    base: "./",
    build: {
        rollupOptions: {
            input: {
                about: resolve(__dirname, "about.html"),
                create: resolve(__dirname, "create.html"),
                game: resolve(__dirname, "game.html"),
                main: resolve(__dirname, "index.html"),
                mypuzzles: resolve(__dirname, "mypuzzles.html"),
                puzzles: resolve(__dirname, "puzzles.html"),
                tutorial: resolve(__dirname, "tutorial.html"),
            }
        },
        target: "esnext",
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: "library/*.json",
                    dest: "library",
                },
                {
                    src: "assets/**/*",
                    dest: "assets"
                },
            ]
        })
    ]
};