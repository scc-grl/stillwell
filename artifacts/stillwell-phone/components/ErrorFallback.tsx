import { useState } from "react";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Screen } from "@/components/Screen";
import { reloadAppAsync } from "expo";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ resetError }: ErrorFallbackProps) {
  const [retrying, setRetrying] = useState(false);

  async function retry() {
    setRetrying(true);
    try {
      await reloadAppAsync();
    } catch {
      setRetrying(false);
      resetError();
    }
  }

  return (
    <Screen>
      <Card>
        <Text variant="heading">Stillwell needs to restart</Text>
        <Text variant="body">
          Your journal details are not shown here. Try reopening the app.
        </Text>
        <Button onPress={() => void retry()} disabled={retrying}>
          {retrying ? "Restarting…" : "Try again"}
        </Button>
      </Card>
    </Screen>
  );
}
