import { getSupabaseAdmin } from './supabase';

/**
 * Supabase adapter that mimics the MongoDB collection API used throughout the codebase.
 * This allows all existing routes to work with minimal changes — just replace the import.
 *
 * Automatically converts camelCase ↔ snake_case so existing routes keep using camelCase
 * while Supabase PostgreSQL tables store snake_case columns.
 */

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToSnake(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToSnake);
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip MongoDB-specific operators ($set, $unset, $pull, $push, etc.)
    if (key.startsWith('$')) {
      result[key] = value;
    } else {
      result[toSnakeCase(key)] = convertKeysToSnake(value);
    }
  }
  return result;
}

function convertKeysToCamel(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertKeysToCamel);
  if (typeof obj !== 'object') return obj;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = convertKeysToCamel(value);
  }
  return result;
}

function convertFilter(filter: any): string {
  // Returns a Supabase-compatible filter string
  if (!filter || Object.keys(filter).length === 0) return '';

  const parts: string[] = [];
  for (const [key, value] of Object.entries(filter)) {
    if (value === null) {
      parts.push(`${key}.is.null`);
    } else if (typeof value === 'object' && value !== null) {
      const v = value as any;
      if ('$in' in v) {
        parts.push(`${key}.in.(${v.$in.join(',')})`);
      } else if ('$ne' in v) {
        parts.push(`${key}.neq.${v.$ne}`);
      } else if ('$gte' in v) {
        parts.push(`${key}.gte.${v.$gte}`);
      } else if ('$lte' in v) {
        parts.push(`${key}.lte.${v.$lte}`);
      } else if ('$gt' in v) {
        parts.push(`${key}.gt.${v.$gt}`);
      } else if ('$lt' in v) {
        parts.push(`${key}.lt.${v.$lt}`);
      } else if ('$regex' in v) {
        // PostgreSQL ilike for case-insensitive regex
        parts.push(`${key}.ilike.%${v.$regex}%`);
      } else if ('$ne' in v) {
        parts.push(`${key}.neq.${v.$ne}`);
      }
    } else {
      parts.push(`${key}.eq.${value}`);
    }
  }
  return parts.join(',');
}

function convertSort(sortObj: any): { column: string; ascending: boolean }[] {
  if (!sortObj) return [];
  return Object.entries(sortObj).map(([key, val]) => ({
    column: key,
    ascending: val === 1,
  }));
}

function buildQuery(tableName: string, filter: any, sort?: any, offset?: number, limit?: number) {
  const snakeFilter = convertKeysToSnake(filter);
  let query = getSupabaseAdmin().from(tableName).select('*');

  const filterStr = convertFilter(snakeFilter);
  if (filterStr) {
    query = query.or(filterStr);
  }

  if (sort) {
    const sorts = convertSort(sort);
    for (const s of sorts) {
      query = query.order(s.column, { ascending: s.ascending });
    }
  }

  if (offset && offset > 0) {
    query = query.range(offset, offset + (limit || 1000) - 1);
  } else if (limit && limit > 0) {
    query = query.limit(limit);
  }

  return query;
}

