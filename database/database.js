//==========> database.js <==========

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
      holes              INTEGER CHECK (holes >= 0),
      estimated_duration TEXT,
      latest_date        TEXT,
      description        TEXT
    );
    CREATE TABLE IF NOT EXISTS Holes (
      course_name        TEXT,
      hole_no            INTEGER CHECK (hole_no >= 0),
      name               TEXT,
      distance           REAL,
      par                INTEGER CHECK (par >= 0),
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
    CREATE TABLE IF NOT EXISTS Rounds (
      course_name        TEXT,
      round_no           INTEGER CHECK (round_no >= 0),
      start_time         TEXT,
      end_time           TEXT,
      total_throws       INTEGER,
      full_round         INTEGER,
      aborted            INTEGER,
      PRIMARY KEY (course_name, round_no),
      FOREIGN KEY (course_name) REFERENCES Courses(name)
    );
    CREATE TABLE IF NOT EXISTS HolesPerRound (
      course_name        TEXT,
      round_no           INTEGER,
      order_no           INTEGER CHECK (order_no >= 0),
      hole_no            INTEGER,
      start_time         TEXT,
      end_time           TEXT,
      lat_start          REAL,
      lon_start          REAL,
      lat_finish         REAL,
      lon_finish         REAL,
      throws             INTEGER,
      aborted            INTEGER,
      hole_scored        INTEGER,
      PRIMARY KEY (course_name, round_no, order_no),
      FOREIGN KEY (course_name) REFERENCES Courses(name),
      FOREIGN KEY (course_name, round_no) REFERENCES Rounds(course_name, round_no),
      FOREIGN KEY (course_name, hole_no) REFERENCES Holes(course_name, hole_no)
    );
    CREATE TABLE IF NOT EXISTS Throws (
      course_name        TEXT,
      round_no           INTEGER,
      hole_no            INTEGER,
      order_no           INTEGER,
      throw_no           INTEGER CHECK (throw_no >= 0),
      start_time         TEXT,
      end_time           TEXT,
      lat_start          REAL,
      lon_start          REAL,
      lat_finish         REAL,
      lon_finish         REAL,
      PRIMARY KEY (course_name, round_no, hole_no, throw_no),
      FOREIGN KEY (course_name) REFERENCES Courses(name),
      FOREIGN KEY (course_name, round_no) REFERENCES Rounds(course_name, round_no),
      FOREIGN KEY (course_name, hole_no) REFERENCES Holes(course_name, hole_no),
      FOREIGN KEY (course_name, round_no, order_no) REFERENCES HolesPerRound(course_name, round_no, order_no)
    );
  `);

  // Migration: add description to Courses if missing
  const courseColumns = await db.getAllAsync("PRAGMA table_info(Courses);");
  if (!courseColumns.some((col) => col.name === "description")) {
    await db.execAsync("ALTER TABLE Courses ADD COLUMN description TEXT;");
  }

  // Migration: add Rounds table if missing
  const roundsTables = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Rounds';",
  );
  if (roundsTables.length === 0) {
    await db.execAsync(`
      CREATE TABLE Rounds (
        course_name        TEXT,
        round_no           INTEGER CHECK (round_no >= 0),
        start_time         TEXT,
        end_time           TEXT,
        total_throws       INTEGER,
        full_round         INTEGER,
        aborted            INTEGER,
        PRIMARY KEY (course_name, round_no),
        FOREIGN KEY (course_name) REFERENCES Courses(name)
      );
    `);
  }

  // Migration: add aborted column to Rounds if missing
  const roundColumns = await db.getAllAsync("PRAGMA table_info(Rounds);");
  if (!roundColumns.some((col) => col.name === "aborted")) {
    await db.execAsync(
      "ALTER TABLE Rounds ADD COLUMN aborted INTEGER DEFAULT 0;",
    );
  }

  // Migration: add HolesPerRound table if missing
  const hprTables = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='HolesPerRound';",
  );
  if (hprTables.length === 0) {
    await db.execAsync(`
      CREATE TABLE HolesPerRound (
        course_name        TEXT,
        round_no           INTEGER,
        order_no           INTEGER CHECK (order_no >= 0),
        hole_no            INTEGER,
        start_time         TEXT,
        end_time           TEXT,
        lat_start          REAL,
        lon_start          REAL,
        lat_finish         REAL,
        lon_finish         REAL,
        throws             INTEGER,
        aborted            INTEGER,
        hole_scored        INTEGER,
        PRIMARY KEY (course_name, round_no, order_no),
        FOREIGN KEY (course_name) REFERENCES Courses(name),
        FOREIGN KEY (course_name, round_no) REFERENCES Rounds(course_name, round_no),
        FOREIGN KEY (course_name, hole_no) REFERENCES Holes(course_name, hole_no)
      );
    `);
  }

  // Migration: add hole_scored column to HolesPerRound if missing
  const hprColumns = await db.getAllAsync("PRAGMA table_info(HolesPerRound);");
  if (!hprColumns.some((col) => col.name === "hole_scored")) {
    await db.execAsync(
      "ALTER TABLE HolesPerRound ADD COLUMN hole_scored INTEGER DEFAULT 0;",
    );
  }

  // Migration: add Throws table if missing
  const throwsTables = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='Throws';",
  );
  if (throwsTables.length === 0) {
    await db.execAsync(`
      CREATE TABLE Throws (
        course_name        TEXT,
        round_no           INTEGER,
        hole_no            INTEGER,
        order_no           INTEGER,
        throw_no           INTEGER CHECK (throw_no >= 0),
        start_time         TEXT,
        end_time           TEXT,
        lat_start          REAL,
        lon_start          REAL,
        lat_finish         REAL,
        lon_finish         REAL,
        PRIMARY KEY (course_name, round_no, hole_no, throw_no),
        FOREIGN KEY (course_name) REFERENCES Courses(name),
        FOREIGN KEY (course_name, round_no) REFERENCES Rounds(course_name, round_no),
        FOREIGN KEY (course_name, hole_no) REFERENCES Holes(course_name, hole_no),
        FOREIGN KEY (course_name, round_no, order_no) REFERENCES HolesPerRound(course_name, round_no, order_no)
      );
    `);
  }
};

//==============================================
//   Courses
//==============================================
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

//==============================================
//   Holes
//==============================================
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

export const getHoleQty = async (courseName) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    "SELECT MAX(hole_no) AS max_hole FROM Holes WHERE course_name = ?;",
    [courseName],
  );
  return result?.max_hole ?? 0;
};

export const getHoleGeo = async (courseName, holeNo) => {
  const db = await dbPromise;
  return await db.getFirstAsync(
    "SELECT lat_start, lon_start, lat_finish, lon_finish FROM Holes WHERE course_name = ? AND hole_no = ?;",
    [courseName, holeNo],
  );
};

//==============================================
//   Rounds
//==============================================
export const getRounds = async (courseName) => {
  const db = await dbPromise;
  return await db.getAllAsync(
    "SELECT * FROM Rounds WHERE course_name = ? ORDER BY round_no ASC;",
    [courseName],
  );
};

export const getRound = async (courseName, roundNo) => {
  const db = await dbPromise;
  return await db.getFirstAsync(
    "SELECT * FROM Rounds WHERE course_name = ? AND round_no = ?;",
    [courseName, roundNo],
  );
};

export const getNextRoundNo = async (courseName) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    "SELECT MAX(round_no) AS max_no FROM Rounds WHERE course_name = ?;",
    [courseName],
  );
  return (result?.max_no ?? 0) + 1;
};

export const saveRound = async (round) => {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT OR REPLACE INTO Rounds
      (course_name, round_no, start_time, end_time, total_throws, full_round, aborted)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      round.course_name,
      round.round_no,
      round.start_time ?? new Date().toISOString(),
      round.end_time ?? null,
      round.total_throws ?? 0,
      round.full_round ? 1 : 0,
      round.aborted ? 1 : 0,
    ],
  );
};

export const updateRound = async (courseName, roundNo, round) => {
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE Rounds
     SET start_time = ?, end_time = ?, total_throws = ?, full_round = ?, aborted = ?
     WHERE course_name = ? AND round_no = ?;`,
    [
      round.start_time ?? new Date().toISOString(),
      round.end_time ?? null,
      round.total_throws ?? 0,
      round.full_round ? 1 : 0,
      round.aborted ? 1 : 0,
      courseName,
      roundNo,
    ],
  );
};

