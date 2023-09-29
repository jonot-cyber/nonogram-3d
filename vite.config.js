import  { resolve } from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default {
    base: "./",
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                game: resolve(__dirname, "game.html"),
                mypuzzles: resolve(__dirname, "mypuzzles.html"),
                create: resolve(__dirname, "create.html"),
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
                }
            ]
        })
    ]
};