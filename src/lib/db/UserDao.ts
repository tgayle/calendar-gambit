import { and, eq, lt } from "drizzle-orm";
import { db } from ".";
import { gameSubscriptions, users, userSessions } from "./schema";
import crypto from "crypto";

class UserDao {
  getUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: (users) => eq(users.email, email),
    });
  }

  getUserByGoogleId(googleId: string) {
    return db.query.users.findFirst({
      where: (users) => eq(users.googleId, googleId),
    });
  }

  getUserById(id: string) {
    return db.query.users.findFirst({
      where: (users) => eq(users.id, id),
    });
  }

  async createUser(
    googleId: string,
    email: string,
    refreshToken: string,
    accessToken?: string
  ) {
    const created = await db
      .insert(users)
      .values({
        googleId: googleId,
        email,
        refreshToken,
        accessToken,
      })
      .returning();

    return created[0];
  }

  async createUserSession(userId: string) {
    return await db.transaction(async (tx) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      const removedSessions = await tx
        .delete(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            lt(userSessions.expiresAt, new Date())
          )
        );

      console.log(
        `Cleaned up ${removedSessions.rowCount} expired sessions for user ${userId}`
      );

      const id = crypto.randomUUID();
      const signed = sign(id);

      const [session] = await tx
        .insert(userSessions)
        .values({
          sessionId: signed,
          userId,
          createdAt: new Date(),
          expiresAt,
        })
        .returning();

      return session;
    });
  }

  async getSessionById(sessionId: string) {
    return db.query.userSessions.findFirst({
      where: (userSessions) => eq(userSessions.sessionId, sessionId),
    });
  }

  async getUserSubscriptions(userId: string) {
    return db.query.gameSubscriptions.findMany({
      where: (t) => eq(t.subscriberId, userId),
    });
  }

  async createUserSubscription(userId: string, chessUsername: string) {
    return db.insert(gameSubscriptions).values({
      subscriberId: userId,
      chessUsername,
    });
  }

  async deleteUserSubscription(userId: string, chessUsername: string) {
    return db
      .delete(gameSubscriptions)
      .where(
        and(
          eq(gameSubscriptions.subscriberId, userId),
          eq(gameSubscriptions.chessUsername, chessUsername)
        )
      );
  }
}

export default new UserDao();

function sign(content: string) {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not defined");
  }

  return crypto
    .createHmac("sha256", secret)
    .update(content, "utf8")
    .digest("hex");
}
