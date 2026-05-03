import js from "@eslint/js";
import globals from "globals";

export default [
    // Ignore vendored libraries and generated artifacts
    {
        ignores: ["node_modules/**", "public/vendor/**"],
    },

    // Base recommended ruleset applied to all files
    js.configs.recommended,

    // Node.js backend: server.js, lib/, routes/ — Node globals only
    {
        files: [
            "server.js",
            "lib/**/*.js",
            "routes/**/*.js",
            "scripts/**/*.js",
        ],
        languageOptions: {
            globals: globals.node,
            ecmaVersion: 2022,
            sourceType: "module",
        },
    },

    // Browser frontend: public/js/ — browser globals only
    {
        files: ["public/js/**/*.js"],
        languageOptions: {
            globals: globals.browser,
            ecmaVersion: 2022,
            sourceType: "module",
        },
    },

    // Test files: Node globals + fetch (available in Node 18+)
    {
        files: ["tests/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.node,
                fetch: "readonly",
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
    },
];
