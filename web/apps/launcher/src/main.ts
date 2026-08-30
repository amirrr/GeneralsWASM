/**
 * Launcher entry point: wires the canvas, loading/error overlays, settings
 * panel, and room create/join UI together. This module intentionally stops
 * short of instantiating the actual Emscripten engine module (not yet part
 * of this scaffold) — `startEngineBoot` is the seam where that integration
 * will land.
 */
import { LAUNCHER_CONFIG } from "./config.js";
import { loadEngineManifest } from "./engine-manifest.js";
import { AssetManager } from "./assets/asset-manager.js";
import { openAssetStorage, requestPersistentStorage } from "./assets/storage.js";
import { AssetStorageQuotaError, AssetIntegrityError, AssetCancelledError } from "./assets/errors.js";
import type { AssetVfs } from "./assets/vfs.js";
import { createGameCanvas } from "./ui/canvas.js";
import { createLoadingOverlay } from "./ui/loading.js";
import { createErrorOverlay } from "./ui/error.js";
import { createSettingsPanel } from "./ui/settings.js";
import { createRoomPanel, generateRoomId } from "./ui/room.js";
import { SignalingClient } from "./net/signaling-client.js";
import "./style.css";

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing required #${id} element in index.html`);
  return element;
}

/** Turns a typed asset failure into an actionable message for the player. */
function describeAssetFailure(error: unknown): string {
  if (error instanceof AssetStorageQuotaError) {
    return "Not enough browser storage to install the game data. Free up disk space or clear site data, then retry.";
  }
  if (error instanceof AssetIntegrityError) {
    return `Game data failed verification (${error.path}). The download was discarded; retry to fetch a clean copy.`;
  }
  if (error instanceof AssetCancelledError) {
    return "Loading was cancelled.";
  }
  return error instanceof Error ? error.message : "asset download failed";
}

let activeBoot: AbortController | undefined;
let mountedAssets: AssetVfs | undefined;

/** Verified, mounted asset tree. This is the seam the Emscripten module will
 * read archives through once engine instantiation lands. */
export function mountedAssetVfs(): AssetVfs | undefined {
  return mountedAssets;
}

async function startEngineBoot(): Promise<void> {
  // A retry must cancel the downloads the previous attempt left in flight;
  // partial files stay on disk and the next attempt resumes them.
  activeBoot?.abort();
  const bootAbort = new AbortController();
  activeBoot = bootAbort;

  const app = requireElement("app");
  // Retry (see the error overlay's onRetry callback below) re-invokes this
  // whole function; without clearing first, each retry would append a
  // second full set of canvas/overlay/panel elements on top of the first.
  app.replaceChildren();
  createGameCanvas(app);
  const loading = createLoadingOverlay(app);
  const error = createErrorOverlay(app);
  const settings = createSettingsPanel(app, () => {
    /* Settings changes are applied to the engine once it is embedded; this
     * scaffold only persists them in memory via the panel's own state. */
  });
  const signaling = new SignalingClient(LAUNCHER_CONFIG.signalingWorkerUrl);
  const room = createRoomPanel(
    app,
    {
      onCreateRoom(capacity) {
        signaling.connect(generateRoomId(), { capacity });
      },
      onJoinRoom(roomId) {
        signaling.connect(roomId);
      },
      onLeaveRoom() {
        signaling.leave();
        room.showLobbyState();
      },
    },
    LAUNCHER_CONFIG.defaultRoomCapacity,
  );
  signaling.on("welcome", (welcome) => {
    room.showJoinedState(welcome.roomId);
    room.setStatus(`Connected as slot ${welcome.slot} of ${welcome.capacity}`);
  });
  signaling.on("roster", (roster) => room.setRoster(roster));
  signaling.on("error", (err) => error.show(err.message));

  loading.show();
  loading.setStatus("Fetching engine manifest…");
  const manifestResult = await loadEngineManifest(LAUNCHER_CONFIG.manifestUrl);
  if (!manifestResult.ok) {
    loading.hide();
    error.show(manifestResult.reason, () => void startEngineBoot());
    return;
  }

  const assetManager = new AssetManager(manifestResult.manifest, {
    storage: await openAssetStorage(),
  });
  // Persistent storage keeps multi-gigabyte archives from being evicted
  // between sessions; a refusal is not fatal, it only means slower reboots.
  await requestPersistentStorage();

  try {
    loading.setStatus("Verifying game data…");
    const vfs = await assetManager.ensureAssets({
      signal: bootAbort.signal,
      onProgress(progress) {
        loading.setStatus(
          progress.source === "cache"
            ? `Verified ${progress.path}`
            : `Downloading ${progress.path}…`,
        );
        loading.setProgress(progress.overallLoadedBytes / Math.max(1, progress.overallTotalBytes));
      },
    });
    if (activeBoot !== bootAbort) {
      loading.hide();
      return;
    }
    mountedAssets = vfs;
  } catch (err) {
    loading.hide();
    // A superseded attempt must not paint over the overlay the newer one owns.
    if (activeBoot !== bootAbort) return;
    error.show(describeAssetFailure(err), () => void startEngineBoot());
    return;
  }

  loading.hide();
  // NOTE: Instantiating the Emscripten module and starting the render loop
  // is intentionally out of scope for this infrastructure scaffold.
  void settings.getSettings();
}

void startEngineBoot();