export const deleteRound = async (courseName, roundNo) => {
  const db = await dbPromise;
  await db.runAsync(
    "DELETE FROM Rounds WHERE course_name = ? AND round_no = ?;",
    [courseName, roundNo],
  );
};

export const getLatestDate = async (courseName) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    "SELECT MAX(end_time) AS latest FROM Rounds WHERE course_name = ?;",
    [courseName],
  );
  if (!result?.latest) return null;
  return new Date(result.latest).toLocaleDateString();
};

export const getMeanDuration = async (courseName) => {
  const db = await dbPromise;
  const results = await db.getAllAsync(
    "SELECT start_time, end_time FROM Rounds WHERE course_name = ? AND full_round = 1 AND start_time IS NOT NULL AND end_time IS NOT NULL;",
    [courseName],
  );
  if (!results || results.length === 0) return null;
  const totalMs = results.reduce((sum, row) => {
    const diff = new Date(row.end_time) - new Date(row.start_time);
    return sum + diff;
  }, 0);
  const meanMs = totalMs / results.length;
  const totalMinutes = Math.floor(meanMs / 60000);
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

//-- Scoring -----------------------------------
export const getOngoingRound = async (courseName) => {
  const db = await dbPromise;
  const round = await db.getFirstAsync(
    "SELECT * FROM Rounds WHERE course_name = ? AND aborted = 0 AND full_round = 0 ORDER BY round_no ASC;",
    [courseName],
  );
  if (round) return round;
  // No ongoing round — create a new one
  const nextNo = await getNextRoundNo(courseName);
  await db.runAsync(
    "INSERT INTO Rounds (course_name, round_no, aborted, full_round) VALUES (?, ?, 0, 0);",
    [courseName, nextNo],
  );
  return await getRound(courseName, nextNo);
};

//==============================================
//   HolesPerRound
//==============================================
export const getHolesPerRound = async (courseName, roundNo) => {
  const db = await dbPromise;
  return await db.getAllAsync(
    "SELECT * FROM HolesPerRound WHERE course_name = ? AND round_no = ? ORDER BY order_no ASC;",
    [courseName, roundNo],
  );
};

export const getHolePerRound = async (courseName, roundNo, orderNo) => {
  const db = await dbPromise;
  return await db.getFirstAsync(
    "SELECT * FROM HolesPerRound WHERE course_name = ? AND round_no = ? AND order_no = ?;",
    [courseName, roundNo, orderNo],
  );
};

export const getNextOrderNo = async (courseName, roundNo) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    "SELECT MAX(order_no) AS max_no FROM HolesPerRound WHERE course_name = ? AND round_no = ?;",
    [courseName, roundNo],
  );
  return (result?.max_no ?? -1) + 1;
};