function buildFilterObject(filter: any): any {
  // Build a more precise filter for Supabase using individual eq() calls
  if (!filter || Object.keys(filter).length === 0) return {};

  const result: any = {};
  for (const [key, value] of Object.entries(filter)) {
    if (value === null) {
      result[key] = null;
    } else if (typeof value === 'object' && value !== null) {
      const v = value as any;
      if ('$in' in v) {
        result[key] = v.$in;
      } else if ('$ne' in v) {
        result[key] = { neq: v.$ne };
      } else if ('$gte' in v) {
        result[key] = { gte: v.$gte };
      } else if ('$lte' in v) {
        result[key] = { lte: v.$lte };
      } else if ('$gt' in v) {
        result[key] = { gt: v.$gt };
      } else if ('$lt' in v) {
        result[key] = { lt: v.$lt };
      } else if ('$regex' in v) {
        result[key] = { ilike: `%${v.$regex}%` };
      } else if ('$ne' in v) {
        result[key] = { neq: v.$ne };
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function applySupabaseFilters(query: any, filter: any) {
  if (!filter || Object.keys(filter).length === 0) return query;

  for (const [key, value] of Object.entries(filter)) {
    if (value === null) {
      query = query.is(key, null);
    } else if (typeof value === 'object' && value !== null) {
      const v = value as any;
      if ('$in' in v) {
        query = query.in(key, v.$in);
      } else if ('$ne' in v) {
        query = query.neq(key, v.$ne);
      } else if ('$gte' in v) {
        query = query.gte(key, v.$gte);
      } else if ('$lte' in v) {
        query = query.lte(key, v.$lte);
      } else if ('$gt' in v) {
        query = query.gt(key, v.$gt);
      } else if ('$lt' in v) {
        query = query.lt(key, v.$lt);
      } else if ('$regex' in v) {
        query = query.ilike(key, `%${v.$regex}%`);
      }
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function createCursor(tableName: string, filter: any = {}) {
  const snakeFilter = convertKeysToSnake(filter);
  let query = getSupabaseAdmin().from(tableName).select('*');
  query = applySupabaseFilters(query, snakeFilter);

  let offsetVal = 0;
  let limitVal: number | null = null;
  let executed: Promise<any[]> | null = null;

  const exec = (): Promise<any[]> => {
    if (!executed) {
      let finalQuery = query;
      if (limitVal !== null && limitVal > 0) {
        finalQuery = finalQuery.range(offsetVal, offsetVal + limitVal - 1);
      } else if (offsetVal > 0) {
        finalQuery = finalQuery.range(offsetVal, undefined as any);
      }
      const run = async () => {
        const { data }: any = await finalQuery;
        return (data || []).map(convertKeysToCamel);
      };
      executed = run();
    }
    return executed;
  };

  const cursor: any = {
    sort(sortObj: any) {
      if (sortObj) {
        for (const s of convertSort(sortObj)) {
          query = query.order(s.column, { ascending: s.ascending });
        }
      }
      return cursor;
    },
    skip(n: number) {
      offsetVal = n;
      return cursor;
    },
    limit(n: number) {
      limitVal = n;
      return cursor;
    },
    toArray() {
      return exec();
    },
    [Symbol.asyncIterator]() {
      let items: any[] | null = null;
      let index = 0;
      return {
        async next(): Promise<IteratorResult<any>> {
          if (items === null) items = await exec();
          if (index < items.length) {
            return { value: items[index++], done: false };
          }
          return { value: undefined as any, done: true };
        },
      };
    },
  };

  return cursor;
}

function collectionShim(tableName: string) {
  return {
    find(filter: any = {}) {
      return createCursor(tableName, filter);
    },

    async findOne(filter: any = {}) {
      const snakeFilter = convertKeysToSnake(filter);
      let query = getSupabaseAdmin().from(tableName).select('*').limit(1);
      query = applySupabaseFilters(query, snakeFilter);
      const { data } = await query;
      if (!data || data.length === 0) return null;
      return convertKeysToCamel(data[0]);
    },

    async countDocuments(filter: any = {}) {
      const snakeFilter = convertKeysToSnake(filter);
      let query = getSupabaseAdmin().from(tableName).select('*', { count: 'exact', head: true });
      query = applySupabaseFilters(query, snakeFilter);
      const { count } = await query;
      return count || 0;
    },

    async insertOne(doc: any) {
      const snakeDoc = convertKeysToSnake(doc);
      const { data, error } = await getSupabaseAdmin().from(tableName).insert(snakeDoc).select().single();
      if (error) throw new Error(error.message);
      return { insertedId: doc.id || data?.id, ops: [data] };
    },

    async insertMany(docs: any[]) {
      const snakeDocs = docs.map(convertKeysToSnake);
      const { data, error } = await getSupabaseAdmin().from(tableName).insert(snakeDocs).select();
      if (error) throw new Error(error.message);
      return { insertedCount: docs.length, insertedIds: docs.map(d => d.id) };
    },

    async updateOne(filter: any, update: any) {
      const snakeFilter = convertKeysToSnake(filter);
      const updateData = update.$set || update;
      const filterParts: string[] = [];
      const filterValues: any = {};

      // For Supabase, we need to find the record first, then update by id
      let selectQuery = getSupabaseAdmin().from(tableName).select('id').limit(1);
      selectQuery = applySupabaseFilters(selectQuery, snakeFilter);
      const { data: existing } = await selectQuery;

      if (!existing || existing.length === 0) {
        // Handle upsert case
        if (update.$set) {
          const newDoc = convertKeysToSnake({ ...update.$set, ...snakeFilter });
          if (update.$unset) {
            for (const key of Object.keys(update.$unset)) {
              newDoc[toSnakeCase(key)] = null;
            }
          }
          const { data, error } = await getSupabaseAdmin().from(tableName).upsert(newDoc, { onConflict: 'id' }).select();
          if (error) throw new Error(error.message);
          return { matchedCount: 1, modifiedCount: 1, upsertedId: newDoc.id };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }

      const recordId = existing[0].id;
      let setPayload: any = {};

      if (update.$set) {
        setPayload = convertKeysToSnake({ ...update.$set });
      } else {
        setPayload = convertKeysToSnake({ ...update });
      }

      if (update.$unset) {
        for (const key of Object.keys(update.$unset)) {
          setPayload[toSnakeCase(key)] = null;
        }
      }

      // Remove undefined values
      Object.keys(setPayload).forEach(key => {
        if (setPayload[key] === undefined) delete setPayload[key];
      });

      const { error } = await getSupabaseAdmin().from(tableName).update(setPayload).eq('id', recordId);
      if (error) throw new Error(error.message);

      return { matchedCount: 1, modifiedCount: 1 };
    },

    async updateMany(filter: any, update: any) {
      const snakeFilter = convertKeysToSnake(filter);
      let selectQuery = getSupabaseAdmin().from(tableName).select('id');
      selectQuery = applySupabaseFilters(selectQuery, snakeFilter);
      const { data: records } = await selectQuery;

      if (!records || records.length === 0) {
        return { matchedCount: 0, modifiedCount: 0 };
      }

      let updateData: any = {};
      if (update.$set) {
        updateData = convertKeysToSnake(update.$set);
      } else if (update.$pull) {
        // For $pull on arrays, we need to handle each record
        for (const record of records) {
          for (const [field, value] of Object.entries(update.$pull)) {
            const snakeField = toSnakeCase(field);
            const currentArray = record[snakeField] || [];
            const newArray = currentArray.filter((v: any) => v !== value);
            await getSupabaseAdmin().from(tableName).update({ [snakeField]: newArray }).eq('id', record.id);
          }
        }
        return { matchedCount: records.length, modifiedCount: records.length };
      } else {
        updateData = convertKeysToSnake(update);
      }

      // Update all matching records
      for (const record of records) {
        const { error } = await getSupabaseAdmin().from(tableName).update(updateData).eq('id', record.id);
        if (error) throw new Error(error.message);
      }

      return { matchedCount: records.length, modifiedCount: records.length };
    },

    async deleteOne(filter: any) {
      const snakeFilter = convertKeysToSnake(filter);
      let query = getSupabaseAdmin().from(tableName).delete().limit(1);
      query = applySupabaseFilters(query, snakeFilter);
      const { error, count } = await query;
      if (error) throw new Error(error.message);
      return { deletedCount: 1 };
    },

    async deleteMany(filter: any) {
      const snakeFilter = convertKeysToSnake(filter);
      let query = getSupabaseAdmin().from(tableName).delete();
      query = applySupabaseFilters(query, snakeFilter);
      const { error } = await query;
      if (error) throw new Error(error.message);
      return { deletedCount: 1 };
    },
  };
}

// Simulate the MongoDB db object
const db = {
  collection: (name: string) => collectionShim(name),
};

export async function connectToDatabase() {
  return { db };
}
