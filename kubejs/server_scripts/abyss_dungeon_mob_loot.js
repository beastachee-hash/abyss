// ABYSS Balance — Stage 07: difficulty-gated mod ingots + rare Draconium Dust.
// Target: Minecraft 1.18.2 / Forge 40.2.34 / KubeJS 1802.5.5.
// This script is external to ABYSS; no Java classes or JARs are changed by this file.
// Every hostile mob owned by an active ABYSS run drops one guaranteed modded ingot.
// Elite/boss mobs have a separate chance for a second ingot. Draconium Dust is a rare bonus.
// Friendly ABYSS-created summons are intentionally excluded to prevent summon farming.

var ABYSS_DROPS_DIMENSION = 'abyss:abyss';
var ABYSS_DROPS_RUN_DATA_CLASS = null;
var ABYSS_DROPS_API_READY = false;
var ABYSS_DROPS_ERROR_LOGGED = false;

try {
    ABYSS_DROPS_RUN_DATA_CLASS = Java.loadClass('com.abyss.mod.dungeon.AbyssRunSavedData');
    ABYSS_DROPS_API_READY = true;
    console.info('[ABYSS Balance] Stage 07 connected to AbyssRunSavedData.');
} catch (error) {
    console.error('[ABYSS Balance] Stage 07 could not access ABYSS run data; modded mob drops are disabled safely. ' + error);
}

// Weighted material pools. All registry IDs below were checked against the supplied mod JARs
// and/or ABYSS's original loot tables. Tiers follow ABYSS difficulty: 0 Normal, 1 Nightmare, 2 Abyssal.
var ABYSS_MOD_INGOTS_NORMAL = [
    { id: 'thermal:tin_ingot', weight: 22 },
    { id: 'thermal:lead_ingot', weight: 22 },
    { id: 'thermal:nickel_ingot', weight: 16 },
    { id: 'thermal:silver_ingot', weight: 10 },
    { id: 'mekanism:ingot_osmium', weight: 16 },
    { id: 'mekanism:ingot_tin', weight: 7 },
    { id: 'mekanism:ingot_lead', weight: 7 }
];

var ABYSS_MOD_INGOTS_NIGHTMARE = [
    { id: 'thermal:invar_ingot', weight: 16 },
    { id: 'thermal:electrum_ingot', weight: 15 },
    { id: 'thermal:constantan_ingot', weight: 13 },
    { id: 'thermal:bronze_ingot', weight: 10 },
    { id: 'mekanism:ingot_bronze', weight: 13 },
    { id: 'mekanism:ingot_steel', weight: 12 },
    { id: 'botania:manasteel_ingot', weight: 9 },
    { id: 'advancednetherite:netherite_iron_ingot', weight: 12 }
];

var ABYSS_MOD_INGOTS_ABYSSAL = [
    { id: 'thermal:signalum_ingot', weight: 13 },
    { id: 'thermal:lumium_ingot', weight: 12 },
    { id: 'thermal:enderium_ingot', weight: 10 },
    { id: 'mekanism:ingot_refined_obsidian', weight: 13 },
    { id: 'mekanism:ingot_refined_glowstone', weight: 9 },
    { id: 'botania:elementium_ingot', weight: 10 },
    { id: 'botania:terrasteel_ingot', weight: 5 },
    { id: 'cataclysm:enderite_ingot', weight: 12 },
    { id: 'cataclysm:witherite_ingot', weight: 8 },
    { id: 'advancednetherite:netherite_gold_ingot', weight: 8 }
];

var ABYSS_MOD_INGOTS_NGPLUS = [
    { id: 'cataclysm:ignitium_ingot', weight: 12 },
    { id: 'advancednetherite:netherite_diamond_ingot', weight: 12 },
    { id: 'botania:gaia_ingot', weight: 8 },
    { id: 'thermal:enderium_ingot', weight: 12 },
    { id: 'mekanism:ingot_refined_obsidian', weight: 10 },
    { id: 'crystalcraft_unlimited_java:unoptanium', weight: 15 },
    { id: 'crystalcraft_unlimited_java:plutonium', weight: 12 },
    { id: 'crystalcraft_unlimited_java:meteorite_ingot', weight: 19 }
];

// Per-entity extra-ingot chance. This roll is independent from the guaranteed base ingot.
// Other ABYSS-tagged enemies still get the guaranteed tier-appropriate ingot.
var ABYSS_MOB_BONUS_CHANCE = {
    'abyss:abyss_smart_zombie': 0.12,
    'minecraft:zombie': 0.10,
    'abyss:abyss_smart_stray': 0.14,
    'minecraft:stray': 0.12,
    'minecraft:skeleton': 0.12,
    'minecraft:spider': 0.09,
    'minecraft:cave_spider': 0.12,
    'minecraft:pillager': 0.11,
    'minecraft:vindicator': 0.14,
    'minecraft:witch': 0.16,
    'abyss:abyss_executioner': 0.35,
    'minecraft:ravager': 0.30,
    'cataclysm:ignis': 0.45,
    'cataclysm:ender_guardian': 0.45,
    'cataclysm:netherite_monstrosity': 0.45,
    'twilightforest:minoshroom': 0.35
};

function abyssDropsChooseWeighted(pool) {
    var total = 0;
    for (var i = 0; i < pool.length; i++) total += pool[i].weight;
    if (total <= 0) return null;
    var roll = Math.random() * total;
    for (var j = 0; j < pool.length; j++) {
        roll -= pool[j].weight;
        if (roll < 0) return pool[j].id;
    }
    return pool[pool.length - 1].id;
}

