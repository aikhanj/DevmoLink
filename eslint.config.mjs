import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Catch unused variables and imports
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Catch unused imports
      "no-unused-vars": "off", // Turn off base rule

      // Catch redundant code
      "no-unreachable": "error",
      "no-duplicate-imports": "error",

      // React-specific unused code detection
      "react/jsx-no-useless-fragment": "warn",
      "react/self-closing-comp": "warn",

      // Performance and redundancy
      "react-hooks/exhaustive-deps": "warn",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];

export default eslintConfig;
