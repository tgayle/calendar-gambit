import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "./index.css";
import { Spinner } from "./components/ui/spinner";
import { createContext, useState } from "react";
import { Button } from "./components/ui/button";
import { useFetch } from "./lib/hooks/useFetch";
import { Input } from "./components/ui/input";
import { Separator } from "./components/ui/separator";
import { CopyIcon } from "lucide-react";

type User = {
  id: string;
  chessUsername: string;
  email: string;
};

const UserContext = createContext<User | null>(null);

export function App() {
  const user = useUser();
  const [username, setUsername] = useState("MagnusCarlsen");
  const icsUrl = `${window.location.origin}/games/${username}/calendar.ics`;
  return (
    <UserContext.Provider value={user.data}>
      <div className="container mx-auto p-8 relative z-10 ">
        <div className="flex justify-center items-center gap-8 mb-8">
          <Card className="w-120">
            <CardHeader>
              <CardTitle>Calendar Gambit</CardTitle>
            </CardHeader>
            <CardContent>
              This website exports Chess.com games to iCalendar format, so you
              can import them into your calendar application of choice.
              <Separator className="my-4" />
              <div className="flex items-baseline flex-wrap pb-4">
                To subscribe to games for{" "}
                <span className="whitespace-break-spaces">
                  <Input
                    className="w-min mx-1"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </span>{" "}
                use the following URL in your calendar app:
              </div>
              <div className="flex gap-2">
                <Input disabled value={icsUrl}></Input>
                <Button
                  onClick={() => navigator.clipboard.writeText(icsUrl)}
                  variant="outline"
                >
                  <CopyIcon />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UserContext.Provider>
  );
}

function AddSubscriptionForm({ onAdded }: { onAdded?: () => void }) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
          const result = (await fetch("/subscriptions", {
            method: "POST",
            body: JSON.stringify({
              username: value,
            }),
          }).then((res) => res.json())) as { error: string } | { error: null };

          if (result.error) {
            setError(result.error);
          } else {
            setValue("");
            onAdded?.();
          }
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <div className="flex gap-2">
        <div>
          <Input
            id="add_subscription"
            placeholder="MagnusCarlson"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
          />
          {error && <div className="text-sm text-red-500 pt-1">{error}</div>}
        </div>
        <Button disabled={submitting}>
          {submitting ? <Spinner /> : "Subscribe"}
        </Button>
      </div>
    </form>
  );
}

function useUser() {
  return useFetch<User>("/me");
}

export default App;
