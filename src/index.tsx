import { serve } from "bun";
import index from "./index.html";
import chess, { gameToEvent } from "./lib/chess";
import { createEvents } from "ics";
import { google } from "googleapis";
import googleCreds from "../google_secret.json";

const getGoogleOauthClient = () =>
  new google.auth.OAuth2(
    googleCreds.web.client_id,
    googleCreds.web.client_secret,
    googleCreds.web.redirect_uris[0]
  );

const googleOauth = getGoogleOauthClient();

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
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

    "/auth/google": async (req) => {
      const scopes = ["https://www.googleapis.com/auth/calendar.app.created"];

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

      console.log({ code, state });

      const { tokens } = await googleOauth.getToken(code);
      console.log("Obtained tokens:", tokens);

      const userClient = getGoogleOauthClient();
      userClient.setCredentials(tokens);
      return Response.json({});
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
