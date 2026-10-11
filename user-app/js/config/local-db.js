async function request(path, body) {
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'Request failed');
  return result;
}
class Query {
  constructor(table) { this.query = { table, operation: 'select', filters: [], options: {} }; }
  select(columns = '*', options = {}) { this.query.options = options; return this; }
  insert(payload) { this.query.operation = 'insert'; this.query.payload = payload; return this; }
  update(payload) { this.query.operation = 'update'; this.query.payload = payload; return this; }
  delete() { this.query.operation = 'delete'; return this; }
  filter(operator, column, value) { this.query.filters.push({ operator, column, value }); return this; }
  eq(column, value) { return this.filter('eq', column, value); }
  neq(column, value) { return this.filter('neq', column, value); }
  gt(column, value) { return this.filter('gt', column, value); }
  gte(column, value) { return this.filter('gte', column, value); }
  lt(column, value) { return this.filter('lt', column, value); }
  lte(column, value) { return this.filter('lte', column, value); }
  in(column, value) { return this.filter('in', column, value); }
  order(column, options = {}) { this.query.sort = { column, ascending: options.ascending !== false }; return this; }
  limit(value) { this.query.maxRows = Number(value); return this; }
  async execute() {
    try { return await request('/api/content/query', this.query); }
    catch (error) { return { data: null, error, count: null }; }
  }
  then(resolve, reject) { return this.execute().then(resolve, reject); }
}
const uploaded = new Map();
export const localDb = {
  from(table) { return new Query(table); },
  storage: { from(bucket) { return {
    async upload(name, file) {
      try {
        if (file.size > 8 * 1024 * 1024) throw new Error('Maximum upload size is 8 MB');
        const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
        const result = await request('/api/assets/' + encodeURIComponent(bucket) + '/' + encodeURIComponent(name), { type: file.type, data: dataUrl.split(',')[1] });
        uploaded.set(bucket + '/' + name, result.data.publicUrl);
        return result;
      } catch (error) { return { data: null, error }; }
    },
    getPublicUrl(name) { return { data: { publicUrl: uploaded.get(bucket + '/' + name) || '' } }; }
  }; } },
  channel() { return { on() { return this; }, subscribe() { return this; } }; },
  removeChannel() {},
};
