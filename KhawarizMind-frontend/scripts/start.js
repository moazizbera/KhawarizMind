#!/usr/bin/env node
"use strict";

const configPath = require.resolve("react-scripts/config/webpackDevServer.config");
const originalConfigFactory = require(configPath);

require.cache[configPath].exports = function patchedConfigFactory(proxy, allowedHost) {
  const config = originalConfigFactory(proxy, allowedHost);
  const { onBeforeSetupMiddleware, onAfterSetupMiddleware } = config;

  if (onBeforeSetupMiddleware || onAfterSetupMiddleware) {
    config.setupMiddlewares = (middlewares, devServer) => {
      if (typeof onBeforeSetupMiddleware === "function") {
        onBeforeSetupMiddleware(devServer);
      }

      if (typeof onAfterSetupMiddleware === "function") {
        onAfterSetupMiddleware(devServer);
      }

      return middlewares;
    };

    delete config.onBeforeSetupMiddleware;
    delete config.onAfterSetupMiddleware;
  }

  return config;
};

require("react-scripts/scripts/start");
