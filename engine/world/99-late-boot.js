  // -------- late boot (deferred forward-ref-safe calls) --------
  // Calls relocated here from earlier modules whose original top-level
  // position (valid under the single-script build's hoisting) now runs before
  // their dependencies' modules have loaded. Running them once at the end —
  // after every module is defined — reproduces the original behaviour.

  // Was at module 02 top level; reaches syncCloudPopulation/clouds (module 23).
  // Guarded internally (no-op until clouds exist), so an extra end-of-load
  // sync is safe and idempotent.
  applyCloudSettings();

  // Render-settings panel wiring (module 21). Was an IIFE that ran at module
  // load and reached forward into module 27 (syncPlanetUnderlayToggle) and
  // syncAiSettings. Runs identically here, after every module is defined.
  setupRenderSettings();

  // Material sliders are persisted before the app boots, but the actual
  // colour/wear pass used to run only after the user moved a control. Apply it
  // once now so saved wear-and-tear is visible on first render.
  if (typeof applyPersistedMaterialSettingsOnBoot === 'function') {
    applyPersistedMaterialSettingsOnBoot();
  }

  // Build the cloud sea now if it was left enabled in a previous session
  // (default is off, so this is usually a no-op).
  if (typeof setCloudSeaEnabled === 'function' && typeof renderCloudSea !== 'undefined') {
    setCloudSeaEnabled(renderCloudSea);
  }

  // Apply persisted cloud style (voxel vs soft sprite clouds). Default 'voxel'
  // is a no-op; 'soft' hides the voxel clouds and builds the sprite clumps.
  if (typeof setCloudStyle === 'function' && typeof renderCloudStyle !== 'undefined') {
    setCloudStyle(renderCloudStyle);
  }

  if (typeof applyStarlitAtmosphereSettings === 'function') {
    applyStarlitAtmosphereSettings();
  }

  // Wire the global "Building windows" controls (Settings -> Materials) and
  // apply any persisted window defaults. Runs after the settings DOM + the
  // WINDOW config exist.
  if (typeof setupWindowGlobalSettings === 'function') {
    setupWindowGlobalSettings();
  }

  // ---- mesh-bake measurement experiment (flag-gated, off by default) ----
  // Confirms the draw-call win of baking the home-grid static tile base into
  // merged per-material meshes (the concept from the landscape feasibility
  // study). Exposed only with ?meshbake=1 so the production surface stays
  // clean. Measurement only: it does NOT wire the per-region predicate or the
  // unbake-on-edit lifecycle, and it is destructive to the live tile graph, so
  // reload to restore. Call window.__bakeHomeTilesExperiment() from the console
  // (or Playwright) and read the stats-overlay draw count before vs after.
  try {
    const meshBakeFlag = new URLSearchParams(window.location.search).get('meshbake') === '1';
    if (meshBakeFlag && typeof mergeStaticBaseMeshesByMaterial === 'function') {
      window.__bakeHomeTilesExperiment = function () {
        if (typeof worldGroup === 'undefined' || !worldGroup) return { error: 'no worldGroup' };
        if (typeof cellMeshes === 'undefined') return { error: 'no cellMeshes' };
        const bakeRoot = new THREE.Group();
        bakeRoot.name = 'home-tile-bake-experiment';
        worldGroup.add(bakeRoot);
        let baked = 0;
        for (const key in cellMeshes) {
          const entry = cellMeshes[key];
          if (!entry || !entry.tile) continue;
          const parts = key.split(',').map(Number);
          if (parts.length !== 2) continue;            // home grid keys are 'x,z'
          const x = parts[0], z = parts[1];
          if (x < 0 || z < 0 || x >= GRID || z >= GRID) continue;
          // attach() reparents while preserving the tile's world transform so
          // the merge bakes it into the correct world position.
          bakeRoot.attach(entry.tile);
          baked++;
        }
        const tileGroupsBefore = bakeRoot.children.length;
        // Home tiles always carry a transparent fade material (prepareFadeable
        // sets keepFadeAtOpaque=true for fadeRole 'tile'), which the static
        // merge rejects. The settled home grid is always full opacity, so swap
        // each mesh back to its preserved opaque baseMat before merging.
        let restoredOpaque = 0;
        bakeRoot.traverse(o => {
          if (o.isMesh && o.userData && o.userData.baseMat && o.material !== o.userData.baseMat) {
            o.material = o.userData.baseMat;
            restoredOpaque++;
          }
        });
        mergeStaticBaseMeshesByMaterial(bakeRoot, { reason: 'home-tile-bake-experiment' });
        let mergedMeshes = 0;
        bakeRoot.traverse(o => { if (o.isMesh && o.userData && o.userData.staticBaseMerged) mergedMeshes++; });
        return {
          bakedCells: baked,
          tileGroupsBefore,
          restoredOpaque,
          mergedMeshes,
          note: 'destructive; reload to restore. Read stats-overlay draws before vs after.',
        };
      };
      if (typeof console !== 'undefined') {
        console.log('[meshbake] experiment armed - call window.__bakeHomeTilesExperiment()');
      }
    }
  } catch (_) {}
