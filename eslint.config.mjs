import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".automation/**",
      ".freebuff/**",
      ".gitnexus/**",
      ".globalsetup-backups/**",
      ".scratch/**",
      ".worktrees/**",
      "build-pack/history/**",
      "build-pack/runtime/**",
      "node_modules.incomplete-recovery/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
