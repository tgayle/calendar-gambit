import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import "./index.css";
import { Spinner } from "./components/ui/spinner";
import { createContext, useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { useFetch } from "./lib/hooks/useFetch";
import { SubscriptionsList } from "./components/SubscriptionsList";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";

type User = {
  id: string;
  chessUsername: string;
  email: string;
};

const UserContext = createContext<User | null>(null);

export function App() {
  const user = useUser();
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <UserContext.Provider value={user.data}>
      <div className="container mx-auto p-8 relative z-10 ">
        <div className="flex justify-center items-center gap-8 mb-8">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Calendar Gambit</CardTitle>
            </CardHeader>
            <CardContent>
              {user.loading ? (
                <div className="flex justify-center">
                  <Spinner />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="self-end">
                    <Button variant="outline" className="">
                      Sign out
                    </Button>
                  </div>

                  <div>
                    <Label htmlFor="add_subscription">
                      Follow a user's games:
                    </Label>

                    <AddSubscriptionForm
                      onAdded={() => setRefreshKey(refreshKey + 1)}
                    />
                  </div>

                  <SubscriptionsList
                    key={refreshKey}
                    onChange={() => setRefreshKey(refreshKey + 1)}
                  />
                </div>
              )}
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
