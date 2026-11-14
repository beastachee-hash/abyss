// ABYSS portal recipe — Stage D progression integration (Minecraft 1.18.2 / KubeJS 1802.5.5).
// Requires one late Advanced Netherite component, Terrasteel and an Ars Nouveau Source Gem.
// The map-form ID filter is intentional: string filters are unsafe in this pack's KubeJS build.
onEvent('recipes', event => {
    event.remove({ id: 'abyss:abyss_portal' });
    event.shaped('abyss:abyss_portal', [
        'NTN',
        'OAO',
        'OBO'
    ], {
        N: 'minecraft:netherite_ingot',
        T: 'advancednetherite:netherite_emerald_ingot',
        O: 'minecraft:obsidian',
        A: 'ars_nouveau:source_gem',
        B: 'botania:terrasteel_ingot'
    });
});
