import { supabaseAdmin } from './supabase';

/**
 * Supabase adapter that mimics the MongoDB collection API used throughout the codebase.
 * This allows all existing routes to work with minimal changes — just replace the import.
 */

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
  let query = supabaseAdmin.from(tableName).select('*');

  const filterStr = convertFilter(filter);
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

function collectionShim(tableName: string) {
  return {
    async find(filter: any = {}, options?: any) {
      let query = supabaseAdmin.from(tableName).select('*');
      query = applySupabaseFilters(query, filter);

      return {
        sort: (sortObj: any) => {
          const sorts = convertSort(sortObj);
          for (const s of sorts) {
            query = query.order(s.column, { ascending: s.ascending });
          }
          return {
            skip: (n: number) => {
              query = query.range(n, n + 9999);
              return {
                limit: (n: number) => {
                  query = query.limit(n);
                  return {
                    toArray: async () => {
                      const { data } = await query;
                      return data || [];
                    },
                  };
                },
                toArray: async () => {
                  const { data } = await query;
                  return data || [];
                },
              };
            },
            limit: (n: number) => {
              query = query.limit(n);
              return {
                toArray: async () => {
                  const { data } = await query;
                  return data || [];
                },
              };
            },
            toArray: async () => {
              const { data } = await query;
              return data || [];
            },
          };
        },
        toArray: async () => {
          const { data } = await query;
          return data || [];
        },
      };
    },

    async findOne(filter: any = {}) {
      let query = supabaseAdmin.from(tableName).select('*').limit(1);
      query = applySupabaseFilters(query, filter);
      const { data } = await query;
      return data && data.length > 0 ? data[0] : null;
    },

    async countDocuments(filter: any = {}) {
      let query = supabaseAdmin.from(tableName).select('*', { count: 'exact', head: true });
      query = applySupabaseFilters(query, filter);
      const { count } = await query;
      return count || 0;
    },

    async insertOne(doc: any) {
      const { data, error } = await supabaseAdmin.from(tableName).insert(doc).select().single();
      if (error) throw new Error(error.message);
      return { insertedId: doc.id || data?.id, ops: [data] };
    },

    async insertMany(docs: any[]) {
      const { data, error } = await supabaseAdmin.from(tableName).insert(docs).select();
      if (error) throw new Error(error.message);
      return { insertedCount: docs.length, insertedIds: docs.map(d => d.id) };
    },

    async updateOne(filter: any, update: any) {
      const updateData = update.$set || update;
      const filterParts: string[] = [];
      const filterValues: any = {};

      // For Supabase, we need to find the record first, then update by id
      let selectQuery = supabaseAdmin.from(tableName).select('id').limit(1);
      selectQuery = applySupabaseFilters(selectQuery, filter);
      const { data: existing } = await selectQuery;

      if (!existing || existing.length === 0) {
        // Handle upsert case
        if (update.$set) {
          const newDoc = { ...update.$set, ...filter };
          if (update.$unset) {
            for (const key of Object.keys(update.$unset)) {
              newDoc[key] = null;
            }
          }
          const { data, error } = await supabaseAdmin.from(tableName).upsert(newDoc, { onConflict: 'id' }).select();
          if (error) throw new Error(error.message);
          return { matchedCount: 1, modifiedCount: 1, upsertedId: newDoc.id };
        }
        return { matchedCount: 0, modifiedCount: 0 };
      }

      const recordId = existing[0].id;
      let setPayload: any = {};

      if (update.$set) {
        setPayload = { ...update.$set };
      } else {
        setPayload = { ...update };
      }

      if (update.$unset) {
        for (const key of Object.keys(update.$unset)) {
          setPayload[key] = null;
        }
      }

      // Remove undefined values
      Object.keys(setPayload).forEach(key => {
        if (setPayload[key] === undefined) delete setPayload[key];
      });

      const { error } = await supabaseAdmin.from(tableName).update(setPayload).eq('id', recordId);
      if (error) throw new Error(error.message);

      return { matchedCount: 1, modifiedCount: 1 };
    },

    async updateMany(filter: any, update: any) {
      let selectQuery = supabaseAdmin.from(tableName).select('id');
      selectQuery = applySupabaseFilters(selectQuery, filter);
      const { data: records } = await selectQuery;

      if (!records || records.length === 0) {
        return { matchedCount: 0, modifiedCount: 0 };
      }

      let updateData: any = {};
      if (update.$set) {
        updateData = update.$set;
      } else if (update.$pull) {
        // For $pull on arrays, we need to handle each record
        for (const record of records) {
          for (const [field, value] of Object.entries(update.$pull)) {
            const currentArray = record[field] || [];
            const newArray = currentArray.filter((v: any) => v !== value);
            await supabaseAdmin.from(tableName).update({ [field]: newArray }).eq('id', record.id);
          }
        }
        return { matchedCount: records.length, modifiedCount: records.length };
      } else {
        updateData = update;
      }

      // Update all matching records
      for (const record of records) {
        const { error } = await supabaseAdmin.from(tableName).update(updateData).eq('id', record.id);
        if (error) throw new Error(error.message);
      }

      return { matchedCount: records.length, modifiedCount: records.length };
    },

    async deleteOne(filter: any) {
      let query = supabaseAdmin.from(tableName).delete().limit(1);
      query = applySupabaseFilters(query, filter);
      const { error, count } = await query;
      if (error) throw new Error(error.message);
      return { deletedCount: 1 };
    },

    async deleteMany(filter: any) {
      let query = supabaseAdmin.from(tableName).delete();
      query = applySupabaseFilters(query, filter);
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