export const saveHolePerRound = async (holePerRound) => {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT OR REPLACE INTO HolesPerRound
      (course_name, round_no, order_no, hole_no,
       start_time, end_time,
       lat_start, lon_start, lat_finish, lon_finish,
       throws, aborted, hole_scored)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      holePerRound.course_name,
      holePerRound.round_no,
      holePerRound.order_no,
      holePerRound.hole_no,
      holePerRound.start_time ?? new Date().toISOString(),
      holePerRound.end_time ?? null,
      holePerRound.lat_start ?? 0,
      holePerRound.lon_start ?? 0,
      holePerRound.lat_finish ?? 0,
      holePerRound.lon_finish ?? 0,
      holePerRound.throws ?? 0,
      holePerRound.aborted ? 1 : 0,
      holePerRound.hole_scored ? 1 : 0,
    ],
  );
};

export const updateHolePerRound = async (
  courseName,
  roundNo,
  orderNo,
  holePerRound,
) => {
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE HolesPerRound
     SET hole_no = ?, start_time = ?, end_time = ?,
         lat_start = ?, lon_start = ?, lat_finish = ?, lon_finish = ?,
         throws = ?, aborted = ?, hole_scored = ?
     WHERE course_name = ? AND round_no = ? AND order_no = ?;`,
    [
      holePerRound.hole_no,
      holePerRound.start_time ?? new Date().toISOString(),
      holePerRound.end_time ?? null,
      holePerRound.lat_start ?? 0,
      holePerRound.lon_start ?? 0,
      holePerRound.lat_finish ?? 0,
      holePerRound.lon_finish ?? 0,
      holePerRound.throws ?? 0,
      holePerRound.aborted ? 1 : 0,
      holePerRound.hole_scored ? 1 : 0,
      courseName,
      roundNo,
      orderNo,
    ],
  );
};

export const deleteHolePerRound = async (courseName, roundNo, orderNo) => {
  const db = await dbPromise;
  await db.runAsync(
    "DELETE FROM HolesPerRound WHERE course_name = ? AND round_no = ? AND order_no = ?;",
    [courseName, roundNo, orderNo],
  );
};

export const deleteHolesPerRound = async (courseName, roundNo) => {
  const db = await dbPromise;
  await db.runAsync(
    "DELETE FROM HolesPerRound WHERE course_name = ? AND round_no = ?;",
    [courseName, roundNo],
  );
};

//-- Scoring -----------------------------------
export const getHolesToScore = async (courseName, roundNo) => {
  const db = await dbPromise;
  return await db.getAllAsync(
    `SELECT h.* FROM Holes h
     WHERE h.course_name = ?
     AND NOT EXISTS (
       SELECT 1 FROM HolesPerRound hpr
       WHERE hpr.course_name = h.course_name
         AND hpr.round_no = ?
         AND hpr.hole_no = h.hole_no
         AND (hpr.aborted = 1 OR hpr.hole_scored = 1)
     )
     ORDER BY h.hole_no ASC;`,
    [courseName, roundNo],
  );
};

export const isHoleScored = async (courseName, roundNo, holeNo) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    `SELECT 1 FROM HolesPerRound
     WHERE course_name = ? AND round_no = ? AND hole_no = ?
       AND (aborted = 1 OR hole_scored = 1);`,
    [courseName, roundNo, holeNo],
  );
  return !!result;
};

export const scoringOngoing = async (courseName, roundNo, holeNo) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    `SELECT 1 FROM HolesPerRound
     WHERE course_name = ? AND round_no = ? AND hole_no = ?
       AND hole_scored = 0 AND aborted = 0;`,
    [courseName, roundNo, holeNo],
  );
  return !!result;
};

//==============================================
//   Throws
//==============================================
export const getThrows = async (courseName, roundNo, holeNo) => {
  const db = await dbPromise;
  return await db.getAllAsync(
    "SELECT * FROM Throws WHERE course_name = ? AND round_no = ? AND hole_no = ? ORDER BY throw_no ASC;",
    [courseName, roundNo, holeNo],
  );
};

export const getThrow = async (courseName, roundNo, holeNo, throwNo) => {
  const db = await dbPromise;
  return await db.getFirstAsync(
    "SELECT * FROM Throws WHERE course_name = ? AND round_no = ? AND hole_no = ? AND throw_no = ?;",
    [courseName, roundNo, holeNo, throwNo],
  );
};

export const getNextThrowNo = async (courseName, roundNo, holeNo) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    "SELECT MAX(throw_no) AS max_no FROM Throws WHERE course_name = ? AND round_no = ? AND hole_no = ?;",
    [courseName, roundNo, holeNo],
  );
  return (result?.max_no ?? -1) + 1;
};

export const saveThrow = async (throwData) => {
  const db = await dbPromise;
  await db.runAsync(
    `INSERT OR REPLACE INTO Throws
      (course_name, round_no, hole_no, order_no, throw_no,
       start_time, end_time,
       lat_start, lon_start, lat_finish, lon_finish)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      throwData.course_name,
      throwData.round_no,
      throwData.hole_no,
      throwData.order_no,
      throwData.throw_no,
      throwData.start_time ?? new Date().toISOString(),
      throwData.end_time ?? null,
      throwData.lat_start ?? 0,
      throwData.lon_start ?? 0,
      throwData.lat_finish ?? 0,
      throwData.lon_finish ?? 0,
    ],
  );
};

