import { serve } from "bun";
import index from "./index.html";
import chess, { gameToEvent } from "./lib/chess";
import { createEvents } from "ics";
import { google } from "googleapis";
import googleCreds from "../google_secret.json";
import UserDao from "./lib/db/UserDao";

const getGoogleOauthClient = () =>
  new google.auth.OAuth2(
    googleCreds.web.client_id,
    googleCreds.web.client_secret,
    googleCreds.web.redirect_uris[0]
  );

const googleOauth = getGoogleOauthClient();

const server = serve({
  routes: {
    "/*": index,

    "/games/:username": {
      async GET(req) {
        return Response.json({
          message: `Get calendar for ${req.params.username}`,
          games: await chess.getAllArchivedGames(req.params["username"]),
          method: "GET",
        });
      },
    },
    "/games/:username/calendar.ics": {
      async GET(req) {
        const username = req.params["username"];
        const games = await chess.getAllArchivedGames(username);
        const cal = createEvents(
          games.map((game) => gameToEvent(game, username))
        );

        if (cal.error) {
          return Response.json(
            {
              error: cal.error.message,
            },
            {
              status: 500,
            }
          );
        }

        return new Response(cal.value, {
          headers: {
            "Content-Type": "text/calendar",
            "Content-Disposition": `attachment; filename="${username}-games.ics"`,
          },
        });
      },
    },

    "/me": async (req) => {
      const user = await requireAuthorized(req);
      if (!user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return Response.json({
        id: user.id,
        chessUsername: user.chessUsername,
        email: user.email,
      });
    },
    "/subscriptions": {
      GET: async (req) => {
        const user = await requireAuthorized(req);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const subs = await UserDao.getUserSubscriptions(user.id);

        return Response.json({
          users: subs.map((it) => ({
            name: it.chessUsername,
            since: it.createdAt,
          })),
        });
      },
      POST: async (req) => {
        const user = await requireAuthorized(req);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { username } = await req.json();

        if (!username) {
          return Response.json({
            error: "Username required",
          });
        }

        const archives = await chess.getArchivedGames(username);
        if ("code" in archives) {
          return Response.json({
            error: "User not found",
          });
        }

        await UserDao.createUserSubscription(user.id, username);

        return Response.json({});
      },
      DELETE: async (req) => {
        const user = await requireAuthorized(req);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { username } = await req.json();

        if (!username) {
          return Response.json({
            error: "Username required",
          });
        }

        await UserDao.deleteUserSubscription(user.id, username);

        return Response.json({});
      },
    },

    "/auth/google": async (req) => {
      const scopes = [
        "https://www.googleapis.com/auth/calendar.app.created",
        "https://www.googleapis.com/auth/userinfo.email",
      ];

      const state = crypto.randomUUID();
      const url = googleOauth.generateAuthUrl({
        access_type: "online",
        scope: scopes,
        include_granted_scopes: true,
        state,
      });
      return Response.redirect(url);
    },
    "/redirect": async (req) => {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const error = url.searchParams.get("error");
      if (!code || !state) {
        console.warn("Missing code or state in OAuth2 redirect", {
          code,
          state,
        });
        return Response.redirect("/");
      }

      if (error) {
        console.warn("Error returned in OAuth2 redirect", { error });
        return Response.redirect("/");
      }

      const { tokens } = await googleOauth.getToken(code);

      const userClient = getGoogleOauthClient();
      userClient.setCredentials(tokens);

      const userInfo = await google
        .oauth2("v2")
        .userinfo.get({ oauth_token: tokens.access_token! });

      const userId = userInfo.data.id!;
      const email = userInfo.data.email!;

      let user = await UserDao.getUserByGoogleId(userId);
      if (!user) {
        console.log("Creating new user in DB:", { userId, email });
        user = await UserDao.createUser(
          userId,
          email,
          tokens.refresh_token!,
          tokens.access_token!
        );
      }

      const session = await UserDao.createUserSession(user.id);

      req.cookies.set("session", session.sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });

      return Response.redirect("/");
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);

async function requireAuthorized(req: Bun.BunRequest) {
  const sessionId = req.cookies.get("session");

  if (sessionId) {
    const session = await UserDao.getSessionById(sessionId);

    if (session) {
      const user = await UserDao.getUserById(session.userId);
      if (user) {
        return user;
      }
    }
  }

  req.cookies.delete("session");
  return null;
}
