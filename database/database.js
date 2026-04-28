import * as SQLite from "expo-sqlite";

// Open the database once, asynchronously
const dbPromise = SQLite.openDatabaseAsync("discgolf.db");

export const initDatabase = async () => {
  const db = await dbPromise;
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Courses (
      name               TEXT PRIMARY KEY,
      location           TEXT,
      latitude           REAL,
      longitude          REAL,
      holes              INTEGER,
      estimated_duration TEXT,
      latest_date        TEXT
    );
  `);
};

export const getCourses = async () => {
  const db = await dbPromise;
  return await db.getAllAsync(
    "SELECT * FROM Courses ORDER BY latest_date DESC;",
  );
};

export const getCourse = async (name) => {
  const db = await dbPromise;
  return await db.getFirstAsync("SELECT * FROM Courses WHERE name = ?;", [
    name,
  ]);
};

export const saveCourse = async (course) => {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT OR REPLACE INTO Courses
      (name, location, latitude, longitude, holes, estimated_duration, latest_date)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      course.name,
      course.location ?? "",
      course.latitude ?? 0,
      course.longitude ?? 0,
      course.holes ?? 0,
      course.estimated_duration ?? "",
      course.latest_date ?? new Date().toISOString(),
    ],
  );
};

export const updateCourse = async (oldName, course) => {
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE Courses
     SET name = ?, location = ?, latitude = ?, longitude = ?,
         holes = ?, estimated_duration = ?, latest_date = ?
     WHERE name = ?;`,
    [
      course.name,
      course.location ?? "",
      course.latitude ?? 0,
      course.longitude ?? 0,
      course.holes ?? 0,
      course.estimated_duration ?? "",
      course.latest_date ?? new Date().toISOString(),
      oldName,
    ],
  );
};
