'use strict';

// @expo/config only uses deepmerge(target, source), with its default options.
// Preserve that non-mutating, array-concatenating API without the unpatched
// deepmerge package. Keep this override scoped to @expo/config.
module.exports = require('@fastify/deepmerge')({ symbols: true });
