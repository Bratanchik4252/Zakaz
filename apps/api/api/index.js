const { createApp } = require('../dist/bootstrap');

let appPromise = null;

module.exports = async function handler(req, res) {
  if (!appPromise) {
    appPromise = createApp()
      .then(async (app) => {
        await app.init();
        return app;
      })
      .catch((error) => {
        appPromise = null;
        throw error;
      });
  }

  const app = await appPromise;
  const instance = app.getHttpAdapter().getInstance();
  return instance(req, res);
};
