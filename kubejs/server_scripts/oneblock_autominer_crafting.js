// KubeJS recipe for OneBlock Evolved auto miner.
// Minecraft 1.18.2 / KubeJS 1802.5.5
onEvent('recipes', event => {
    event.shaped('oneblock:autominer', [
        'P G',
        'I I',
        'S A'
    ], {
        P: 'minecraft:diamond_pickaxe',
        G: 'thermal:iron_gear',
        I: 'minecraft:iron_ingot',
        S: 'minecraft:diamond_shovel',
        A: 'minecraft:diamond_axe'
    });
});