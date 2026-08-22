import { randomUUID } from 'crypto';
import { prisma } from './prisma';

type AnyObject = Record<string, any>;

export interface PopulateRule {
  model: () => CompatModel;
  local: string;
  as?: string;
  many?: boolean;
  jsonArray?: string;
  jsonField?: string;
}

export interface ModelConfig {
  name: string;
  delegate: string;
  fields: string[];
  aliases?: Record<string, string>;
  arrayFields?: string[];
  jsonFields?: string[];
  subdocumentArrays?: string[];
  defaults?: AnyObject;
  populate?: Record<string, PopulateRule>;
  beforeSave?: (doc: AnyObject, original: AnyObject | null, isNew: boolean) => Promise<void> | void;
  methods?: Record<string, (doc: AnyObject, ...args: any[]) => any>;
}

const META = Symbol('postgres-document-meta');

function clone<T>(value: T): T {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(clone) as T;
  if (typeof value === 'object') {
    const result: AnyObject = {};
    for (const [key, item] of Object.entries(value as AnyObject)) result[key] = clone(item);
    return result as T;
  }
  return value;
}

function idOf(value: any): any {
  if (value === undefined || value === null) return value;
  if (typeof value === 'object') return value._id ?? value.id ?? value.toHexString?.() ?? String(value);
  return String(value);
}

function jsonSafe(value: any): any {
  if (value === undefined) return undefined;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe).filter(v => v !== undefined);
  if (typeof value === 'object') {
    if (typeof value.toHexString === 'function') return value.toHexString();
    const out: AnyObject = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'function') continue;
      const safe = jsonSafe(item);
      if (safe !== undefined) out[key] = safe;
    }
    return out;
  }
  return String(value);
}

function valuesAt(value: any, parts: string[]): any[] {
  if (parts.length === 0) return Array.isArray(value) ? value : [value];
  if (Array.isArray(value)) {
    if (/^\d+$/.test(parts[0])) return valuesAt(value[Number(parts[0])], parts.slice(1));
    return value.flatMap(item => valuesAt(item, parts));
  }
  if (value === null || value === undefined) return [undefined];
  return valuesAt(value[parts[0]], parts.slice(1));
}

function comparable(value: any): any {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && typeof value.toHexString === 'function') return value.toHexString();
  if (value && typeof value === 'object' && ('_id' in value || 'id' in value)) return idOf(value);
  return value;
}

function equals(actual: any, expected: any): boolean {
  if (expected instanceof RegExp) return expected.test(String(actual ?? ''));
  const a = comparable(actual);
  const b = comparable(expected);
  if (a === null || a === undefined || b === null || b === undefined) return a == null && b == null;
  return String(a) === String(b);
}

function matchesCondition(values: any[], condition: any): boolean {
  if (condition instanceof RegExp) return values.some(v => condition.test(String(v ?? '')));
  if (!condition || typeof condition !== 'object' || condition instanceof Date || Array.isArray(condition)) {
    return values.some(v => Array.isArray(v) ? v.some(x => equals(x, condition)) : equals(v, condition));
  }

  return Object.entries(condition).every(([operator, expected]: [string, any]) => {
    const flat = values.flatMap(v => Array.isArray(v) ? v : [v]);
    if (operator === '$exists') return expected ? flat.some(v => v !== undefined) : flat.every(v => v === undefined);
    if (operator === '$in') return flat.some(v => expected.some((e: any) => equals(v, e)));
    if (operator === '$nin') return flat.every(v => expected.every((e: any) => !equals(v, e)));
    if (operator === '$ne') return flat.every(v => !equals(v, expected));
    if (operator === '$regex') {
      const regex = expected instanceof RegExp ? expected : new RegExp(String(expected), condition.$options || '');
      return flat.some(v => regex.test(String(v ?? '')));
    }
    if (operator === '$options') return true;
    if (operator === '$gte') return flat.some(v => comparable(v) >= comparable(expected));
    if (operator === '$lte') return flat.some(v => comparable(v) <= comparable(expected));
    if (operator === '$gt') return flat.some(v => comparable(v) > comparable(expected));
    if (operator === '$lt') return flat.some(v => comparable(v) < comparable(expected));
    return true;
  });
}

