const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory network state
let nodes = [];
let connections = [];
let packets = [];

// Sample Data
const trafficRates = {
  '08:00': { A: 50, B: 30, C: 40, D: 20, E: 60 },
  '08:15': { A: 55, B: 35, C: 45, D: 25, E: 65 },
  '08:30': { A: 60, B: 40, C: 50, D: 30, E: 70 },
  '08:45': { A: 55, B: 35, C: 45, D: 25, E: 65 },
};
const trafficTimes = Object.keys(trafficRates);
let timeIndex = 0;

const links = [
  { from: 'A', to: 'B', capacity: 100 },
  { from: 'A', to: 'C', capacity: 80 },
  { from: 'B', to: 'D', capacity: 70 },
  { from: 'C', to: 'D', capacity: 90 },
  { from: 'C', to: 'E', capacity: 100 },
  { from: 'D', to: 'E', capacity: 60 },
];


function getNodeName(idx) {
  return String.fromCharCode(65 + idx);
}
function getNodeIndex(name) {
  return name.charCodeAt(0) - 65;
}

// Helper: Find path (BFS)
function findPath(from, to) {
  const queue = [[from]];
  const visited = new Set();
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === to) return path;
    visited.add(last);
    const neighbors = connections
      .filter(c => c.from === last || c.to === last)
      .map(c => (c.from === last ? c.to : c.from));
    for (const n of neighbors) {
      if (!visited.has(n)) queue.push([...path, n]);
    }
  }
  return null;
}

// Get current network (add time info)
app.get('/api/network', (req, res) => {
  res.json({ nodes, connections, time: trafficTimes[timeIndex], interval: timeIndex });
});

// Set network topology
app.post('/api/network', (req, res) => {
  nodes = req.body.nodes || [];
  connections = req.body.connections || [];
  res.json({ success: true });
});

// Simulate sending a packet
app.post('/api/send-packet', (req, res) => {
  const { from, to, payload } = req.body;
  const path = findPath(from, to);
  if (!path) return res.status(400).json({ error: 'No path found' });
  // Simulate packet transmission (add to packets array)
  const packet = {
    id: Date.now() + Math.random(),
    from,
    to,
    path,
    payload,
    progress: 0, // 0=start, 1=delivered
  };
  packets.push(packet);
  res.json({ success: true, packet });
});

// Simulate one interval: generate and send packets
app.post('/api/simulate-interval', (req, res) => {
  const time = trafficTimes[timeIndex];
  const rates = trafficRates[time];
  // For each node, generate packets according to rates
  Object.entries(rates).forEach(([nodeName, rate]) => {
    // For demo, send all packets to a random other node
    for (let i = 0; i < rate; i++) {
      let dest;
      do {
        dest = getNodeName(Math.floor(Math.random() * nodes.length));
      } while (dest === nodeName);
      // Find path using links (BFS, respecting capacities)
      const path = findPathByName(nodeName, dest);
      if (path) {
        packets.push({
          id: Date.now() + Math.random(),
          from: getNodeIndex(nodeName),
          to: getNodeIndex(dest),
          path: path.map(getNodeIndex),
          payload: `Auto ${time}`,
          progress: 0,
        });
      }
    }
  });
  // Advance time
  timeIndex = (timeIndex + 1) % trafficTimes.length;
  res.json({ success: true, time: trafficTimes[timeIndex] });
});

// Pathfinding using links and capacities
function findPathByName(from, to) {
  const queue = [[from]];
  const visited = new Set();
  while (queue.length) {
    const path = queue.shift();
    const last = path[path.length - 1];
    if (last === to) return path;
    visited.add(last);
    const neighbors = links
      .filter(l => l.from === last || l.to === last)
      .map(l => (l.from === last ? l.to : l.from));
    for (const n of neighbors) {
      if (!visited.has(n)) queue.push([...path, n]);
    }
  }
  return null;
}

// Get all packets (for animation)
app.get('/api/packets', (req, res) => {
  res.json({ packets });
});

// Advance packet simulation (move packets along their path)
app.post('/api/advance', (req, res) => {
  packets = packets.map(pkt => {
    if (pkt.progress < pkt.path.length - 1) {
      return { ...pkt, progress: pkt.progress + 1 };
    }
    return pkt;
  });
  // Remove delivered packets
  packets = packets.filter(pkt => pkt.progress < pkt.path.length);
  res.json({ packets });
});

// Backend: Simulate one interval: generate and send packets
app.post('/api/simulate-interval', (req, res) => {
  const time = trafficTimes[timeIndex];
  const rates = trafficRates[time];

  // For each node, generate packets according to rates
  Object.entries(rates).forEach(([nodeName, rate]) => {
    // For demo, send all packets to a random other node
    for (let i = 0; i < rate; i++) {
      let dest;
      do {
        dest = getNodeName(Math.floor(Math.random() * nodes.length));
      } while (dest === nodeName);

      // Find path using links (BFS, respecting capacities)
      const path = findPathByName(nodeName, dest);
      if (path) {
        packets.push({
          id: Date.now() + Math.random(),
          from: getNodeIndex(nodeName),
          to: getNodeIndex(dest),
          path: path.map(getNodeIndex),
          payload: `Auto ${time}`,
          progress: 0,
        });
      }
    }
  });

  // Advance time
  timeIndex = (timeIndex + 1) % trafficTimes.length;
  res.json({ success: true, time: trafficTimes[timeIndex] });
});


app.listen(PORT, () => {
  console.log(`Network simulation backend running on port ${PORT}`);
});        