function abyssDropsPoolForRun(run) {
    if (run.isNewGamePlus()) return ABYSS_MOD_INGOTS_NGPLUS;
    var difficulty = run.getDifficulty();
    if (difficulty === 2) return ABYSS_MOD_INGOTS_ABYSSAL;
    if (difficulty === 1) return ABYSS_MOD_INGOTS_NIGHTMARE;
    return ABYSS_MOD_INGOTS_NORMAL;
}

function abyssDropsSpawn(server, x, y, z, itemId, count) {
    // Mark as ABYSS dungeon loot so the existing collection/pickup tracking can recognize it.
    var nbt = '{Item:{id:"' + itemId + '",Count:' + count + 'b,tag:{AbyssDungeonLoot:1b}},PickupDelay:10s,Age:-32768s}';
    var command = 'execute in ' + ABYSS_DROPS_DIMENSION + ' run summon minecraft:item '
        + x + ' ' + y + ' ' + z + ' ' + nbt;
    server.runCommandSilent(command);
}

function abyssDropsDraconiumChance(run, isElite, isBoss) {
    var chance;
    if (run.isNewGamePlus()) chance = 0.03;
    else if (run.getDifficulty() === 2) chance = 0.02;
    else if (run.getDifficulty() === 1) chance = 0.01;
    else chance = 0.005;

    if (isElite) chance *= 2.0;
    if (isBoss) chance *= 2.0;
    if (run.getFloor() >= 8) chance *= 1.25;
    return Math.min(chance, 0.15);
}

onEvent('entity.death', function (event) {
    if (!ABYSS_DROPS_API_READY) return;

    var entity = event.getEntity();
    if (entity == null) return;
    var nativeEntity = entity.minecraftEntity;
    if (nativeEntity == null) return;
    var nativeLevel = nativeEntity.level;
    if (nativeLevel == null || String(nativeLevel.dimension().location()) !== ABYSS_DROPS_DIMENSION) return;

    var data = nativeEntity.getPersistentData();
    // ABYSS tags every expedition enemy/boss with AbyssRunId. Ignore natural/unowned entities.
    if (!data.hasUUID('AbyssRunId')) return;
    // Preserve ABYSS's anti-farming rule for allied/summoned servants.
    if (data.getBoolean('AbyssModifierSummon')) return;
    if (data.getBoolean('AbyssBalanceStage07RewardHandled')) return;

    var kubeServer = event.getServer();
    var nativeServer = nativeLevel.getServer();
    if (kubeServer == null || nativeServer == null) return;

    try {
        var runId = data.getUUID('AbyssRunId');
        var run = ABYSS_DROPS_RUN_DATA_CLASS.get(nativeServer).getRun(runId);
        if (run == null || String(run.getStatus().name()) !== 'ACTIVE') return;
        if (!nativeEntity.getTags().contains(run.getMobTag())) return;

        data.putBoolean('AbyssBalanceStage07RewardHandled', true);

        var entityId = String(entity.getType());
        var isBoss = nativeEntity.getTags().contains(run.getBossTag()) || data.getBoolean('AbyssNativeBossAI');
        var isElite = isBoss || nativeEntity.getTags().contains(run.getEliteTag())
            || nativeEntity.getTags().contains(run.getMiniBossTag());
        var ingotPool = abyssDropsPoolForRun(run);
        var guaranteedIngot = abyssDropsChooseWeighted(ingotPool);
        var bonusChance = ABYSS_MOB_BONUS_CHANCE[entityId] || (isBoss ? 0.40 : isElite ? 0.18 : 0.0);
        var bonusIngot = Math.random() < bonusChance ? abyssDropsChooseWeighted(ingotPool) : null;
        var draconiumChance = abyssDropsDraconiumChance(run, isElite, isBoss);
        var dropDraconium = Math.random() < draconiumChance;

        // Capture everything before the entity is removed. Spawn one tick later, after
        // ABYSS has cleared native drops from its protected external bosses.
        var x = Math.round(nativeEntity.getX() * 100) / 100;
        var y = Math.round((nativeEntity.getY() + 0.25) * 100) / 100;
        var z = Math.round(nativeEntity.getZ() * 100) / 100;
        kubeServer.scheduleInTicks(1, function () {
            if (guaranteedIngot != null) abyssDropsSpawn(kubeServer, x, y, z, guaranteedIngot, 1);
            if (bonusIngot != null && bonusIngot !== guaranteedIngot) {
                abyssDropsSpawn(kubeServer, x + 0.12, y + 0.08, z + 0.12, bonusIngot, 1);
            }
            if (dropDraconium) {
                abyssDropsSpawn(kubeServer, x - 0.12, y + 0.08, z - 0.12, 'draconicevolution:draconium_dust', 1);
            }
        });
    } catch (error) {
        if (!ABYSS_DROPS_ERROR_LOGGED) {
            ABYSS_DROPS_ERROR_LOGGED = true;
            console.error('[ABYSS Balance] Stage 07 failed to resolve run-scoped mob loot; custom rewards disabled safely. ' + error);
        }
    }
});

console.info('[ABYSS Balance] Stage 07 configured: one guaranteed mod ingot per active-run enemy, optional bonus ingots, rare Draconium Dust.');
