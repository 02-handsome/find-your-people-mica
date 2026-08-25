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
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Underscore-prefixed arguments are deliberately unused.
      //
      // useActionState requires every action to take (previousState, formData)
      // even when it reads neither — withdrawIntentAction and signOutAction take
      // no input at all, they just need the signature. Renaming them to
      // `previous`/`formData` to satisfy the linter would be worse: it would
      // imply they are used.
      //
      // Scoped to args only. Unused variables and imports are still errors.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