function matchesFilter(doc: AnyObject, filter: AnyObject = {}): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  return Object.entries(filter).every(([key, condition]: [string, any]) => {
    if (key === '$or') return condition.some((part: AnyObject) => matchesFilter(doc, part));
    if (key === '$and') return condition.every((part: AnyObject) => matchesFilter(doc, part));
    return matchesCondition(valuesAt(doc, key.split('.')), condition);
  });
}

function regexWhere(regex: RegExp): AnyObject {
  const source = regex.source;
  if (source.startsWith('^') && source.endsWith('$')) {
    return { equals: source.slice(1, -1).replace(/\\(.)/g, '$1'), mode: regex.ignoreCase ? 'insensitive' : undefined };
  }
  return { contains: source.replace(/^\^|\$$/g, '').replace(/\\(.)/g, '$1'), mode: regex.ignoreCase ? 'insensitive' : undefined };
}

function translateFilter(filter: AnyObject, config: ModelConfig): { where: AnyObject; exact: boolean } {
  const where: AnyObject = {};
  let exact = true;
  const arrayFields = new Set(config.arrayFields || []);

  for (const [apiKey, condition] of Object.entries(filter || {})) {
    if (apiKey === '$or' || apiKey === '$and') {
      const translated = (condition as AnyObject[]).map(part => translateFilter(part, config));
      if (translated.every(part => part.exact)) where[apiKey === '$or' ? 'OR' : 'AND'] = translated.map(part => part.where);
      else exact = false;
      continue;
    }
    if (apiKey.includes('.')) { exact = false; continue; }
    const key = apiKey === '_id' ? 'id' : (config.aliases?.[apiKey] || apiKey);
    if (!config.fields.includes(key) && key !== 'id') { exact = false; continue; }

    if (condition instanceof RegExp) { where[key] = regexWhere(condition); continue; }
    if (!condition || typeof condition !== 'object' || condition instanceof Date || Array.isArray(condition)) {
      where[key] = key === 'id' || key.endsWith('Id') ? idOf(condition) : condition;
      continue;
    }

    const operators = condition as AnyObject;
    const fieldWhere: AnyObject = {};
    let supported = true;
    for (const [operator, expected] of Object.entries(operators)) {
      if (operator === '$options') continue;
      if (operator === '$regex') {
        const regex = expected instanceof RegExp ? expected : new RegExp(String(expected), operators.$options || '');
        Object.assign(fieldWhere, regexWhere(regex));
      } else if (operator === '$ne') fieldWhere.not = expected;
      else if (operator === '$gte') fieldWhere.gte = expected;
      else if (operator === '$lte') fieldWhere.lte = expected;
      else if (operator === '$gt') fieldWhere.gt = expected;
      else if (operator === '$lt') fieldWhere.lt = expected;
      else if (operator === '$in') {
        const rawValues = expected as any[];
        const values = rawValues.map(idOf);
        if (rawValues.some(v => v == null || v instanceof RegExp)) supported = false;
        else if (arrayFields.has(key)) fieldWhere.hasSome = values;
        else fieldWhere.in = values;
      } else supported = false;
    }
    if (supported) where[key] = fieldWhere;
    else exact = false;
  }
  return { where, exact };
}

function setPath(target: AnyObject, path: string, value: any): void {
  const parts = path.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor[parts[i]] || typeof cursor[parts[i]] !== 'object') cursor[parts[i]] = {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
}

function applyUpdate(doc: AnyObject, update: AnyObject): void {
  for (const [key, value] of Object.entries(update || {})) {
    if (key === '$set') for (const [path, item] of Object.entries(value as AnyObject)) setPath(doc, path, item);
    else if (key === '$unset') for (const path of Object.keys(value as AnyObject)) setPath(doc, path, undefined);
    else if (key === '$inc') {
      for (const [path, amount] of Object.entries(value as AnyObject)) {
        const current = valuesAt(doc, path.split('.'))[0] || 0;
        setPath(doc, path, current + Number(amount));
      }
    } else if (!key.startsWith('$')) setPath(doc, key, value);
  }
}

