function parsePagination(query) {
  const parsedLimit = Number.parseInt(query.limit ?? '20', 10);

  return {
    cursor: query.cursor || undefined,
    limit: Number.isNaN(parsedLimit) ? 20 : Math.min(Math.max(parsedLimit, 1), 100),
  };
}

function buildPaginationMeta(items, total, limit) {
  const lastItem = items.length > 0 ? items[items.length - 1] : null;
  return {
    limit,
    total,
    cursor: items.length === limit && lastItem ? Buffer.from(JSON.stringify({ id: lastItem.id })).toString('base64') : null,
  };
}

function decodeCursor(cursor) {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

module.exports = { parsePagination, buildPaginationMeta, decodeCursor };
