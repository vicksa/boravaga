import { sqliteTable, text } from "drizzle-orm/sqlite-core";
export const jobs = sqliteTable("jobs", { id: text("id").primaryKey(), payload: text("payload").notNull(), expires: text("expires"), checked: text("checked").notNull() });
export const favorites = sqliteTable("favorites", { id: text("id").primaryKey(), visitor: text("visitor").notNull(), job: text("job").notNull() });
