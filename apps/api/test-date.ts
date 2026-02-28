import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

const testTable = sqliteTable('test', {
  id: text('id'),
  ts: integer('ts', { mode: 'timestamp' }),
  ts_ms: integer('ts_ms', { mode: 'timestamp_ms' })
});
console.log(testTable.ts.mapToDriverValue(new Date(1742018400000)));
console.log(testTable.ts_ms.mapToDriverValue(new Date(1742018400000)));
