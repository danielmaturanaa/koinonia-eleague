import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { getNewsImage } from '../src/features/news/newsImageSelector.js';
import { getSceneBaseSrc, getSceneColorLayers } from '../src/features/news/newsSceneRenderer.js';

const root = new URL('../public/assets/newspaper-scenes/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'));
const allowedSceneFiles = ['base.png', 'mask-accent.png', 'mask-primary.png', 'mask-secondary.png'];

assert.equal(manifest.scenes.length, 13);
assert.deepEqual(readdirSync(root).sort(), ['manifest.json', ...manifest.scenes.map(scene => scene.id)].sort());

const alternativeTeam = { colors: { shirt: '#00A651', shorts: '#FFFFFF', accent: '#F6EB14' } };
const alternativeOpponent = { colors: { shirt: '#5B2C83', shorts: '#111111', socks: '#5B2C83' } };

for (const manifestScene of manifest.scenes) {
  const directory = new URL(`./${manifestScene.id}/`, root);
  assert.deepEqual(readdirSync(directory).sort(), allowedSceneFiles);
  for (const file of allowedSceneFiles) assert.equal(existsSync(new URL(file, directory)), true);

  const scene = getNewsImage({ id: `asset-check-${manifestScene.id}`, type: manifestScene.event, subtype: manifestScene.category });
  assert.equal(scene.id, manifestScene.id);
  assert.equal(scene.assetFormat, 'palette-v1');
  assert.equal(getSceneBaseSrc(scene), `/assets/newspaper-scenes/${manifestScene.id}/base.png`);
  const layers = getSceneColorLayers(scene, alternativeTeam, alternativeOpponent);
  assert.equal(layers.length, 3);
  assert.deepEqual(layers.map(layer => layer.color), ['#00A651', '#5B2C83', '#F6EB14']);
  for (const layer of layers) {
    const file = layer.src.split('/').at(-1);
    assert.equal(existsSync(new URL(file, directory)), true);
  }
}

console.log('Assets verificados: 13 escenas, 52 PNG y paleta alternativa verde/morado/amarillo.');
