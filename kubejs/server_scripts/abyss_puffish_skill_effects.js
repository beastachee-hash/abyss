// ABYSS Balance Stage 06 — additional Pufferfish Skills effects.
// Minecraft 1.18.2 / Forge 40.2.34 / KubeJS 1802.5.5 / Pufferfish Skills 0.19.2
// All effects are external; the ABYSS JAR is not modified.
// Only active, participating ABYSS runs receive these temporary attribute modifiers.

var ABYSS_SKILL_PROFILE_KEY = 'AbyssPlayerData';
var ABYSS_SKILL_DIMENSION = 'abyss:abyss';
var ABYSS_SKILL_ATTRIBUTES_READY = false;
var ABYSS_SKILL_ATTRIBUTES = null;
var ABYSS_SKILL_ATTRIBUTE_OPERATION = null;
var ABYSS_SKILL_RUN_DATA = null;
var ABYSS_SKILL_API_ERROR_LOGGED = false;

try {
    ABYSS_SKILL_ATTRIBUTES = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes');
    ABYSS_SKILL_ATTRIBUTE_OPERATION = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation');
    ABYSS_SKILL_RUN_DATA = Java.loadClass('com.abyss.mod.dungeon.AbyssRunSavedData');
    ABYSS_SKILL_ATTRIBUTES_READY = true;
    console.info('[ABYSS Balance] Stage 06 Pufferfish skill effects initialized.');
} catch (error) {
    console.error('[ABYSS Balance] Stage 06 APIs unavailable; optional skill effects disabled safely. ' + error);
}

function abyssSkillGetProfile(player) {
    if (player == null) return null;
    return player.getPersistentData().getCompound(ABYSS_SKILL_PROFILE_KEY);
}

function abyssSkillGetActiveRun(player) {
    if (!ABYSS_SKILL_ATTRIBUTES_READY || player == null) return null;
    try {
        if (String(player.level.dimension().location()) !== ABYSS_SKILL_DIMENSION) return null;
        var server = player.getServer();
        if (server == null) return null;
        var run = ABYSS_SKILL_RUN_DATA.get(server).getRunForPlayer(player.getUUID());
        if (run == null || String(run.getStatus().name()) !== 'ACTIVE') return null;
        if (!run.hasParticipant(player.getUUID())) return null;
        return run;
    } catch (error) {
        if (!ABYSS_SKILL_API_ERROR_LOGGED) {
            ABYSS_SKILL_API_ERROR_LOGGED = true;
            console.error('[ABYSS Balance] Could not inspect active run for optional class talents; effects disabled safely. ' + error);
        }
        return null;
    }
}

function abyssSkillSetAttribute(playerWrapper, attribute, modifierName, amount, operation, enabled) {
    if (enabled) {
        playerWrapper.modifyAttribute(attribute, modifierName, amount, operation);
    } else {
        playerWrapper.removeAttribute(attribute, modifierName);
    }
}

