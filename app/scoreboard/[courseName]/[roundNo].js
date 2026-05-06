//==========> [roundNo].js <==========

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getHolesPerRoundScoreboard } from "../../../database/database";

export default function ScoreboardPage() {
  const { courseName, roundNo } = useLocalSearchParams();
  const router = useRouter();
  const decoded = decodeURIComponent(courseName);
  const [rows, setRows] = useState([]);
  const [totalThrows, setTotalThrows] = useState(0);
  const [totalParPlusMinus, setTotalParPlusMinus] = useState(0);

  useEffect(() => {
    async function load() {
      const data = await getHolesPerRoundScoreboard(decoded, parseInt(roundNo));
      setRows(data);
      const total = data.reduce((s, r) => s + (r.throws ?? 0), 0);
      const totalPpm = data.reduce(
        (s, r) => s + ((r.throws ?? 0) - (r.par ?? 0)),
        0,
      );
      setTotalThrows(total);
      setTotalParPlusMinus(totalPpm);
    }
    load();
  }, []);

  const renderRow = ({ item }) => {
    const duration =
      item.start_time && item.end_time
        ? (() => {
            const ms = new Date(item.end_time) - new Date(item.start_time);
            const mins = Math.floor(ms / 60000);
            const h = Math.floor(mins / 60)
              .toString()
              .padStart(2, "0");
            const m = (mins % 60).toString().padStart(2, "0");
            return `${h}:${m}`;
          })()
        : "—";
    const ppm =
      item.throws != null && item.par != null
        ? (item.throws - item.par > 0 ? "+" : "") + (item.throws - item.par)
        : "—";
    const status = item.hole_scored ? "" : item.aborted ? "⚠️" : "—";

    return (
      <View style={styles.row}>
        <Text style={styles.colNo}>#{item.hole_no}</Text>
        <Text style={styles.colName}>{item.name ?? "—"}</Text>
        <Text style={styles.colStat}>{item.throws ?? "—"}</Text>
        <Text style={styles.colStat}>Par {item.par ?? "—"}</Text>
        <Text style={styles.colStat}>{ppm}</Text>
        <Text style={styles.colStat}>{duration}</Text>
        <Text style={styles.colStatus}>{status}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {decoded} — Round {roundNo}
      </Text>
      <View style={styles.headerRow}>
        <Text style={styles.colNo}>#</Text>
        <Text style={styles.colName}>Hole</Text>
        <Text style={styles.colStat}>Throws</Text>
        <Text style={styles.colStat}>Par</Text>
        <Text style={styles.colStat}>+/-</Text>
        <Text style={styles.colStat}>Time</Text>
        <Text style={styles.colStatus}></Text>
      </View>
      <FlatList
        data={rows}
        renderItem={renderRow}
        keyExtractor={(item) => item.order_no.toString()}
        contentContainerStyle={{ paddingBottom: 80 }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Total throws: {totalThrows}
              {"   "}
              Par +/-: {totalParPlusMinus > 0 ? "+" : ""}
              {totalParPlusMinus}
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 16 },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#ccc",
    paddingBottom: 6,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  colNo: { width: 36, fontSize: 14, fontWeight: "bold" },
  colName: { flex: 1, fontSize: 14 },
  colStat: { width: 56, fontSize: 14, textAlign: "right" },
  colStatus: { width: 24, fontSize: 14, textAlign: "center" },
  footer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  footerText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