function enhanceArray(array: any[]): any[] {
  for (const item of array) if (item && typeof item === 'object' && !item._id) item._id = randomUUID();
  if (!(array as any).id) Object.defineProperty(array, 'id', {
    enumerable: false,
    value: (id: any) => array.find(item => idOf(item?._id) === idOf(id)),
  });
  if (!(array as any).pull) Object.defineProperty(array, 'pull', {
    enumerable: false,
    value: (id: any) => {
      const index = array.findIndex(item => idOf(item?._id) === idOf(id));
      if (index >= 0) array.splice(index, 1);
      return array;
    },
  });
  return array;
}

function pickFields(doc: AnyObject, selection?: string): AnyObject {
  if (!selection) return doc;
  const fields = selection.split(/\s+/).filter(Boolean);
  const excludes = fields.filter(field => field.startsWith('-')).map(field => field.slice(1));
  const includes = fields.filter(field => !field.startsWith('-'));
  if (includes.length === 0) {
    for (const field of excludes) delete doc[field];
    return doc;
  }
  const keep = new Set([...includes, '_id']);
  for (const key of Object.keys(doc)) if (!keep.has(key)) delete doc[key];
  return doc;
}

function sortDocs(docs: AnyObject[], sort: AnyObject): AnyObject[] {
  const entries = Object.entries(sort || {});
  if (!entries.length) return docs;
  return docs.sort((a, b) => {
    for (const [field, direction] of entries) {
      const av = comparable(valuesAt(a, field.split('.'))[0]);
      const bv = comparable(valuesAt(b, field.split('.'))[0]);
      if (av == bv) continue;
      if (av == null) return Number(direction) < 0 ? 1 : -1;
      if (bv == null) return Number(direction) < 0 ? -1 : 1;
      return (av < bv ? -1 : 1) * (Number(direction) < 0 ? -1 : 1);
    }
    return 0;
  });
}

function groupKey(doc: AnyObject, expression: any): string {
  if (typeof expression === 'string' && expression.startsWith('$')) return String(valuesAt(doc, expression.slice(1).split('.'))[0] ?? '');
  if (expression?.$dateToString) {
    const value = valuesAt(doc, String(expression.$dateToString.date).slice(1).split('.'))[0];
    return new Date(value).toISOString().slice(0, 10);
  }
  return String(expression ?? '');
}

export class QueryBuilder {
  private sortValue: AnyObject = {};
  private skipValue = 0;
  private limitValue: number | undefined;
  private selectValue?: string;
  private populateValues: any[] = [];
  private leanValue = false;

  constructor(
    private model: CompatModel,
    private filter: AnyObject,
    private one: boolean,
    private customExecutor?: () => Promise<any>,
  ) {}

  sort(value: AnyObject): this { this.sortValue = value || {}; return this; }
  skip(value: number): this { this.skipValue = Number(value) || 0; return this; }
  limit(value: number): this { this.limitValue = Number(value); return this; }
  select(value: string): this { this.selectValue = value; return this; }
  populate(path: any, select?: string): this { this.populateValues.push(typeof path === 'string' ? { path, select } : path); return this; }
  lean(): this { this.leanValue = true; return this; }

