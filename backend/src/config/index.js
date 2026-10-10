const env = require('./env');
const db = require('./database');

module.exports = {
  env,
  db,
  query: db.query,
  transaction: db.transaction,
  sql: db.sql,
};
