import * as migration_20260628_063543 from './20260628_063543';
import * as migration_20260628_114107 from './20260628_114107';

export const migrations = [
  {
    up: migration_20260628_063543.up,
    down: migration_20260628_063543.down,
    name: '20260628_063543',
  },
  {
    up: migration_20260628_114107.up,
    down: migration_20260628_114107.down,
    name: '20260628_114107'
  },
];
