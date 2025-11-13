import ky from "ky";
import type { EventAttributes } from "ics";

type PostGamePlayer = {
  rating: number;
  result: string;
  uuid: string;
  username: string;
  "@id": string;
};

type Game = {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  uuid: string;
  time_class: string;
  white: PostGamePlayer;
  black: PostGamePlayer;
};

class ChessAPI {
  getArchivedGames(username: string) {
    console.log("Fetching archives for", username);
    return ky(`https://api.chess.com/pub/player/${username}/games/archives`, {
      throwHttpErrors: false,
    }).json<{ archives: string[] } | { code: 0 }>();
  }

  getArchivedGamesByUrl(url: string) {
    console.log("Fetching archived games from", url);
    return ky(url).json<{ games: Game[] }>();
  }

  async getAllArchivedGames(username: string) {
    const archives = await this.getArchivedGames(username);

    if ("code" in archives) {
      return [];
    }

    const allGames = await Promise.all(
      archives.archives.map((archive) => this.getArchivedGamesByUrl(archive))
    );
    return allGames.flatMap((archive) => archive.games);
  }
}

export function gameToEvent(game: Game, user: string): EventAttributes {
  const won =
    game.white.username.toLowerCase() === user.toLowerCase()
      ? game.white.result === "win"
      : game.black.result === "win";

  const icon = won ? "👑" : "❌";

  const description = [
    `Type: ${capitalize(game.time_class)} (${game.time_control})`,
    `Rated: ${game.rated ? "Yes" : "No"}`,
    `White: ${game.white.username} (${game.white.rating}) - ${capitalize(
      game.white.result
    )}`,
    `Black: ${game.black.username} (${game.black.rating}) - ${capitalize(
      game.black.result
    )}`,
    ``,
    game.url,
  ];

  return {
    start: (game.end_time - (parseInt(game.time_control, 10) || 600)) * 1000,
    end: game.end_time * 1000,
    title: `♟️ ${game.white.username} vs ${game.black.username} - ${capitalize(
      game.time_class
    )} ${icon}`,
    description: description.join("\n"),
    url: game.url,
  };
}

export default new ChessAPI();

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
