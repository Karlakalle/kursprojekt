import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function Layout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Course List' }} />
        <Stack.Screen name="course/[name]" options={{ title: 'Course Details' }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}