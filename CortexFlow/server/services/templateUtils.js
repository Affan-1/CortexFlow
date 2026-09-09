/*
|--------------------------------------------------------------------------
| Template Utils
|--------------------------------------------------------------------------
|
| Lets node config fields reference upstream data with {{dot.path}}
| syntax, e.g. a "Send Email" node's body can contain:
|
|   "Hi {{trigger.payload.name}}, your ticket is {{ai.output.summary}}"
|
| `context` is the accumulated data object passed down the workflow
| (see workflowEngine.js).
|
*/

const getByPath = (obj, path) => {
  if (!path) return undefined;

  return path
    .split(".")
    .reduce(
      (acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined),
      obj
    );
};

const interpolate = (value, context) => {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path) => {
      const resolved = getByPath(context, path);

      if (resolved === undefined || resolved === null) return "";

      return typeof resolved === "object"
        ? JSON.stringify(resolved)
        : String(resolved);
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolate(item, context));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        interpolate(val, context),
      ])
    );
  }

  return value;
};

module.exports = {
  getByPath,
  interpolate,
};
