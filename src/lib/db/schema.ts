import { pgTable, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text().primaryKey(),
  email: text().notNull(),
  refreshToken: text(),
  accessToken: text(),
});

export const userCalendars = pgTable("user_calendars", {
  userId: text()
    .primaryKey()
    .references(() => users.id),
  calendarId: text().notNull(),
});
