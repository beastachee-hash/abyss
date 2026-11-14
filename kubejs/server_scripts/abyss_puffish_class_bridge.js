// ABYSS 0.5.121 <-> Pufferfish Skills bridge
// Minecraft 1.18.2 / Forge 40.2.34 / KubeJS 1802.5.5 / Pufferfish Skills 0.19.2
// This script does not modify ABYSS classes or JAR files.
// It reads ABYSS's existing persistent class flags and uses Pufferfish's own lock/unlock commands.

var ABYSS_CLASS_SYNC_KEY = 'AbyssBalancePuffishSyncV1';
var ABYSS_CLASS_SYNC_ERROR_KEY = 'AbyssBalancePuffishSyncErrorV1';
var ABYSS_PROFILE_KEY = 'AbyssPlayerData';

var ABYSS_CLASS_IDS = ['warrior', 'assassin', 'mage', 'necromancer'];
var ABYSS_PUFFISH_CATEGORY_PREFIX = 'puffish_skills:abyss_';

// These APIs are already public in ABYSS 0.5.121. If an incompatible ABYSS build
// is installed, category synchronization still works; resource perks fail closed.
var AbyssRunSavedDataClass = null;
var AbyssPlayerDataClass = null;
var ServerPlayerClass = null;
var ABYSS_BRIDGE_READY = false;
var ABYSS_BRIDGE_ERROR_LOGGED = false;

try {
    AbyssRunSavedDataClass = Java.loadClass('com.abyss.mod.dungeon.AbyssRunSavedData');
    AbyssPlayerDataClass = Java.loadClass('com.abyss.mod.progression.AbyssPlayerData');
    ServerPlayerClass = Java.loadClass('net.minecraft.server.level.ServerPlayer');
    ABYSS_BRIDGE_READY = true;
    console.info('[ABYSS Balance] Pufferfish class bridge connected to ABYSS 0.5.121.');
} catch (error) {
    console.error('[ABYSS Balance] ABYSS API bridge unavailable; class access sync remains active. ' + error);
}

function abyssProfileFromEntity(entity) {
    if (entity == null) return null;
    return entity.getPersistentData().getCompound(ABYSS_PROFILE_KEY);
}

function abyssClassUnlocked(profile, selectedClass, classId) {
    if (classId === 'warrior') return true;
    if (profile == null) return selectedClass === classId;
    // selected_class is also accepted as a migration safeguard for older saves:
    // a player who already selected a class must not lose access after this patch.
    return profile.getBoolean('class_' + classId) || selectedClass === classId;
}

function abyssSyncPuffishCategories(player) {
    if (player == null || player.isFake()) return;

    var persistent = player.getPersistentData();
    var profile = persistent.getCompound(ABYSS_PROFILE_KEY);
    var selectedClass = profile.getString('selected_class');
    var allowed = {};
    var states = [];

    for (var i = 0; i < ABYSS_CLASS_IDS.length; i++) {
        var classId = ABYSS_CLASS_IDS[i];
        allowed[classId] = abyssClassUnlocked(profile, selectedClass, classId);
        states.push(classId + '=' + (allowed[classId] ? '1' : '0'));
    }

    var state = states.join('|');
    if (persistent.getString(ABYSS_CLASS_SYNC_KEY) === state) return;

    var server = player.getServer();
    if (server == null) return;

    var playerName = player.getProfile().getName();
    var allCommandsSucceeded = true;

    for (var j = 0; j < ABYSS_CLASS_IDS.length; j++) {
        var id = ABYSS_CLASS_IDS[j];
        var action = allowed[id] ? 'unlock' : 'lock';
        var categoryId = ABYSS_PUFFISH_CATEGORY_PREFIX + id;
        var command = 'puffish_skills category ' + action + ' ' + playerName + ' ' + categoryId;
        var result = server.runCommandSilent(command);
        if (result < 1) allCommandsSucceeded = false;
    }

    if (allCommandsSucceeded) {
        persistent.putString(ABYSS_CLASS_SYNC_KEY, state);
        persistent.remove(ABYSS_CLASS_SYNC_ERROR_KEY);
        console.info('[ABYSS Balance] Synced class skill access for one player.');
    } else if (persistent.getString(ABYSS_CLASS_SYNC_ERROR_KEY) !== state) {
        // Retry on the next 5-second sync check, but report a given bad state only once.
        persistent.putString(ABYSS_CLASS_SYNC_ERROR_KEY, state);
        console.error('[ABYSS Balance] Could not sync one or more Pufferfish categories. Check category IDs and Pufferfish Skills logs.');
    }
}

