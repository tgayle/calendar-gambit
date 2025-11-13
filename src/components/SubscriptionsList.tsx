import { useFetch } from "@/lib/hooks/useFetch";
import { Spinner } from "./ui/spinner";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "./ui/item";
import { Ghost, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";

export function SubscriptionsList({ onChange }: { onChange?: () => void }) {
  const { loading, data } = useFetch<{
    users: { name: string; since: string }[];
  }>("/subscriptions");

  if (loading) {
    return (
      <div className="flex justify-between">
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (!data.users.length) {
    return <div>No subscriptions yet :(</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {data?.users.map((sub) => (
        <UserItem user={sub} key={sub.name} onDeleted={onChange} />
      ))}
    </div>
  );
}

function UserItem({
  user,
  onDeleted,
}: {
  user: { name: string; since: string };
  onDeleted?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  if (deleting) {
    return null;
  }

  return (
    <Item>
      <ItemContent>
        <ItemTitle>{user.name}</ItemTitle>
        <ItemDescription>
          Since {new Date(user.since).toLocaleDateString()}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          variant="ghost"
          onClick={async () => {
            setDeleting(true);

            await fetch(`/subscriptions`, {
              method: "DELETE",
              body: JSON.stringify({ username: user.name }),
            });
            onDeleted?.();
          }}
        >
          <XIcon />
        </Button>
      </ItemActions>
    </Item>
  );
}
