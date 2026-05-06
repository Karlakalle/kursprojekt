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
  Modal,
  ScrollView,
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
  getNextOrderNo,
  getNextThrowNo,
  saveHolePerRound,
  saveThrow,
  getThrows,
  getRound,
  getHolePerRoundByHoleNo,
  updateThrowFinish,
  updateHolePerRoundFinish,
  recalculateHoleStats,
  wrapUpRound,
  hasAllHolesScored,
  getHolesPerRoundScoreboard,
  getThrow,
} from "../../database/database";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";

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

  const [throwActive, setThrowActive] = useState(false); // true = waiting for Register
  const [scrollLocked, setScrollLocked] = useState(false);
  const [activeOrderNo, setActiveOrderNo] = useState(null);
  const [activeThrowNo, setActiveThrowNo] = useState(null);

  const [abortModalVisible, setAbortModalVisible] = useState(false);
  const [abortOptions, setAbortOptions] = useState([]);

  const [throwLines, setThrowLines] = useState([]);

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
        if (scrollLocked) return;
        if (gestureState.dy < -30) {
          setCurrentIndex((prev) =>
            prev < totalItemsRef.current - 1 ? prev + 1 : prev,
          );
        } else if (gestureState.dy > 30) {
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

  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
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

      const ongoing =
        selectedHoleNo > 0
          ? await scoringOngoing(decoded, round.round_no, selectedHoleNo)
          : false;

      const options = [];

      if (ongoing) {
        options.push({
          text: "Abort hole (skip)",
          onPress: async () => {
            setAbortModalVisible(false);
            const hpr = await getHolePerRoundByHoleNo(
              decoded,
              round.round_no,
              selectedHoleNo,
            );
            if (hpr) {
              await updateHolePerRound(decoded, round.round_no, hpr.order_no, {
                ...hpr,
                aborted: true,
                hole_scored: false,
              });
            }
            setScrollLocked(false);
            setThrowActive(false);
            setThrowCount(0);
            await refreshScoringPage();
          },
        });
        options.push({
          text: "Abort hole (restart)",
          destructive: true,
          onPress: async () => {
            setAbortModalVisible(false);
            await deleteThrowsForHole(decoded, round.round_no, selectedHoleNo);
            const hpr = await getHolePerRoundByHoleNo(
              decoded,
              round.round_no,
              selectedHoleNo,
            );
            if (hpr) {
              await deleteHolePerRound(decoded, round.round_no, hpr.order_no);
            }
            setScrollLocked(false);
            setThrowActive(false);
            setThrowCount(0);
            setActiveOrderNo(null);
            setActiveThrowNo(null);
            setCurrentIndex(0);
            await refreshScoringPage();
          },
        });
      }

      options.push({
        text: "Abort round (end)",
        onPress: async () => {
          setAbortModalVisible(false);
          await updateRound(decoded, round.round_no, {
            ...round,
            aborted: true,
          });
          router.replace("/");
        },
      });

      options.push({
        text: "Abort round (delete)",
        destructive: true,
        onPress: async () => {
          setAbortModalVisible(false);
          await deleteThrowsForRound(decoded, round.round_no);
          await deleteHolesPerRound(decoded, round.round_no);
          await deleteRound(decoded, round.round_no);
          router.replace("/");
        },
      });

      options.push({
        text: "Return",
        cancel: true,
        onPress: () => setAbortModalVisible(false),
      });

      setAbortOptions(options);
      setAbortModalVisible(true);
    } catch (e) {
      Alert.alert("Error", "Something went wrong.");
      console.error(e);
    }
  };

  const handleThrow = async () => {
    try {
      // Get current geo position (optional)
      let lat = 0;
      let lon = 0;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.BestForNavigation,
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        }
      } catch (e) {
        // Geo not available, continue without it
      }

      const now = new Date().toISOString();
      const existingThrows = await getThrows(
        decoded,
        round.round_no,
        selectedHoleNo,
      );
      const isFirstThrow = existingThrows.length === 0;

      let orderNo = activeOrderNo;

      if (isFirstThrow) {
        // Create HolesPerRound record
        orderNo = await getNextOrderNo(decoded, round.round_no);
        await saveHolePerRound({
          course_name: decoded,
          round_no: round.round_no,
          order_no: orderNo,
          hole_no: selectedHoleNo,
          start_time: now,
          lat_start: lat,
          lon_start: lon,
          aborted: false,
          hole_scored: false,
        });
        setActiveOrderNo(orderNo);

        // Update Rounds start_time if not set
        const currentRound = await getRound(decoded, round.round_no);
        if (!currentRound.start_time) {
          await updateRound(decoded, round.round_no, {
            ...currentRound,
            start_time: now,
          });
          setRound({ ...round, start_time: now });
        }
      }

      // Create Throw record
      const throwNo = await getNextThrowNo(
        decoded,
        round.round_no,
        selectedHoleNo,
      );
      await saveThrow({
        course_name: decoded,
        round_no: round.round_no,
        hole_no: selectedHoleNo,
        order_no: orderNo,
        throw_no: throwNo,
        start_time: now,
        lat_start: lat,
        lon_start: lon,
      });
      setActiveThrowNo(throwNo);
      setThrowActive(true);
      setScrollLocked(true);
      setThrowCount((prev) => prev + 1);
    } catch (e) {
      Alert.alert("Error", "Failed to register throw.");
      console.error(e);
    }
  };

  const handleRegister = async () => {
    setThrowActive(false);

    // Get GPS position (optional)
    let lat = 0;
    let lon = 0;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }
    } catch (e) {}

    const now = new Date().toISOString();

    // Ask "Did you score?"
    const scored = await new Promise((resolve) => {
      Alert.alert("Did you score?", "", [
        { text: "No", onPress: () => resolve(false) },
        { text: "Yes", onPress: () => resolve(true) },
      ]);
    });

    // Check if all holes scored (only if scored)
    let wrapUp = false;
    if (scored) {
      const allScored = await hasAllHolesScored(decoded, round.round_no);
      if (allScored) {
        wrapUp = await new Promise((resolve) => {
          Alert.alert("Wrap up Round?", "", [
            { text: "No", onPress: () => resolve(false) },
            { text: "Yes", onPress: () => resolve(true) },
          ]);
        });
      }
    }

    // Update Throws record
    await updateThrowFinish(
      decoded,
      round.round_no,
      selectedHoleNo,
      activeThrowNo,
      now,
      lat,
      lon,
    );

    // Update throw lines on map
    const currentThrow = await getThrow(
      decoded,
      round.round_no,
      selectedHoleNo,
      activeThrowNo,
    );
    if (
      currentThrow &&
      currentThrow.lat_start !== 0 &&
      currentThrow.lon_start !== 0 &&
      lat !== 0 &&
      lon !== 0
    ) {
      setThrowLines((prev) => [
        ...prev,
        {
          start: {
            latitude: currentThrow.lat_start,
            longitude: currentThrow.lon_start,
          },
          finish: { latitude: lat, longitude: lon },
        },
      ]);
    }

    // Update stats
    const holeStartTime = (
      await getHolePerRoundByHoleNo(decoded, round.round_no, selectedHoleNo)
    )?.start_time;
    if (holeStartTime) {
      const ms = new Date(now) - new Date(holeStartTime);
      const mins = Math.floor(ms / 60000);
      const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      setTimeSpent(`${h}:${m}`);
    }

    if (
      lat !== 0 &&
      lon !== 0 &&
      currentThrow?.lat_start !== 0 &&
      currentThrow?.lon_start !== 0
    ) {
      const dist = calcDistance(
        currentThrow.lat_start,
        currentThrow.lon_start,
        lat,
        lon,
      );
      setLastThrowDistance(dist);
    }

    if (scored) {
      // Update HolesPerRound
      await updateHolePerRoundFinish(
        decoded,
        round.round_no,
        selectedHoleNo,
        now,
        lat,
        lon,
        throwCount,
        true,
      );

      // Recalculate hole stats
      await recalculateHoleStats(decoded, selectedHoleNo);

      // Unlock scroll
      setScrollLocked(false);
      setThrowCount(0);
      setLastThrowDistance(null);
      setTimeSpent("00:00");
      setThrowLines([]);
      await refreshScoringPage();
    }

    if (wrapUp) {
      await wrapUpRound(decoded, round.round_no);
      router.replace(
        `/scoreboard/${encodeURIComponent(decoded)}/${round.round_no}`,
      );
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
        <View
          style={[
            styles.cardContainer,
            scrollLocked ? styles.cardContainerLocked : {},
          ]}
          {...panResponder.panHandlers}
        >
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
              {throwLines.map((line, index) => (
                <Polyline
                  key={`throw-${index}`}
                  coordinates={[line.start, line.finish]}
                  strokeColor="#007AFF"
                  strokeWidth={2}
                />
              ))}
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
          style={[styles.button, throwActive ? styles.disabledButton : {}]}
          onPress={throwActive ? null : handleThrow}
          disabled={throwActive}
        >
          <Text style={styles.buttonText}>Throw</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !throwActive ? styles.disabledButton : {}]}
          onPress={!throwActive ? null : handleRegister}
          disabled={!throwActive}
        >
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      </View>
      <Modal
        transparent
        animationType="fade"
        visible={abortModalVisible}
        onRequestClose={() => setAbortModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Abort</Text>
            <Text style={styles.modalMessage}>What would you like to do?</Text>
            <ScrollView>
              {abortOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.modalOption,
                    option.cancel ? styles.modalCancel : {},
                    option.destructive ? styles.modalDestructive : {},
                  ]}
                  onPress={option.onPress}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      option.cancel ? styles.modalCancelText : {},
                      option.destructive ? styles.modalDestructiveText : {},
                    ]}
                  >
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  disabledButton: {
    backgroundColor: "#ccc",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: "left",
  },
  modalCancel: {
    borderBottomWidth: 0,
    marginTop: 4,
  },
  modalCancelText: {
    color: "#007AFF",
    fontWeight: "bold",
  },
  modalDestructive: {},
  modalDestructiveText: {
    color: "#FF3B30",
  },
  cardContainerLocked: {
    opacity: 0.4,
  },
});
