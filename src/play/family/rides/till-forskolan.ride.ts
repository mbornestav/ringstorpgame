import type { RideDefinition } from './types';

// Game 1: from home to the red preschool in Höganäs, under the apple trees.
const ride: RideDefinition = {
  id: 'till-forskolan',
  title: { sv: 'Till förskolan', en: 'Off to preschool' },
  length: 3600,
  speed: 82,
  apples: { firstAfter: 2.3, every: [1.3, 2.0], aimed: 0.65, clearEnd: 450 },
  scenery: { trees: { from: 475, every: 222, until: 3080 }, destination: 'preschool' },
};

export default ride;
