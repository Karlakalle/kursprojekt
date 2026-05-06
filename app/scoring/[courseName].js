//==========> [courseName].js <==========

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getOngoingRound, getHolesToScore } from "../../database/database";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const LIST_SECTION_HEIGHT = SCREEN_HEIGHT * 0.3;

export default function ScoringPage() {
  const { courseName } = useLocalSearchParams();
  const router = useRouter();
  const decoded = decodeURIComponent(courseName);

  const [round, setRound] = useState(null);
  const [holes, setHoles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  /*
  const loadData = useCallback(async () => {
    try {
      const ongoingRound = await getOngoingRound(decoded);
      setRound(ongoingRound);
      const holeList = await getHolesToScore(decoded, ongoingRound.round_no);
      setHoles(holeList);
      setCurrentIndex(0);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    } catch (e) {
      console.error("Failed to load scoring data", e);
    }
  }, [decoded]);

  useFocusEffect(loadData);
  */

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
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        } catch (e) {
          console.error("Failed to load scoring data", e);
        }
      }
      fetchData();
    }, [decoded]),
  );

  const currentHole = holes[currentIndex] ?? null;
  const isAddNew = currentIndex >= holes.length;
  const selectedHoleNo = isAddNew ? 0 : (currentHole?.hole_no ?? 0);

  const handleHolePress = () => {
    if (isAddNew) {
      router.push(`/holes/${encodeURIComponent(decoded)}/new`);
    } else {
      router.push(`/holes/${encodeURIComponent(decoded)}/${selectedHoleNo}`);
    }
  };

  // Append a sentinel "Add New" item
  const listData = [...holes, { __addNew: true }];

  const renderItem = ({ item }) => {
    if (item.__addNew) {
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
          <Text style={styles.holeNo}>#{item.hole_no}</Text>
          <Text style={styles.holeName}>{item.name}</Text>
          <Text style={styles.holeStat}>Par {item.par}</Text>
          <Text style={styles.holeStat}>{item.distance}m</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Upper Section: List ── */}
      <View style={styles.listSection}>
        <Text style={styles.header}>
          Round {round?.round_no ?? "…"} — {decoded} — Next Hole
        </Text>
        <View style={{ height: LIST_SECTION_HEIGHT - 48 }}>
          <FlatList
            ref={flatListRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.__addNew ? "add-new" : item.hole_no.toString()
            }
            snapToAlignment="start"
            snapToInterval={LIST_SECTION_HEIGHT - 48}
            decelerationRate="fast"
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({
              length: LIST_SECTION_HEIGHT - 48,
              offset: (LIST_SECTION_HEIGHT - 48) * index,
              index,
            })}
          />
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
  header: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  holeCard: {
    justifyContent: "center",
    paddingVertical: 8,
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
