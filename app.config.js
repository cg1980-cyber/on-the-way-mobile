// Dynamic Expo config. Wraps app.json and injects the Firebase config file.
// Locally, google-services.json sits in the repo root (gitignored — the repo
// is public). On EAS builds, the GOOGLE_SERVICES_JSON file env var provides a
// temp-file path instead.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
  },
});
