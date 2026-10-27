// Type declaration for the inline sql.js build (WASM embedded as base64),
// so it does not need to load sql-wasm.wasm from disk at runtime.
declare module "sql.js/dist/sql-wasm-inline.js" {
  import initSqlJs = require("sql.js");
  export = initSqlJs;
}
