/**
 * Converts snake_case string to camelCase
 */
const snakeToCamel = (str) => {
  return str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Maps an object with snake_case keys to camelCase keys
 */
const mapRowToCamel = (row) => {
  if (!row || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map(mapRowToCamel);

  const result = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = snakeToCamel(key);
    result[camelKey] = value;
  }
  return result;
};

/**
 * Maps an array of rows
 */
const mapRowsToCamel = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapRowToCamel);
};

module.exports = {
  snakeToCamel,
  mapRowToCamel,
  mapRowsToCamel,
};
