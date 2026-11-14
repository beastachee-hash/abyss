// ABYSS Stage D1 — Crystalcraft ore world-generation restriction.
// Target platform: Minecraft 1.18.2 / Forge / KubeJS 1802.5.5.
// In KubeJS 1.18.2 this is registered through onEvent('worldgen.remove')
// from startup_scripts. Do not use the later WorldgenEvents global here.
//
// The block predicate is intentionally anchored to the exact Crystalcraft
// namespace and the _ore suffix, so it does not match ingots, blocks or tools.
onEvent('worldgen.remove', event => {
    event.removeOres(ores => {
        ores.blocks = /^crystalcraft_unlimited_java:.*_ore$/;
    });

    console.log('[ABYSS Stage D1] Registered Crystalcraft ore removal for block IDs matching ^crystalcraft_unlimited_java:.*_ore$.');
});
