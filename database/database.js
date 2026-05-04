import * as SQLite from "expo-sqlite";

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
      latest_date        TEXT,
      description        TEXT
    );
    CREATE TABLE IF NOT EXISTS Holes (
      course_name        TEXT,
      hole_no            INTEGER,
      name               TEXT,
      distance           REAL,
      par                INTEGER,
      par_plus_minus     REAL,
      lat_start          REAL,
      lon_start          REAL,
      lat_finish         REAL,
      lon_finish         REAL,
      estimated_duration TEXT,
      description        TEXT,
      PRIMARY KEY (course_name, hole_no),
      FOREIGN KEY (course_name) REFERENCES Courses(name)
    );
  `);

  const courseColumns = await db.getAllAsync("PRAGMA table_info(Courses);");
  if (!courseColumns.some((column) => column.name === "description")) {
    await db.execAsync("ALTER TABLE Courses ADD COLUMN description TEXT;");
  }
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
      (name, location, latitude, longitude, holes, estimated_duration, latest_date, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      course.name,
      course.location ?? "",
      course.latitude ?? 0,
      course.longitude ?? 0,
      course.holes ?? 0,
      course.estimated_duration ?? "",
      course.latest_date ?? new Date().toISOString(),
      course.description ?? "",
    ],
  );
};

export const updateCourse = async (oldName, course) => {
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE Courses
     SET name = ?, location = ?, latitude = ?, longitude = ?,
         holes = ?, estimated_duration = ?, latest_date = ?, description = ?
     WHERE name = ?;`,
    [
      course.name,
      course.location ?? "",
      course.latitude ?? 0,
      course.longitude ?? 0,
      course.holes ?? 0,
      course.estimated_duration ?? "",
      course.latest_date ?? new Date().toISOString(),
      course.description ?? "",
      oldName,
    ],
  );
};

export const getHoles = async (courseName) => {
  const db = await dbPromise;
  return await db.getAllAsync(
    "SELECT * FROM Holes WHERE course_name = ? ORDER BY hole_no ASC;",
    [courseName],
  );
};

export const getHole = async (courseName, holeNo) => {
  const db = await dbPromise;
  return await db.getFirstAsync(
    "SELECT * FROM Holes WHERE course_name = ? AND hole_no = ?;",
    [courseName, holeNo],
  );
};

export const saveHole = async (hole) => {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT OR REPLACE INTO Holes
      (course_name, hole_no, name, distance, par, par_plus_minus,
       lat_start, lon_start, lat_finish, lon_finish, estimated_duration, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      hole.course_name,
      hole.hole_no,
      hole.name ?? "",
      hole.distance ?? 0,
      hole.par ?? 0,
      hole.par_plus_minus ?? 0,
      hole.lat_start ?? 0,
      hole.lon_start ?? 0,
      hole.lat_finish ?? 0,
      hole.lon_finish ?? 0,
      hole.estimated_duration ?? "",
      hole.description ?? "",
    ],
  );
};

export const updateHole = async (courseName, oldHoleNo, hole) => {
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE Holes
     SET hole_no = ?, name = ?, distance = ?, par = ?, par_plus_minus = ?,
         lat_start = ?, lon_start = ?, lat_finish = ?, lon_finish = ?,
         estimated_duration = ?, description = ?
     WHERE course_name = ? AND hole_no = ?;`,
    [
      hole.hole_no,
      hole.name ?? "",
      hole.distance ?? 0,
      hole.par ?? 0,
      hole.par_plus_minus ?? 0,
      hole.lat_start ?? 0,
      hole.lon_start ?? 0,
      hole.lat_finish ?? 0,
      hole.lon_finish ?? 0,
      hole.estimated_duration ?? "",
      hole.description ?? "",
      courseName,
      oldHoleNo,
    ],
  );
};
