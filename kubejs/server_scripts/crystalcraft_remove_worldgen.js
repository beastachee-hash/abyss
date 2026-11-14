// Best-effort removal of Crystalcraft Unlimited ore generation.
// If the KubeJS worldgen API is unavailable in this version, this script is skipped.
if (typeof WorldgenEvents !== 'undefined') {
    WorldgenEvents.remove(event => {
        event.removeOres(ores => {
            ores.blocks = /crystalcraft_unlimited_java:.*_ore/;
        });
    });
}
