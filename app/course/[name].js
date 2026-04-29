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
import { getCourse, saveCourse, updateCourse } from "../../database/database";

export default function CoursePage() {
  const { name } = useLocalSearchParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCourse, setEditedCourse] = useState({});
  const isNew = name === "new";
  const [error, setError] = useState(null);

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
      });
      setEditedCourse({
        name: "",
        location: "",
        latitude: 0,
        longitude: 0,
        holes: 0,
        estimated_duration: "",
        latest_date: "",
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
      if (isNew) {
        await saveCourse(editedCourse);
      } else {
        await updateCourse(course.name, editedCourse);
      }
      setCourse(editedCourse);
      setIsEditing(false);
      if (isNew) {
        router.replace("/");
      } else {
        router.replace(`/course/${encodeURIComponent(editedCourse.name)}`);
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
          <Text style={styles.label}>Geo Location:</Text>
          <Text style={styles.value}>
            {course.latitude}, {course.longitude}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Holes:</Text>
          <Text style={styles.value}>{course.holes}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Estimated Duration:</Text>
          <Text style={styles.value}>{course.estimated_duration}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Latest Date:</Text>
          <Text style={styles.value}>{course.latest_date}</Text>
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
