const rooms = new Map();

const ensureRoom = room => {
  if (!rooms.has(room)) {
    rooms.set(room, { table: null, players: [], game: {} });
  }
  return rooms.get(room);
};

export const getRoom = room => ensureRoom(room);

export const setTableSocket = (room, ws) => {
  const roomObj = ensureRoom(room);
  roomObj.table = ws;
  return roomObj;
};

export const addPlayerSocket = (room, playerId, ws) => {
  const roomObj = ensureRoom(room);
  // Remove stale sockets with the same id (eg reconnection after sleep)
  roomObj.players = roomObj.players.filter(p => p.id !== playerId);
  roomObj.players.push({ id: playerId, ws });
  return roomObj;
};

export const getPlayerIds = room => {
  const roomObj = rooms.get(room);
  if (!roomObj) return [];
  return roomObj.players.map(p => p.id);
};

export const broadcastToRoom = (room, payload) => {
  const roomObj = rooms.get(room);
  if (!roomObj) return;

  const json = JSON.stringify(payload);
  if (roomObj.table) roomObj.table.send(json);
  roomObj.players.forEach(p => p.ws.send(json));
};

export const removeSocket = ws => {
  const room = ws.room;
  if (!room || !rooms.has(room)) return null;

  const roomObj = rooms.get(room);
  const wasTable = roomObj.table === ws;
  if (wasTable) roomObj.table = null;

  const before = roomObj.players.length;
  roomObj.players = roomObj.players.filter(p => p.ws !== ws);
  const playerLeft = ws.role === "player" && before !== roomObj.players.length;

  const playerList = roomObj.players.map(p => p.id);

  if (!roomObj.table && roomObj.players.length === 0) {
    rooms.delete(room);
  }

  return {
    room,
    wasTable,
    playerLeft,
    playerId: ws.playerId,
    playerList
  };
};
