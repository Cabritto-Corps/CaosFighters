import { View, Text, Button } from "react-native";

export default function Home() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text>Hello World 🚀</Text>
      <Button title="Click me" onPress={() => alert("Button pressed")} />
    </View>
  );
}
