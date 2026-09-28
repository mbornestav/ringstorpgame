// Builds src/map-data.json from OpenStreetMap (© OpenStreetMap contributors, ODbL 1.0).
//
//   node scripts/build-map.mjs              fetch fresh data from Overpass
//   node scripts/build-map.mjs --from dir   reuse area.json / rels.json saved in dir
//
// World coordinates are 2 m units, rotated so the isometric camera looks east-north-east
// across Pålsjö skog towards Ringstorp, like the classic aerial view of the area.
import fs from 'node:fs';
import path from 'node:path';

const BBOX = '56.0585,12.6870,56.0690,12.7040';
const QUERIES = {
  area: `[out:json][timeout:90];(way(${BBOX});node(${BBOX})[~"."~"."];);out body geom;`,
  rels: `[out:json][timeout:90];rel(${BBOX})[type=multipolygon];out body geom;`,
};
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

const LAT0 = 56.064, LON0 = 12.696;
const KY = 111320, KX = 111320 * Math.cos((LAT0 * Math.PI) / 180);
const METRES_PER_UNIT = 2;
const VIEW_AZIMUTH = (78 * Math.PI) / 180; // compass direction that points up the screen
/** Region kept, in metres east / north of the origin. */
const REGION = { e0: -320, e1: 290, n0: -200, n1: 230 };

async function load(name, from) {
  if (from) return JSON.parse(fs.readFileSync(path.join(from, `${name}.json`), 'utf8'));
  for (const url of ENDPOINTS) {
    const res = await fetch(url, { method: 'POST', headers: { 'User-Agent': 'ringstorp-run-map-builder' }, body: new URLSearchParams({ data: QUERIES[name] }) });
    const text = await res.text();
    if (text.trimStart().startsWith('{')) return JSON.parse(text);
    console.warn(`${url} failed for ${name}, trying next endpoint`);
  }
  throw new Error(`Could not fetch ${name} from Overpass`);
}

const fromIndex = process.argv.indexOf('--from');
const from = fromIndex > 0 ? process.argv[fromIndex + 1] : null;
const area = await load('area', from);
const rels = await load('rels', from);

const su = Math.sin(VIEW_AZIMUTH), cu = Math.cos(VIEW_AZIMUTH);
function metres(g) { return [(g.lon - LON0) * KX, (g.lat - LAT0) * KY]; }
function rotate([e, n]) {
  const up = e * su + n * cu, right = e * cu - n * su;
  return [(right - up) / Math.SQRT2 / METRES_PER_UNIT, (-right - up) / Math.SQRT2 / METRES_PER_UNIT];
}
const corners = [[REGION.e0, REGION.n0], [REGION.e1, REGION.n0], [REGION.e0, REGION.n1], [REGION.e1, REGION.n1]].map(rotate);
const OX = Math.min(...corners.map(c => c[0])), OY = Math.min(...corners.map(c => c[1]));
const world = g => { const [x, y] = rotate(metres(g)); return [+(x - OX).toFixed(2), +(y - OY).toFixed(2)]; };
const inRegion = g => { const [e, n] = metres(g); return e > REGION.e0 && e < REGION.e1 && n > REGION.n0 && n < REGION.n1; };
const near = g => { const [e, n] = metres(g); return e > REGION.e0 - 60 && e < REGION.e1 + 60 && n > REGION.n0 - 60 && n < REGION.n1 + 60; };

const out = { attribution: '© OpenStreetMap contributors (ODbL 1.0)', size: [0, 0], region: corners.map(([x, y]) => [+(x - OX).toFixed(2), +(y - OY).toFixed(2)]), roads: [], buildings: [], areas: [], rails: [], pois: [] };
const ROADS = new Set(['secondary', 'tertiary', 'residential', 'unclassified', 'service', 'living_street', 'pedestrian', 'footway', 'path', 'cycleway', 'steps', 'track']);
const AREAS = { forest: 'forest', wood: 'forest', grass: 'grass', park: 'park', playground: 'playground', pitch: 'pitch', parking: 'parking', allotments: 'allotments', scrub: 'forest', recreation_ground: 'grass', garden: 'grass', school: 'school', kindergarten: 'school' };
const areaKind = t => AREAS[t.landuse] || AREAS[t.natural] || AREAS[t.leisure] || AREAS[t.amenity] || null;

for (const e of area.elements) {
  const t = e.tags || {};
  if (e.type === 'node') {
    if (!inRegion(e)) continue;
    const kind = t.highway === 'bus_stop' ? 'bus_stop' : t.highway === 'crossing' ? 'crossing' : t.amenity === 'bench' ? 'bench' : t.amenity === 'waste_basket' ? 'bin'
      : t.amenity === 'post_box' ? 'postbox' : t.amenity === 'shelter' ? 'shelter' : t.natural === 'tree' ? 'tree' : t.highway === 'street_lamp' ? 'lamp' : null;
    if (kind) out.pois.push({ k: kind, p: world(e), ...(t.name ? { n: t.name } : {}) });
    continue;
  }
  if (e.type !== 'way' || !e.geometry || !e.geometry.some(near)) continue;
  const pts = e.geometry.map(world);
  if (t.building) {
    if (!e.geometry.some(inRegion)) continue;
    const ring = pts.slice(0, -1);
    const b = { id: e.id, t: t.building, p: ring };
    if (t['building:levels']) b.lv = +t['building:levels'];
    if (t['addr:street']) b.a = `${t['addr:street']} ${t['addr:housenumber'] || ''}`.trim();
    if (t.shop || t.amenity) b.use = t.shop || t.amenity;
    out.buildings.push(b);
  } else if (t.highway && ROADS.has(t.highway)) {
    out.roads.push({ k: t.highway, p: pts, ...(t.name ? { n: t.name } : {}), ...(t.sidewalk && t.sidewalk !== 'no' ? { sw: t.sidewalk } : {}) });
  } else if (t.railway === 'rail') {
    out.rails.push(pts);
  } else if (areaKind(t)) {
    out.areas.push({ k: areaKind(t), p: pts.slice(0, -1) });
  }
}
for (const r of rels.elements) {
  const kind = areaKind(r.tags || {});
  if (!kind) continue;
  // Stitch outer member ways into rings.
  const ways = r.members.filter(m => m.role === 'outer' && m.geometry).map(m => m.geometry.map(world));
  while (ways.length) {
    let ring = ways.shift();
    for (let joined = true; joined && ways.length;) {
      joined = false;
      const end = ring[ring.length - 1];
      for (let i = 0; i < ways.length; i++) {
        const w = ways[i];
        const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05;
        if (same(w[0], end)) ring = ring.concat(w.slice(1));
        else if (same(w[w.length - 1], end)) ring = ring.concat(w.slice(0, -1).reverse());
        else continue;
        ways.splice(i, 1);
        joined = true;
        break;
      }
    }
    out.areas.push({ k: kind, p: ring });
  }
}
const xs = out.region.map(c => c[0]), ys = out.region.map(c => c[1]);
out.size = [+Math.max(...xs).toFixed(2), +Math.max(...ys).toFixed(2)];
/** Converts latitude/longitude into world units, for placing mission points. */
out.transform = { lat0: LAT0, lon0: LON0, kx: KX, ky: KY, metresPerUnit: METRES_PER_UNIT, azimuth: VIEW_AZIMUTH, ox: OX, oy: OY };
fs.writeFileSync(new URL('../src/map-data.json', import.meta.url), JSON.stringify(out));
console.log(`roads ${out.roads.length}, buildings ${out.buildings.length}, areas ${out.areas.length}, rails ${out.rails.length}, pois ${out.pois.length}, size ${out.size}`);