  async execute(): Promise<any> {
    if (this.customExecutor) {
      const value = await this.customExecutor();
      if (!value) return null;
      let docs = Array.isArray(value) ? value : [value];
      for (const populate of this.populateValues) for (const doc of docs) await this.model.populateDoc(doc, populate);
      for (const doc of docs) pickFields(doc, this.selectValue);
      if (this.leanValue) docs = docs.map((doc: AnyObject) => this.model.toObject(doc));
      return this.one ? docs[0] : docs;
    }
    const translated = translateFilter(this.filter, this.model.config);
    const delegate = this.model.delegate;
    const orderBy = Object.entries(this.sortValue).map(([field, direction]) => ({
      [field === '_id' ? 'id' : (this.model.config.aliases?.[field] || field)]: Number(direction) < 0 ? 'desc' : 'asc',
    }));
    let rows = await delegate.findMany({ where: translated.where, ...(orderBy.length ? { orderBy } : {}) });
    let docs = rows.map((row: AnyObject) => this.model.fromRow(row));
    if (!translated.exact) docs = docs.filter((doc: AnyObject) => matchesFilter(doc, this.filter));
    if (!orderBy.length && Object.keys(this.sortValue).length) docs = sortDocs(docs, this.sortValue);
    docs = docs.slice(this.skipValue, this.limitValue === undefined ? undefined : this.skipValue + this.limitValue);
    if (this.one) docs = docs.slice(0, 1);
    for (const populate of this.populateValues) {
      for (const doc of docs) await this.model.populateDoc(doc, populate);
    }
    for (const doc of docs) pickFields(doc, this.selectValue);
    if (this.leanValue) docs = docs.map((doc: AnyObject) => this.model.toObject(doc));
    return this.one ? (docs[0] || null) : docs;
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
  catch(reject: any): Promise<any> { return this.execute().catch(reject); }
}

export class CompatModel {
  public readonly config: ModelConfig;

  constructor(config: ModelConfig) { this.config = config; }
  get delegate(): any { return (prisma as any)[this.config.delegate]; }

  private apiField(dbField: string): string {
    const pair = Object.entries(this.config.aliases || {}).find(([, value]) => value === dbField);
    return pair?.[0] || dbField;
  }

  fromRow(row: AnyObject): AnyObject {
    const doc: AnyObject = {};
    for (const [key, value] of Object.entries(row)) {
      if (key.endsWith('Ref') || key === 'children') continue;
      doc[key === 'id' ? '_id' : this.apiField(key)] = clone(value);
    }
    for (const field of this.config.subdocumentArrays || []) {
      if (Array.isArray(doc[field])) doc[field] = enhanceArray(doc[field]);
    }
    Object.defineProperty(doc, META, { enumerable: false, writable: true, value: { model: this, original: clone(doc), isNew: false } });
    Object.defineProperty(doc, 'save', { enumerable: false, value: () => this.saveDoc(doc) });
    Object.defineProperty(doc, 'populate', { enumerable: false, value: async (path: any, select?: string) => this.populateDoc(doc, typeof path === 'string' ? { path, select } : path) });
    Object.defineProperty(doc, 'toObject', { enumerable: false, value: () => this.toObject(doc) });
    Object.defineProperty(doc, 'markModified', { enumerable: false, value: () => undefined });
    for (const [name, method] of Object.entries(this.config.methods || {})) {
      Object.defineProperty(doc, name, { enumerable: false, value: (...args: any[]) => method(doc, ...args) });
    }
    return doc;
  }

  toObject(doc: AnyObject): AnyObject {
    const out: AnyObject = {};
    for (const [key, value] of Object.entries(doc)) out[key] = clone(value);
    return out;
  }

  private toData(source: AnyObject): AnyObject {
    const mapped: AnyObject = {};
    for (const [apiKey, rawValue] of Object.entries(source)) {
      let key = apiKey === '_id' ? 'id' : (this.config.aliases?.[apiKey] || apiKey);
      if (key.endsWith('Ref') || !this.config.fields.includes(key)) continue;
      let value = rawValue;
      if (key === 'id' || key.endsWith('Id')) value = idOf(value);
      if ((this.config.arrayFields || []).includes(key)) {
        value = (Array.isArray(value) ? value : []).map(idOf).filter((item: any) => item != null);
      }
      for (const rule of Object.values(this.config.populate || {})) {
        if (rule.jsonArray === apiKey && rule.jsonField && Array.isArray(value)) {
          value = value.map(item => ({ ...item, [rule.jsonField!]: idOf(item?.[rule.jsonField!]) }));
        }
      }
      if ((this.config.jsonFields || []).includes(key)) value = jsonSafe(value);
      if (value !== undefined) mapped[key] = value;
    }
    return mapped;
  }

