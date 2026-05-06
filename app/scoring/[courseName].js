//==========> [courseName].js <==========

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getOngoingRound,
  getHolesToScore,
  hasRoundStarted,
  scoringOngoing,
  deleteRound,
  deleteHolesPerRound,
  deleteThrowsForRound,
  deleteThrowsForHole,
  deleteHolePerRound,
  updateHolePerRound,
  getHolePerRound,
  updateRound,
  getHoleGeo,
  getCourse,
} from "../../database/database";
import MapView, { Marker, Polyline } from "react-native-maps";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ScoringPage() {
  const { courseName } = useLocalSearchParams();
  const router = useRouter();
  const decoded = decodeURIComponent(courseName);

  const [round, setRound] = useState(null);
  const [holes, setHoles] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [holeGeo, setHoleGeo] = useState(null);
  const [throwCount, setThrowCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState("00:00");
  const [lastThrowDistance, setLastThrowDistance] = useState(null);
  const timerRef = useRef(null);
  const [course, setCourse] = useState(null);

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
          const courseData = await getCourse(decoded);
          console.log("Course data:", JSON.stringify(courseData));
          setCourse(courseData);
        } catch (e) {
          console.error("Failed to load scoring data", e);
        }
      }
      fetchData();
    }, [decoded]),
  );

  useEffect(() => {
    async function loadHoleGeo() {
      if (!currentHole) {
        setHoleGeo(null);
        return;
      }
      try {
        const geo = await getHoleGeo(decoded, currentHole.hole_no);
        setHoleGeo(geo);
      } catch (e) {
        setHoleGeo(null);
      }
    }
    loadHoleGeo();
  }, [currentHole]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  const courseHasGeo =
    course &&
    parseFloat(course.latitude) !== 0 &&
    parseFloat(course.longitude) !== 0;

  const refreshScoringPage = async () => {
    try {
      const holeList = await getHolesToScore(decoded, round.round_no);
      setHoles(holeList);
      setCurrentIndex(0);
    } catch (e) {
      console.error("Failed to refresh scoring page", e);
    }
  };

  const handleAbort = async () => {
    try {
      const started = await hasRoundStarted(decoded, round.round_no);

      if (!started) {
        Alert.alert("Abort Round", "Abort round (nothing stored)?", [
          { text: "No", style: "cancel" },
          {
            text: "Yes",
            style: "destructive",
            onPress: async () => {
              await deleteRound(decoded, round.round_no);
              router.replace("/");
            },
          },
        ]);
        return;
      }

      // Check if scoring is ongoing for current hole
      const ongoing =
        selectedHoleNo > 0
          ? await scoringOngoing(decoded, round.round_no, selectedHoleNo)
          : false;

      const options = [];

      if (ongoing) {
        options.push({
          text: "Abort hole (mark as aborted)",
          onPress: async () => {
            const hpr = await getHolePerRound(
              decoded,
              round.round_no,
              currentHole?.order_no,
            );
            if (hpr) {
              await updateHolePerRound(decoded, round.round_no, hpr.order_no, {
                ...hpr,
                aborted: true,
                hole_scored: false,
              });
            }
            await refreshScoringPage();
          },
        });
        options.push({
          text: "Abort hole and delete throw data (restart)",
          onPress: async () => {
            await deleteThrowsForHole(decoded, round.round_no, selectedHoleNo);
            const hpr = await getHolePerRound(
              decoded,
              round.round_no,
              currentHole?.order_no,
            );
            if (hpr) {
              await deleteHolePerRound(decoded, round.round_no, hpr.order_no);
            }
            await refreshScoringPage();
          },
        });
      }

      options.push({
        text: "Abort round (mark as aborted)",
        onPress: async () => {
          await updateRound(decoded, round.round_no, {
            ...round,
            aborted: true,
          });
          router.replace("/");
        },
      });

      options.push({
        text: "Abort round and delete round data",
        style: "destructive",
        onPress: async () => {
          await deleteThrowsForRound(decoded, round.round_no);
          await deleteHolesPerRound(decoded, round.round_no);
          await deleteRound(decoded, round.round_no);
          router.replace("/");
        },
      });

      options.push({
        text: "Return",
        style: "cancel",
      });

      Alert.alert("Abort", "What would you like to do?", options);
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
      console.error(e);
    }
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

      {/* ── Middle Section: Map ── */}
      <View style={styles.mapSection}>
        {courseHasGeo ? (
          <>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: course.latitude,
                longitude: course.longitude,
                latitudeDelta: 0.002,
                longitudeDelta: 0.002,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
            >
              {holeGeo &&
                holeGeo.lat_start !== 0 &&
                holeGeo.lon_start !== 0 &&
                holeGeo.lat_finish !== 0 &&
                holeGeo.lon_finish !== 0 && (
                  <>
                    <Polyline
                      coordinates={[
                        {
                          latitude: holeGeo.lat_start,
                          longitude: holeGeo.lon_start,
                        },
                        {
                          latitude: holeGeo.lat_finish,
                          longitude: holeGeo.lon_finish,
                        },
                      ]}
                      strokeColor="#FF3B30"
                      strokeWidth={3}
                    />
                    <Marker
                      coordinate={{
                        latitude: holeGeo.lat_start,
                        longitude: holeGeo.lon_start,
                      }}
                      pinColor="green"
                      title="Start"
                    />
                    <Marker
                      coordinate={{
                        latitude: holeGeo.lat_finish,
                        longitude: holeGeo.lon_finish,
                      }}
                      pinColor="red"
                      title="Finish"
                    />
                  </>
                )}
            </MapView>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>🥏 {throwCount} throws</Text>
              <Text style={styles.statText}>⏱ {timeSpent}</Text>
              <Text style={styles.statText}>
                📏 {lastThrowDistance != null ? `${lastThrowDistance}m` : "—"}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.noMapContainer}>
            <Text style={styles.noMapText}>
              No geo position registered for this course.
            </Text>
            <View style={styles.statsRow}>
              <Text style={styles.statText}>🥏 {throwCount} throws</Text>
              <Text style={styles.statText}>⏱ {timeSpent}</Text>
              <Text style={styles.statText}>
                📏 {lastThrowDistance != null ? `${lastThrowDistance}m` : "—"}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ── Lower Section: Buttons ── */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[styles.button, styles.abortButton]}
          onPress={handleAbort}
        >
          <Text style={styles.buttonText}>Abort</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert("TBD", "Coming soon")}
        >
          <Text style={styles.buttonText}>Throw</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Alert.alert("TBD", "Coming soon")}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  listSection: {
    height: SCREEN_HEIGHT * 0.22, // reduced from 0.30
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingHorizontal: 16,
    paddingTop: 4, // reduced from 8
  },
  headerLine1: {
    fontSize: 15, // reduced from 16
    fontWeight: "bold",
    textAlign: "center",
  },
  headerLine2: {
    fontSize: 13, // reduced from 14
    textAlign: "center",
    color: "#666",
    marginBottom: 4, // reduced from 8
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
  mapSection: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  map: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f5f5f5",
  },
  statText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  noMapContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  noMapText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    padding: 16,
  },
  buttonSection: {
    height: SCREEN_HEIGHT * 0.12, // reduced from 0.15
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    minWidth: 90,
    alignItems: "center",
  },
  abortButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
