import globals from "globals";
import pluginJs from "@eslint/js";
// import tseslint from "typescript-eslint";


export default [
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  // ...tseslint.configs.recommended,
  {
    rules: {
      "indent": [
        "error",
        4,
        {
          "SwitchCase": 1
        }
      ],
      "no-console": "off",
      "no-unused-vars": [
        "error",
        {
          "ignoreRestSiblings": true,
          "argsIgnorePattern": "^_"
        }
      ],
      "no-var": "error",
      "no-trailing-spaces": "error",
      "prefer-const": "error",
      "quotes": [
        "error",
        "single",
        {
          "avoidEscape": true,
          "allowTemplateLiterals": true
        }
      ],
      "semi": [
        "error",
        "always"
      ]
    }
  },
  {
    ignores: ["admin/words.js", "/**/node_modules/*", "node_modules/", "socket.io/", "lib/js/", "js/", "eslint.config.mjs", "**/test/", "main.test.js"],
  }
];