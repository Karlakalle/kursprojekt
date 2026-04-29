import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getHole, saveHole, updateHole } from "../../../database/database";

export default function HolePage() {
  const { courseName, holeNo } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const isNew = holeNo === "new";

  const [hole, setHole] = useState(null);
  const [editedHole, setEditedHole] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);

  const emptyHole = {
    course_name: decodeURIComponent(courseName),
    hole_no: "",
    name: "",
    distance: "",
    par: 0, // changed from ""
    par_plus_minus: "",
    lat_start: 0,
    lon_start: 0,
    lat_finish: 0,
    lon_finish: 0,
    estimated_duration: "",
    description: "",
  };

  useEffect(() => {
    if (isNew) {
      setHole(emptyHole);
      setEditedHole(emptyHole);
      setIsEditing(true);
    } else {
      const load = async () => {
        try {
          const data = await getHole(
            decodeURIComponent(courseName),
            parseInt(holeNo),
          );
          if (data) {
            setHole(data);
            setEditedHole(data);
          } else {
            setError("Hole not found.");
          }
        } catch (e) {
          setError("Failed to load hole. Please try again.");
        }
      };
      load();
    }
  }, [holeNo]);

  // Intercept back press in edit mode
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isEditing && !isNew) {
        e.preventDefault();
        setEditedHole(hole);
        setIsEditing(false);
      }
    });
    return unsubscribe;
  }, [isEditing, isNew, hole, navigation]);

  const handleDone = async () => {
    // Validate hole_no
    const holeNoInt = parseInt(editedHole.hole_no);
    if (isNaN(holeNoInt) || holeNoInt < 1 || holeNoInt > 99) {
      Alert.alert("Invalid", "Hole number must be between 1 and 99.");
      return;
    }
    // Validate par
    const parInt = parseInt(editedHole.par);
    if (isNaN(parInt) || parInt < 0) {
      Alert.alert("Invalid", "Par cannot be negative.");
      return;
    }
    try {
      const holeToSave = {
        ...editedHole,
        hole_no: holeNoInt,
        par: parInt,
        distance: parseFloat(editedHole.distance) || 0,
        par_plus_minus: parseFloat(editedHole.par_plus_minus) || 0,
      };
      if (isNew) {
        await saveHole(holeToSave);
        router.replace(`/holes/${encodeURIComponent(courseName)}/${holeNoInt}`);
      } else {
        await updateHole(
          decodeURIComponent(courseName),
          parseInt(holeNo),
          holeToSave,
        );
        setHole(holeToSave);
        setIsEditing(false);
        router.replace(`/holes/${encodeURIComponent(courseName)}/${holeNoInt}`);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to save hole.");
    }
  };

  const isDoneDisabled = isEditing && !editedHole.hole_no.toString().trim();

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!hole) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  const field = (label, value) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={styles.value}>{value ?? "—"}</Text>
    </View>
  );

  const editField = (label, key, options = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}:</Text>
      {isEditing ? (
        <TextInput
          style={styles.input}
          value={editedHole[key]?.toString() ?? ""}
          onChangeText={(text) => setEditedHole({ ...editedHole, [key]: text })}
          keyboardType={options.numeric ? "numeric" : "default"}
          maxLength={options.maxLength}
          multiline={options.multiline}
        />
      ) : (
        <Text style={styles.value}>{hole[key] ?? "—"}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {editField("No.", "hole_no", { numeric: true })}
        {editField("Name", "name")}
        {editField("Distance (m)", "distance", { numeric: true })}
        {editField("Par", "par", { numeric: true })}
        {field(
          "Par +/-",
          hole.par_plus_minus != null
            ? parseFloat(hole.par_plus_minus).toFixed(1)
            : "—",
        )}
        {field("Start", `${hole.lat_start}, ${hole.lon_start}`)}
        {field("Finish", `${hole.lat_finish}, ${hole.lon_finish}`)}
        {field("Est. Duration", hole.estimated_duration)}
        {editField("Description", "description", {
          maxLength: 250,
          multiline: true,
        })}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isDoneDisabled ? styles.disabledButton : {}]}
          onPress={isEditing ? handleDone : () => setIsEditing(true)}
          disabled={isDoneDisabled}
        >
          <Text style={styles.buttonText}>{isEditing ? "Done" : "Edit"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  value: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    fontSize: 16,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#ccc" },
  buttonText: { color: "#fff", fontSize: 14 },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    margin: 24,
  },
});
