import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [".next-build/**", ".next-build-verify/**"],
  },
];

export default eslintConfig;