  async saveDoc(doc: AnyObject): Promise<AnyObject> {
    const meta = (doc as any)[META] || { original: null, isNew: !doc._id };
    await this.config.beforeSave?.(doc, meta.original, meta.isNew);
    const data = this.toData(doc);
    const id = data.id || doc._id || undefined;
    delete data.id;
    delete data.updatedAt;
    let row: AnyObject;
    if (meta.isNew || !id) row = await this.delegate.create({ data: { ...(id ? { id } : {}), ...data } });
    else row = await this.delegate.update({ where: { id: String(id) }, data });
    const fresh = this.fromRow(row);
    for (const key of Object.keys(doc)) delete doc[key];
    Object.assign(doc, fresh);
    (doc as any)[META] = { model: this, original: clone(this.toObject(doc)), isNew: false };
    return doc;
  }

  async populateDoc(doc: AnyObject, populate: any): Promise<AnyObject> {
    const spec = typeof populate === 'string' ? { path: populate } : populate;
    const rule = this.config.populate?.[spec.path];
    if (!rule || !doc) return doc;
    const target = rule.model();
    if (rule.jsonArray && rule.jsonField) {
      const array = Array.isArray(doc[rule.jsonArray]) ? doc[rule.jsonArray] : [];
      const ids = array.map((item: AnyObject) => idOf(item?.[rule.jsonField])).filter(Boolean);
      const related = ids.length ? await target.find({ _id: { $in: ids } }) : [];
      const byId = new Map(related.map((item: AnyObject) => [idOf(item._id), item]));
      for (const item of array) {
        const found = byId.get(idOf(item?.[rule.jsonField]));
        item[rule.jsonField] = found ? pickFields(found, spec.select) : null;
        if (found && spec.populate) await target.populateDoc(found, spec.populate);
      }
      return doc;
    }

    const localValue = doc[rule.local];
    if (rule.many) {
      const ids = (Array.isArray(localValue) ? localValue : []).map(idOf);
      const related = ids.length ? await target.find({ _id: { $in: ids } }) : [];
      const byId = new Map(related.map((item: AnyObject) => [idOf(item._id), item]));
      doc[rule.as || rule.local] = ids.map(id => byId.get(id)).filter(Boolean).map(item => pickFields(item, spec.select));
    } else {
      const related = localValue ? await target.findById(idOf(localValue)) : null;
      if (related && spec.populate) await target.populateDoc(related, spec.populate);
      doc[rule.as || rule.local] = related ? pickFields(related, spec.select) : null;
    }
    return doc;
  }

  find(filter: AnyObject = {}): QueryBuilder { return new QueryBuilder(this, filter, false); }
  findOne(filter: AnyObject = {}): QueryBuilder { return new QueryBuilder(this, filter, true); }
  findById(id: any): QueryBuilder { return this.findOne({ _id: id }); }

  async create(data: AnyObject): Promise<AnyObject> {
    const merged = { ...clone(this.config.defaults || {}), ...clone(data) };
    const doc = this.fromRow({ id: merged._id || randomUUID(), ...merged });
    (doc as any)[META] = { model: this, original: null, isNew: true };
    return this.saveDoc(doc);
  }

  async insertMany(items: AnyObject[]): Promise<AnyObject[]> {
    const result: AnyObject[] = [];
    for (const item of items) result.push(await this.create(item));
    return result;
  }

  async upsertRaw(data: AnyObject): Promise<void> {
    const merged = { ...clone(this.config.defaults || {}), ...clone(data) };
    const mapped = this.toData(merged);
    const id = mapped.id || idOf(merged._id) || randomUUID();
    delete mapped.id;
    await this.delegate.upsert({ where: { id }, create: { id, ...mapped }, update: mapped });
  }