// KubeJS PlayerTick is post-tick. The attributes are added/removed once per second,
// replacing a stable modifier UUID rather than stacking new modifiers.
onEvent('player.tick', function (event) {
    if (!ABYSS_SKILL_ATTRIBUTES_READY) return;
    var playerWrapper = event.getPlayer();
    if (playerWrapper == null || playerWrapper.isFake()) return;
    var player = playerWrapper.minecraftPlayer;
    if (player == null || player.tickCount % 20 !== 0) return;

    var profile = abyssSkillGetProfile(player);
    var selectedClass = profile.getString('selected_class');
    var tags = player.getTags();
    var activeRun = abyssSkillGetActiveRun(player) != null;

    // Warrior: Counter — +8% attack damage while inside an active ABYSS run.
    // Pufferfish's 1.18.2 event wrapper exposes hurt damage read-only, so this is
    // implemented as a temporary attribute modifier, not a per-target damage hook.
    abyssSkillSetAttribute(
        playerWrapper,
        ABYSS_SKILL_ATTRIBUTES.ATTACK_DAMAGE,
        'abyss_balance_warrior_counter',
        0.08,
        ABYSS_SKILL_ATTRIBUTE_OPERATION.MULTIPLY_TOTAL,
        activeRun && selectedClass === 'warrior' && tags.contains('abyss_warrior_counter')
    );

    // Warrior: Bulwark — +1.25 armor during the run (approximately 5% on ordinary
    // hits; actual reduction follows Minecraft's armor formula and incoming damage).
    abyssSkillSetAttribute(
        playerWrapper,
        ABYSS_SKILL_ATTRIBUTES.ARMOR,
        'abyss_balance_warrior_bulwark',
        1.25,
        ABYSS_SKILL_ATTRIBUTE_OPERATION.ADDITION,
        activeRun && selectedClass === 'warrior' && tags.contains('abyss_warrior_bulwark')
    );

    // Mage: Runic Ward — same modest, run-only armor bonus.
    abyssSkillSetAttribute(
        playerWrapper,
        ABYSS_SKILL_ATTRIBUTES.ARMOR,
        'abyss_balance_mage_runic_ward',
        1.25,
        ABYSS_SKILL_ATTRIBUTE_OPERATION.ADDITION,
        activeRun && selectedClass === 'mage' && tags.contains('abyss_mage_ward')
    );
});

// Necromancer: Grave Flesh — reinforce only ABYSS-owned skeleton guards.
// The summon owner and run ID are written by ABYSS before addFreshEntity(), so this
// hook can safely identify the exact summoned unit without affecting natural skeletons.
onEvent('entity.spawned', function (event) {
    if (!ABYSS_SKILL_ATTRIBUTES_READY) return;
    var wrappedEntity = event.getEntity();
    if (wrappedEntity == null || String(wrappedEntity.getType()) !== 'minecraft:skeleton') return;

    var skeleton = wrappedEntity.minecraftEntity;
    if (skeleton == null) return;
    var summonData = skeleton.getPersistentData();
    if (!summonData.hasUUID('AbyssSummonOwner')) return;
    if (summonData.getBoolean('AbyssBalanceGraveFleshApplied')) return;

    var level = event.getLevel().getMinecraftLevel();
    if (level == null || String(level.dimension().location()) !== ABYSS_SKILL_DIMENSION) return;
    var server = level.getServer();
    if (server == null) return;

    try {
        var ownerId = summonData.getUUID('AbyssSummonOwner');
        var owner = server.getPlayerList().getPlayer(ownerId);
        if (owner == null) return;

        var ownerProfile = abyssSkillGetProfile(owner);
        if (ownerProfile.getString('selected_class') !== 'necromancer') return;
        if (!owner.getTags().contains('abyss_necromancer_grave_flesh')) return;

        var run = abyssSkillGetActiveRun(owner);
        if (run == null || String(run.getId()) !== summonData.getString('AbyssSummonRunId')) return;

        var maxHealth = skeleton.getAttribute(ABYSS_SKILL_ATTRIBUTES.MAX_HEALTH);
        var attackDamage = skeleton.getAttribute(ABYSS_SKILL_ATTRIBUTES.ATTACK_DAMAGE);
        if (maxHealth != null) {
            maxHealth.setBaseValue(maxHealth.getBaseValue() + 8.0);
            skeleton.setHealth(Math.min(skeleton.getMaxHealth(), skeleton.getHealth() + 8.0));
        }
        if (attackDamage != null) {
            attackDamage.setBaseValue(attackDamage.getBaseValue() + 1.5);
        }

        summonData.putBoolean('AbyssBalanceGraveFleshApplied', true);
    } catch (error) {
        if (!ABYSS_SKILL_API_ERROR_LOGGED) {
            ABYSS_SKILL_API_ERROR_LOGGED = true;
            console.error('[ABYSS Balance] Grave Flesh summon enhancement failed safely. ' + error);
        }
    }
});
