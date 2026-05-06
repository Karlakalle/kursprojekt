//==========> app/scoring/[courseName].js <==========

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOngoingRound, getHolesToScore } from "../../database/database";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ScoringPage() {
  const { courseName } = useLocalSearchParams();
  const router = useRouter();
  const decoded = decodeURIComponent(courseName);

  const [round, setRound] = useState(null);
  const [holes, setHoles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      async function fetchData() {
        try {
          const ongoingRound = await getOngoingRound(decoded);
          setRound(ongoingRound);
          const holeList = await getHolesToScore(
            decoded,
            ongoingRound.round_no,
          );
          setHoles(holeList);
          setCurrentIndex(0);
        } catch (e) {
          console.error("Failed to load scoring data", e);
        }
      }
      fetchData();
    }, [decoded]),
  );

  // Total items: holes + 1 "Add New" sentinel
  const totalItems = holes.length + 1;
  const totalItemsRef = useRef(totalItems);
  totalItemsRef.current = totalItems;
  const isAddNew = currentIndex >= holes.length;
  const currentHole = isAddNew ? null : holes[currentIndex];
  const selectedHoleNo = isAddNew ? 0 : (currentHole?.hole_no ?? 0);

  // Swipe handler
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          // Swipe up → next
          setCurrentIndex((prev) =>
            prev < totalItemsRef.current - 1 ? prev + 1 : prev,
          );
        } else if (gestureState.dy > 30) {
          // Swipe down → previous
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
      },
    }),
  ).current;

  const handleHolePress = () => {
    if (isAddNew) {
      router.push(`/holes/${encodeURIComponent(decoded)}/new`);
    } else {
      router.push(`/holes/${encodeURIComponent(decoded)}/${selectedHoleNo}`);
    }
  };

  const renderHoleCard = () => {
    if (isAddNew) {
      return (
        <TouchableOpacity style={styles.holeCard} onPress={handleHolePress}>
          <View style={styles.holeRow}>
            <Text style={styles.holeNo}></Text>
            <Text style={[styles.holeName, styles.addNewText]}>Add New</Text>
            <Text style={styles.holeStat}></Text>
            <Text style={styles.holeStat}></Text>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.holeCard} onPress={handleHolePress}>
        <View style={styles.holeRow}>
          <Text style={styles.holeNo}>#{currentHole.hole_no}</Text>
          <Text style={styles.holeName}>{currentHole.name}</Text>
          <Text style={styles.holeStat}>Par {currentHole.par}</Text>
          <Text style={styles.holeStat}>{currentHole.distance}m</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Upper Section: List ── */}
      <View style={styles.listSection}>
        <Text style={styles.headerLine1}>
          {decoded} — Round {round?.round_no ?? "…"}
        </Text>
        <Text style={styles.headerLine2}>Next Hole</Text>
        <View style={styles.cardContainer} {...panResponder.panHandlers}>
          {renderHoleCard()}
        </View>
      </View>

      {/* ── Middle Section (empty for now) ── */}
      <View style={styles.middleSection} />

      {/* ── Lower Section (empty for now) ── */}
      <View style={styles.lowerSection} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  listSection: {
    height: SCREEN_HEIGHT * 0.3,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerLine1: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  headerLine2: {
    fontSize: 14,
    textAlign: "center",
    color: "#666",
    marginBottom: 8,
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
  },
  holeCard: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    minHeight: 70,
    justifyContent: "center",
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
  addNewText: {
    color: "#007AFF",
    fontStyle: "italic",
  },
  holeStat: {
    fontSize: 14,
    color: "#666",
    width: 60,
    textAlign: "right",
  },
  middleSection: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  lowerSection: {
    height: SCREEN_HEIGHT * 0.2,
  },
});
