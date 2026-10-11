import { useRouter } from "expo-router";
import { Button } from "@workspace/stillwell-design-system/components/native/button";
import { Card } from "@workspace/stillwell-design-system/components/native/card";
import { Text } from "@workspace/stillwell-design-system/components/native/text";
import { Screen } from "@/components/Screen";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <Screen>
      <Card>
        <Text variant="heading">We couldn’t find that page</Text>
        <Button onPress={() => router.replace("/")}>Return to Stillwell</Button>
      </Card>
    </Screen>
  );
}
