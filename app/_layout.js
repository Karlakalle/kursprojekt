//==========> _layout.js <==========

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Course List" }} />
      <Stack.Screen
        name="course/[name]"
        options={{ title: "Course Details" }}
      />
      <Stack.Screen
        name="holes/[courseName]/index"
        options={{ title: "Hole Info" }}
      />
      <Stack.Screen
        name="holes/[courseName]/[holeNo]"
        options={{ title: "Hole Details" }}
      />
      <Stack.Screen
        name="scoring/[courseName]"
        options={{ title: "Scoring" }}
      />
      <Stack.Screen
        name="scoreboard/[courseName]/[roundNo]"
        options={{ title: "Scoreboard" }}
      />
      <StatusBar style="auto" />
    </Stack>
  );
}
