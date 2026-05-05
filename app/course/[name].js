//==========> [name].js <==========

import React, { useEffect, useState } from "react";
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
import {
  getCourse,
  saveCourse,
  updateCourse,
  getHoleQty,
  getLatestDate,
  getMeanDuration,
} from "../../database/database";
import * as Location from "expo-location";

export default function CoursePage() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState({});
  const isNew = name === "new";
  const [error, setError] = useState(null);
  const [holeQty, setHoleQty] = useState(0);
  const [latestDate, setLatestDate] = useState(null);
  const [meanDuration, setMeanDuration] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    if (isNew) {
      setCourse({
        name: "",
        location: "",
        latitude: 0,
        longitude: 0,
        holes: 0,
        estimated_duration: "",
        latest_date: "",
        description: "",
      });
      setEditedCourse({
        name: "",
        location: "",
        latitude: 0,
        longitude: 0,
        holes: 0,
        estimated_duration: "",
        latest_date: "",
        description: "",
      });
      setIsEditing(true);
    } else {
      const loadCourse = async () => {
        try {
          const courseData = await getCourse(decodeURIComponent(name));
          if (courseData) {
            setCourse(courseData);
            setEditedCourse(courseData);
          } else {
            setError("Course not found.");
          }
          const qty = await getHoleQty(decodeURIComponent(name));
          setHoleQty(qty);
          const date = await getLatestDate(decodeURIComponent(name));
          setLatestDate(date);
          const duration = await getMeanDuration(decodeURIComponent(name));
          setMeanDuration(duration);
        } catch (e) {
          setError("Failed to load course. Please try again.");
        }
      };
      loadCourse();
    }
  }, [name]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isEditing && !isNew) {
        e.preventDefault(); // block the navigation
        setEditedCourse(course); // discard changes
        setIsEditing(false); // return to view mode
      }
    });
    return unsubscribe;
  }, [isEditing, isNew, course, navigation]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleDone = async () => {
    try {
      const courseToSave = {
        ...editedCourse,
        latitude: parseFloat(editedCourse.latitude) || 0,
        longitude: parseFloat(editedCourse.longitude) || 0,
        holes: parseInt(editedCourse.holes) || 0,
      };
      if (isNew) {
        await saveCourse(courseToSave);
      } else {
        await updateCourse(course.name, courseToSave);
      }
      setCourse(courseToSave);
      setIsEditing(false);
      if (isNew) {
        router.replace("/");
      } else {
        router.replace(`/course/${encodeURIComponent(courseToSave.name)}`);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to save course");
    }
  };

  /*
  const handleBack = () => {
    router.back();
  };
  */

  /*
  const handleBack = () => {
    if (isEditing && !isNew) {
      setEditedCourse(course);
      setIsEditing(false);
    } else {
      router.back();
    }
  };
  */

  const handleStart = () => {
    Alert.alert("TBD", "Start feature coming soon");
  };

  const handleHoleInfo = () => {
    router.push(`/holes/${encodeURIComponent(course.name)}`);
  };

  const handleHistory = () => {
    Alert.alert("TBD", "History feature coming soon");
  };

  const handleStoreGeo = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to store geo position.",
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      setEditedCourse((prev) => ({
        ...prev,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
    } catch (e) {
      Alert.alert("Error", "Failed to get geo position.");
    }
  };

  /*
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  */

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

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.field}>
          <Text style={styles.label}>Name:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCourse.name}
              onChangeText={(text) =>
                setEditedCourse({ ...editedCourse, name: text })
              }
            />
          ) : (
            <Text style={styles.value}>{course.name}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location:</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={editedCourse.location}
              onChangeText={(text) =>
                setEditedCourse({ ...editedCourse, location: text })
              }
            />
          ) : (
            <Text style={styles.value}>{course.location}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description:</Text>
          {isEditing ? (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={editedCourse.description}
              onChangeText={(text) =>
                setEditedCourse({ ...editedCourse, description: text })
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.value}>{course.description ?? "—"}</Text>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Geo Location:</Text>
          <Text style={styles.value}>
            {isEditing
              ? `${editedCourse.latitude}, ${editedCourse.longitude}`
              : `${course.latitude}, ${course.longitude}`}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Holes:</Text>
          <Text style={styles.value}>{holeQty}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Estimated Duration:</Text>
          <Text style={styles.value}>{meanDuration ?? "—"}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Latest Date:</Text>
          <Text style={styles.value}>{latestDate ?? "—"}</Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        {!isEditing && (
          <>
            <TouchableOpacity style={styles.button} onPress={handleHoleInfo}>
              <Text style={styles.buttonText}>Hole Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleHistory}>
              <Text style={styles.buttonText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleStart}>
              <Text style={styles.buttonText}>Start</Text>
            </TouchableOpacity>
          </>
        )}
        {isEditing && (
          <TouchableOpacity style={styles.button} onPress={handleStoreGeo}>
            <Text style={styles.buttonText}>Store Geo</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[
            styles.button,
            isEditing && !editedCourse.name ? styles.disabledButton : {},
          ]}
          onPress={isEditing ? handleDone : handleEdit}
          disabled={isEditing && !editedCourse.name}
        >
          <Text style={styles.buttonText}>{isEditing ? "Done" : "Edit"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
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
  disabledButton: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    margin: 24,
  },
});
