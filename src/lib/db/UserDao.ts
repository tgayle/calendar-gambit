import { eq } from "drizzle-orm";
import { db } from ".";
import { users } from "./schema";

class UserDao {
  getUserByEmail(email: string) {
    return db.query.users.findFirst({
      where: (users) => eq(users.email, email),
    });
  }

  getUserById(id: string) {
    return db.query.users.findFirst({
      where: (users) => eq(users.id, id),
    });
  }

  async createUser(
    id: string,
    email: string,
    refreshToken: string,
    accessToken?: string
  ) {
    const created = await db
      .insert(users)
      .values({
        id,
        email,
        refreshToken,
        accessToken,
      })
      .returning();

    return created[0];
  }
}

export default new UserDao();
