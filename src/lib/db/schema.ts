import {
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  googleId: text().notNull(),
  email: text().notNull(),
  chessUsername: text(),
  refreshToken: text(),
  accessToken: text(),
});

export const userSessions = pgTable("user_sessions", {
  sessionId: text().primaryKey(),
  userId: uuid()
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  expiresAt: timestamp().notNull(),
});

export const userCalendars = pgTable("user_calendars", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id),
  calendarId: text().notNull(),
});

export const gameSubscriptions = pgTable(
  "game_subscriptions",
  {
    subscriberId: uuid()
      .references(() => users.id)
      .notNull(),
    chessUsername: text().notNull(),
    createdAt: timestamp().notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.subscriberId, table.chessUsername] }),
  ]
);
