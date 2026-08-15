/**
 * NOT loaded by Next.js! Next only reads `postcss.config.js` from the project
 * root (see /postcss.config.js, which is the real bridge and points Tailwind
 * at the config path below). This file exists for external tooling / parity.
 */
module.exports = {
  plugins: {
    tailwindcss: { config: './infra/config/tailwind.config.js' },
  },
};