export const updateThrow = async (
  courseName,
  roundNo,
  holeNo,
  throwNo,
  throwData,
) => {
  const db = await dbPromise;
  await db.runAsync(
    `UPDATE Throws
     SET order_no = ?, start_time = ?, end_time = ?,
         lat_start = ?, lon_start = ?, lat_finish = ?, lon_finish = ?
     WHERE course_name = ? AND round_no = ? AND hole_no = ? AND throw_no = ?;`,
    [
      throwData.order_no,
      throwData.start_time ?? new Date().toISOString(),
      throwData.end_time ?? null,
      throwData.lat_start ?? 0,
      throwData.lon_start ?? 0,
      throwData.lat_finish ?? 0,
      throwData.lon_finish ?? 0,
      courseName,
      roundNo,
      holeNo,
      throwNo,
    ],
  );
};

export const deleteThrow = async (courseName, roundNo, holeNo, throwNo) => {
  const db = await dbPromise;
  await db.runAsync(
    "DELETE FROM Throws WHERE course_name = ? AND round_no = ? AND hole_no = ? AND throw_no = ?;",
    [courseName, roundNo, holeNo, throwNo],
  );
};

export const deleteThrowsForHole = async (courseName, roundNo, holeNo) => {
  const db = await dbPromise;
  await db.runAsync(
    "DELETE FROM Throws WHERE course_name = ? AND round_no = ? AND hole_no = ?;",
    [courseName, roundNo, holeNo],
  );
};

export const deleteThrowsForRound = async (courseName, roundNo) => {
  const db = await dbPromise;
  await db.runAsync(
    "DELETE FROM Throws WHERE course_name = ? AND round_no = ?;",
    [courseName, roundNo],
  );
};

//-- Scoring -----------------------------------
export const hasRoundStarted = async (courseName, roundNo) => {
  const db = await dbPromise;
  const result = await db.getFirstAsync(
    "SELECT 1 FROM Throws WHERE course_name = ? AND round_no = ?;",
    [courseName, roundNo],
  );
  return !!result;
};