function abyssGetActiveRun(nativePlayer) {
    if (!ABYSS_BRIDGE_READY || nativePlayer == null) return null;
    try {
        var server = nativePlayer.getServer();
        if (server == null) return null;
        var uuid = nativePlayer.getUUID();
        var run = AbyssRunSavedDataClass.get(server).getRunForPlayer(uuid);
        if (run == null) return null;
        if (String(run.getStatus().name()) !== 'ACTIVE') return null;
        if (!run.hasParticipant(uuid)) return null;
        return run;
    } catch (error) {
        if (!ABYSS_BRIDGE_ERROR_LOGGED) {
            ABYSS_BRIDGE_ERROR_LOGGED = true;
            console.error('[ABYSS Balance] Failed to read active DungeonRun; resource talents are disabled safely. ' + error);
        }
        return null;
    }
}

onEvent('player.logged_in', event => {
    abyssSyncPuffishCategories(event.getPlayer());
});

onEvent('player.tick', event => {
    var player = event.getPlayer();
    if (player == null || player.isFake()) return;

    var ticks = player.getTicksExisted();
    if (ticks % 100 === 0) {
        abyssSyncPuffishCategories(player);
    }

    // ABYSS itself restores the base amount once per 20 ticks.
    // These are additive +1 bonuses and run only during a real ACTIVE DungeonRun.
    if (!ABYSS_BRIDGE_READY || ticks % 20 !== 0) return;

    var nativePlayer = player.minecraftPlayer;
    var run = abyssGetActiveRun(nativePlayer);
    if (run == null) return;

    var profile = abyssProfileFromEntity(nativePlayer);
    var selectedClass = profile.getString('selected_class');
    var tags = nativePlayer.getTags();

    if (selectedClass === 'warrior'
            && abyssClassUnlocked(profile, selectedClass, 'warrior')
            && tags.contains('abyss_warrior_rhythm')) {
        AbyssPlayerDataClass.addCombatResource(nativePlayer, 1);
    } else if (selectedClass === 'assassin'
            && abyssClassUnlocked(profile, selectedClass, 'assassin')
            && tags.contains('abyss_assassin_flow')) {
        AbyssPlayerDataClass.addCombatResource(nativePlayer, 1);
    } else if (selectedClass === 'mage'
            && abyssClassUnlocked(profile, selectedClass, 'mage')
            && tags.contains('abyss_mage_flow')) {
        AbyssPlayerDataClass.addCombatResource(nativePlayer, 1);
    }
});

// The Necromancer skill is a separate +4 resource reward on each kill.
// Restrict it to mobs marked by the current ABYSS run, avoiding world-mob farming.
onEvent('entity.death', event => {
    if (!ABYSS_BRIDGE_READY) return;

    var source = event.getSource();
    if (source == null) return;
    var attacker = source.getEntity();
    if (attacker == null || !(attacker instanceof ServerPlayerClass)) return;

    var run = abyssGetActiveRun(attacker);
    if (run == null) return;

    var victim = event.getEntity();
    if (victim == null || !victim.getTags().contains(run.getMobTag())) return;

    var profile = abyssProfileFromEntity(attacker);
    var selectedClass = profile.getString('selected_class');
    if (selectedClass !== 'necromancer'
            || !abyssClassUnlocked(profile, selectedClass, 'necromancer')
            || !attacker.getTags().contains('abyss_necromancer_soul_collector')) return;

    AbyssPlayerDataClass.addCombatResource(attacker, 4);
});
