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

    // Browser frontend: public/js/ — browser globals + vendored Bootstrap
    {
        files: ["public/js/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.browser,
                // Bootstrap is loaded globally from public/vendor/bootstrap.bundle.min.js
                bootstrap: "readonly",
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            // Allow unused parameters and variables prefixed with _ (intentional no-ops)
            "no-unused-vars": ["error", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
            }],
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