  async createManyRaw(rows: AnyObject[]): Promise<number> {
    const data = rows.map(row => {
      const merged = { ...clone(this.config.defaults || {}), ...clone(row) };
      const mapped = this.toData(merged);
      mapped.id = mapped.id || idOf(merged._id) || randomUUID();
      return mapped;
    });
    const result = await this.delegate.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  findByIdAndUpdate(id: any, update: AnyObject, _options: AnyObject = {}): QueryBuilder {
    return this.mutatingQuery(async () => {
      const doc = await this.findById(id);
      if (!doc) return null;
      applyUpdate(doc, update);
      return this.saveDoc(doc);
    });
  }

  findOneAndUpdate(filter: AnyObject, update: AnyObject, options: AnyObject = {}): QueryBuilder {
    return this.mutatingQuery(async () => {
      let doc = await this.findOne(filter);
      if (!doc && options.upsert) doc = await this.create({ ...filter, ...update });
      else if (doc) { applyUpdate(doc, update); await this.saveDoc(doc); }
      return doc;
    });
  }

  private mutatingQuery(executor: () => Promise<any>): QueryBuilder {
    return new QueryBuilder(this, {}, true, executor);
  }

  async findByIdAndDelete(id: any): Promise<AnyObject | null> {
    const doc = await this.findById(id);
    if (!doc) return null;
    await this.delegate.delete({ where: { id: idOf(id) } });
    return doc;
  }

  async deleteMany(filter: AnyObject = {}): Promise<{ deletedCount: number }> {
    const docs = await this.find(filter);
    if (!docs.length) return { deletedCount: 0 };
    const result = await this.delegate.deleteMany({ where: { id: { in: docs.map((doc: AnyObject) => idOf(doc._id)) } } });
    return { deletedCount: result.count };
  }

  async deleteOne(filter: AnyObject = {}): Promise<{ deletedCount: number }> {
    const doc = await this.findOne(filter);
    if (!doc) return { deletedCount: 0 };
    await this.delegate.delete({ where: { id: idOf(doc._id) } });
    return { deletedCount: 1 };
  }

  async updateMany(filter: AnyObject, update: AnyObject): Promise<{ matchedCount: number; modifiedCount: number }> {
    const docs = await this.find(filter);
    for (const doc of docs) { applyUpdate(doc, update); await this.saveDoc(doc); }
    return { matchedCount: docs.length, modifiedCount: docs.length };
  }

  async countDocuments(filter: AnyObject = {}): Promise<number> {
    const translated = translateFilter(filter, this.config);
    if (translated.exact) return this.delegate.count({ where: translated.where });
    return (await this.find(filter)).length;
  }

  async distinct(field: string, filter: AnyObject = {}): Promise<any[]> {
    const docs = await this.find(filter).lean();
    return [...new Set(docs.flatMap((doc: AnyObject) => valuesAt(doc, field.split('.'))).filter((value: any) => value !== undefined))];
  }

  async aggregate(pipeline: AnyObject[]): Promise<AnyObject[]> {
    let docs: AnyObject[] = await this.find().lean();
    for (const stage of pipeline) {
      if (stage.$match) docs = docs.filter(doc => matchesFilter(doc, stage.$match));
      else if (stage.$group) {
        const grouped = new Map<string, AnyObject>();
        for (const doc of docs) {
          const key = groupKey(doc, stage.$group._id);
          if (!grouped.has(key)) grouped.set(key, { _id: key });
          const out = grouped.get(key)!;
          for (const [field, expression] of Object.entries(stage.$group)) {
            if (field === '_id') continue;
            if ((expression as AnyObject).$sum !== undefined) out[field] = (out[field] || 0) + Number((expression as AnyObject).$sum);
            if ((expression as AnyObject).$addToSet) {
              const value = valuesAt(doc, String((expression as AnyObject).$addToSet).slice(1).split('.'))[0];
              out[field] = [...new Set([...(out[field] || []), value])];
            }
          }
        }
        docs = [...grouped.values()];
      } else if (stage.$project) {
        docs = docs.map(doc => {
          const out: AnyObject = {};
          for (const [field, expression] of Object.entries(stage.$project)) {
            if (expression === 1) out[field] = doc[field];
            else if ((expression as AnyObject)?.$size) out[field] = (doc[String((expression as AnyObject).$size).slice(1)] || []).length;
          }
          return out;
        });
      } else if (stage.$sort) docs = sortDocs(docs, stage.$sort);
      else if (stage.$limit) docs = docs.slice(0, Number(stage.$limit));
    }
    return docs;
  }
}

export function createCompatModel(config: ModelConfig): CompatModel {
  return new CompatModel({ aliases: {}, arrayFields: [], jsonFields: [], subdocumentArrays: [], ...config });
}
