const jsonServer = require('json-server');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

const SEED = {
  config: {
    day: '2026-06-23',
    timezone: 'Asia/Riyadh',
    crew: { id: 'CREW-A', truck: 'Truck 1' },
    fulfillment_center: { name: 'Twinkle FC', lat: 24.7136, lng: 46.6753 },
    slots: [
      { id: 'afternoon', label: 'Afternoon', window: '12:00–16:00', must_finish_by: '15:30' },
      { id: 'evening', label: 'Evening', window: '16:00–20:00', must_finish_by: '19:30' },
    ],
    sync: {
      mock_api: 'http://localhost:3001',
      notes: 'Assume flaky network; simulate offline.',
    },
  },
  stops: [
    {
      id: 'ORD-3001',
      slot: 'afternoon',
      customer: 'Sara A.',
      area: 'Al Malqa',
      address: 'Villa 14, Al Malqa St',
      lat: 24.82,
      lng: 46.61,
      items: ["Pastel arch backdrop", "60 balloons", "Name sign: 'Yara 5'"],
      must_finish_by: '15:30',
      status: 'loaded',
      notes: null,
      proof_photo_url: null,
    },
    {
      id: 'ORD-3002',
      slot: 'afternoon',
      customer: 'Mohammed K.',
      area: 'Al Narjis',
      address: 'Apt 7, Burj Al Narjis',
      lat: 24.865,
      lng: 46.64,
      items: ['Graduation backdrop', 'Gold balloon set'],
      must_finish_by: '15:30',
      status: 'loaded',
      notes: null,
      proof_photo_url: null,
    },
    {
      id: 'ORD-3003',
      slot: 'afternoon',
      customer: 'Lujain F.',
      area: 'Al Yasmin',
      address: 'Villa 3, Al Yasmin (gate code at door)',
      lat: 24.833,
      lng: 46.645,
      items: ['Baby shower setup — blue', 'Welcome table'],
      must_finish_by: '15:30',
      status: 'loaded',
      notes: null,
      proof_photo_url: null,
    },
    {
      id: 'ORD-3004',
      slot: 'evening',
      customer: 'Norah S.',
      area: 'Olaya',
      address: 'Compound 2, Olaya — no unit number',
      lat: 24.6918,
      lng: 46.6857,
      items: ['Eid majlis decor', 'Floor cushions arch'],
      must_finish_by: '19:30',
      status: 'loaded',
      notes: null,
      proof_photo_url: null,
    },
    {
      id: 'ORD-3005',
      slot: 'evening',
      customer: 'Faisal R.',
      area: 'Hittin',
      address: 'Villa 22, Hittin',
      lat: 24.756,
      lng: 46.595,
      items: ['Birthday backdrop — dinosaurs', 'Cake table styling'],
      must_finish_by: '19:30',
      status: 'loaded',
      notes: null,
      proof_photo_url: null,
    },
  ],
  events: [],
};

const server = jsonServer.create();
const router = jsonServer.router(DB_PATH);
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.post('/reset', (_req, res) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(SEED, null, 2));
  router.db.read();
  res.json({ ok: true });
});

server.use(router);

server.listen(3001, () => {
  console.log('Mock server running on http://localhost:3001');
});
