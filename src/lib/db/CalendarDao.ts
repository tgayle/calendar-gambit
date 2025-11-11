import { eq } from "drizzle-orm";
import { db } from ".";
import { userCalendars } from "./schema";

class CalendarDao {
  getUserCalendar(userId: string) {
    return db.query.userCalendars.findFirst({
      where: (userCalendars) => eq(userCalendars.userId, userId),
    });
  }

  createUserCalendar(userId: string, calendarId: string) {
    return db.insert(userCalendars).values({
      userId,
      calendarId,
    });
  }
}

export default new CalendarDao();
