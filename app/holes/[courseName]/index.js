import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getHoles } from "../../../database/database";

export default function HoleList() {
  const { courseName } = useLocalSearchParams();
  const [holes, setHoles] = useState([]);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const data = await getHoles(decodeURIComponent(courseName));
        setHoles(data);
      };
      load();
    }, [courseName]),
  );

  const handleHolePress = (hole) => {
    router.push(`/holes/${encodeURIComponent(courseName)}/${hole.hole_no}`);
  };

  const handleAddNew = () => {
    router.push(`/holes/${encodeURIComponent(courseName)}/new`);
  };

  const renderHole = ({ item }) => (
    <TouchableOpacity
      style={styles.holeItem}
      onPress={() => handleHolePress(item)}
    >
      <View style={styles.holeRow}>
        <Text style={styles.holeNo}>#{item.hole_no}</Text>
        <Text style={styles.holeName}>{item.name}</Text>
        <Text style={styles.holeStat}>Par {item.par}</Text>
        <Text style={styles.holeStat}>{item.distance}m</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Holes — {decodeURIComponent(courseName)}</Text>
      <FlatList
        data={holes}
        renderItem={renderHole}
        keyExtractor={(item) => item.hole_no.toString()}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 40 },
        ]}
        style={{ marginBottom: insets.bottom + 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>No holes added yet.</Text>
        }
      />
      <TouchableOpacity
        style={[styles.addButton, { bottom: insets.bottom + 20 }]}
        onPress={handleAddNew}
      >
        <Text style={styles.addButtonText}>Add New Hole</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 16,
  },
  list: {
    paddingBottom: 80,
  },
  holeItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  holeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  holeNo: {
    fontSize: 16,
    fontWeight: "bold",
    width: 36,
  },
  holeName: {
    fontSize: 16,
    flex: 1,
  },
  holeStat: {
    fontSize: 14,
    color: "#666",
    width: 60,
    textAlign: "right",
  },
  empty: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 15,
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
