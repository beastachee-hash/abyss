// Remove ONLY Crystalcraft Unlimited recipes whose RESULT is an INGOT or a GEM (crystal).
// 87 ingots + 157 gems from forge:ingots/* and forge:gems/* inside the Crystalcraft jar.
// Everything else (armor, tools, blocks, dusts, other mods) stays untouched.
//
// !! IMPORTANT — KubeJS bugs in this build (1802.5.5) !!
// 1) event.remove('some:id') with a PLAIN STRING filter becomes ALWAYS_TRUE
//    (RecipeFilter.of -> MapJS.of(string) == null -> ALWAYS_TRUE) and deletes
//    ALL recipes in the game. Always pass a map: event.remove({ id: '...' }).
// 2) A filter value given as /regex/ also matches everything — never use it.
//
// Structure (important): the forEachRecipe callback only COLLECTS crystalcraft
// recipes — same minimal body as the working tacz_remove_gun_recipes.js. Doing
// heavy work inside the callback previously crashed the whole recipes event with
// "Wrapped java.lang.IllegalArgumentException: fileName (...#31)". Everything
// else runs afterwards, in a separate function scope, guarded per step.
onEvent('recipes', event => {
    const NS = 'crystalcraft_unlimited_java:';

    // ---- items whose recipes must not exist (87 ingots + 157 gems) ----
    const NOMAKE = {};
    [
        // forge:ingots/* (87)
        'adamantite', 'alnico', 'aluminium', 'aluminium_bronze', 'amalgam', 'americium_ingot',
        'antimony', 'bismuth', 'brass', 'bronze', 'cadmium', 'calcium_ingot', 'carnotite',
        'cast_iron', 'chrome', 'cobalt', 'crimson_gold', 'cupronickel', 'duralumin', 'electrum',
        'europium_ingot', 'galaxite', 'german_silver', 'green_gold', 'holmium', 'hss',
        'hydro_pottasium_ingot', 'ilmenite', 'inconel', 'indium_ingot', 'iridium', 'lead',
        'lithium', 'magnesium', 'manganese_ingot', 'maradonyx', 'matizium', 'meteorite_ingot',
        'molybdenum_ingot', 'mythril', 'neon_meteorite', 'neptunium', 'nickel', 'niobium_ingot',
        'nordic_gold', 'orichalcum', 'osmium', 'palintinium', 'palladium', 'pelenium', 'pewter',
        'platinum', 'plutonium', 'pottasium_ingot', 'purple_gold', 'pyrite', 'quicksilver',
        'radium', 'rene_41', 'rhodium', 'rose_gold', 'ruthenium', 'scandium_ingot', 'seaborgium',
        'silicium', 'silver', 'stainless_steel', 'steel', 'stellite', 'tantalum', 'technetium',
        'thorium_ingot', 'tin', 'titanium', 'titanium_alloy', 'tungsten', 'unoptanium',
        'uranium', 'vanadium_ingot', 'withered_steel', 'xernium', 'yttrium_ingot', 'yurium',
        'zamak', 'zinc', 'zircaloy', 'zirconium_ingot',
        // forge:gems/* (157)
        'alexandrite', 'amazonite', 'amber', 'amethyst', 'ametrine', 'ammolite', 'angerite',
        'anti_humoranium', 'aquamarine', 'aura_quartz', 'australian_sapphire', 'azurite',
        'bixbite', 'black_catseye', 'black_opal', 'black_pearl', 'blood_quartz', 'bloodstone',
        'blue_catseye', 'blue_pearl', 'brickerite', 'brown_catseye', 'brown_diamond',
        'brown_pearl', 'catseye', 'chalcanthite', 'chrysolite', 'cinnabar', 'citrine',
        'corrupted_cyber_crystal', 'crystal', 'cyan_emerald', 'cyber_crystal',
        'dark_blue_diamond', 'dark_blue_pearl', 'dark_green_star_sapphire', 'dragon_scale',
        'eclipse_diamond', 'enderium', 'fire_opal', 'flourite', 'fluorite', 'garnet',
        'ghoul_quartz', 'goshenite', 'grandidierite', 'green_catseye', 'green_diamond',
        'green_pearl', 'green_star_sapphire', 'grindstone', 'hackmantite', 'hercynite',
        'howlite', 'humoranium', 'ice_opal', 'indigolite', 'iolite', 'iris_agate', 'jade',
        'jasper', 'kunzite', 'labradorite', 'larimar', 'malachite', 'maroon_diamond',
        'matrix_opal', 'medusa_quartz', 'moonstone', 'olive_diamond', 'olive_pearl', 'olivine',
        'onyx', 'opal', 'orange_catseye', 'orange_diamond', 'orange_pearl',
        'orange_star_sapphire', 'painite', 'peacock_ore', 'peacock_topaz', 'pearl_item',
        'peridot', 'pietersite', 'pink_catseye', 'pink_diamond', 'pink_pearl', 'pink_ruby',
        'pink_star_sapphire', 'pitambari_neelam', 'prism', 'purple_catseye', 'purple_diamond',
        'purple_pearl', 'purple_star_sapphire', 'rainbow_opal', 'rare_amethyst', 'rare_citrine',
        'rare_sapphire', 'rare_star_sapphire', 'rare_tanzanite', 'raspberry_diamond',
        'red_catseye', 'red_diamond', 'red_pearl', 'rhodonite', 'rose_quartz', 'ruby', 'rutile',
        'saphire', 'sapphire', 'sardonyx', 'seaborgium', 'serpentine', 'shadow_diamond',
        'smoky_quartz', 'snowflake_obsidian', 'solar_diamond', 'sonoranite', 'soul_quartz',
        'spinel', 'star_ruby', 'star_sapphire', 'stibnite', 'sugillite', 'sunset_jasper',
        'sunstone', 'tanzanite', 'titanium_quartz', 'topaz', 'tourmaline', 'turquoise',
        'umbranova', 'vesuvianite', 'watermelon_tourmaline', 'white_catseye', 'white_diamond',
        'white_pearl', 'yellow_catseye', 'yellow_diamond', 'yellow_onyx', 'yellow_pearl',
        'yellow_star_sapphire', 'zebra_jasper', 'zircon_1', 'zircon_10', 'zircon_11',
        'zircon_12', 'zircon_14', 'zircon_2', 'zircon_3', 'zircon_4', 'zircon_5', 'zircon_6',
        'zircon_7', 'zircon_8', 'zircon_9'
    ].forEach(n => { NOMAKE[NS + n] = 1; });

    // Dump an error with its Java stack trace (the plain log line hides it).
    function dumpErr(tag, e) {
        try { console.log(tag + ' e=' + e); } catch (x) { }
        try { console.log(tag + ' message=' + e.message); } catch (x) { }
        try { console.log(tag + ' jsStack=' + e.stack); } catch (x) { }
        try {
            var je = null;
            try { je = e.javaException; } catch (x) { }
            if (je == null) { try { je = e.getJavaException(); } catch (x) { } }
            if (je == null) {
                console.log(tag + ' javaException=null');
            } else {
                console.log(tag + ' java=' + je);
                try { console.log(tag + ' javaMsg=' + je.getMessage()); } catch (x) { }
                try {
                    var st = je.getStackTrace();
                    var m = st.length;
                    if (m > 40) m = 40;
                    for (var i = 0; i < m; i++) console.log(tag + ' |at ' + st[i]);
                } catch (x) { console.log(tag + ' stackDumpFail=' + x); }
            }
        } catch (x) { console.log(tag + ' dumpFail=' + x); }
    }

    // Phase 0: sanity probes (read-only, nothing is removed here).
    // These independent counts are used by the fail-safe below before mutation.
    var totalRecipeCount = -1;
    var outputProbeCount = -1;
    try {
        totalRecipeCount = event.countRecipes({});
        console.log('CCD0 all=' + totalRecipeCount);
    } catch (e) { dumpErr('CCD0', e); }
    try {
        var probe = [];
        for (var p in NOMAKE) probe.push(p);
        outputProbeCount = event.countRecipes({ output: probe });
        console.log('CCD0b outputFilter=' + outputProbeCount);
    } catch (e) { dumpErr('CCD0b', e); }

    // Phase 1: collect recipes only. Do not mutate the recipe event while iterating.
    const cc = [];
    let n = 0, first = '';
    var scanFailed = false;
    try {
        event.forEachRecipe({}, recipe => {
            n++;
            if (n === 1) { try { first = '' + recipe.getId(); } catch (e) { first = 'getIdERR'; } }
            let rid = '';
            try { rid = '' + recipe.getId(); } catch (e) { }
            if (rid.indexOf(NS) === 0) cc.push(recipe);
        });
        console.log('CCD2 loop-ok n=' + n + ' first=' + first + ' cc=' + cc.length);
    } catch (e) {
        scanFailed = true;
        dumpErr('CCD2', e);
        console.log('CCD2 loop-partial n=' + n + ' first=' + first + ' cc=' + cc.length);
    }

    // Resolve a recipe's exact output ID without using broad type/namespace filters.
    function getOutputId(rc) {
        var out = '';
        try {
            var j = rc.json;
            if (j != null && j.has('result')) {
                var r = j.get('result');
                if (r.isJsonPrimitive()) {
                    out = '' + r.getAsString();
                } else if (r.isJsonObject()) {
                    var o = r.getAsJsonObject();
                    if (o.has('item') && o.get('item').isJsonPrimitive()) {
                        out = '' + o.get('item').getAsString();
                    }
                }
            }
        } catch (e) { }
        if (out === '') {
            try {
                if (rc.outputItems != null && rc.outputItems.size() > 0) {
                    out = '' + rc.outputItems.get(0).getId();
                }
            } catch (e) { }
        }
        return out;
    }

    // Phase 2: dry-run first, compare against the independent KubeJS output filter,
    // and only then remove exact IDs. If the environment differs unexpectedly,
    // fail open (keep recipes) and emit a diagnostic instead of risking a wipe.
    function phase2(list) {
        var candidates = [];
        var skip = 0, outFail = 0;

        // Conservative safety bounds for this exact 1.18.2 modpack profile.
        var MAX_TOTAL_RECIPES = 30000;
        var MAX_CRYSTALCRAFT_RECIPES = 6000;
        var MAX_REMOVALS = 800;

        if (scanFailed || totalRecipeCount < 1 || totalRecipeCount > MAX_TOTAL_RECIPES ||
                n < 1 || n > MAX_TOTAL_RECIPES || list.length > MAX_CRYSTALCRAFT_RECIPES ||
                outputProbeCount < 0) {
            console.log('CCSAFE ABORT preflight scanFailed=' + scanFailed +
                ' total=' + totalRecipeCount + ' scanned=' + n + ' cc=' + list.length +
                ' outputProbe=' + outputProbeCount + ' reason=unexpected_recipe_registry');
            return;
        }

        for (var i = 0; i < list.length; i++) {
            var rc = list[i];
            var rid = '';
            try { rid = '' + rc.getId(); } catch (e) { skip++; continue; }
            if (rid.indexOf(NS) !== 0) { skip++; continue; }
            var out = getOutputId(rc);
            if (out === '') { outFail++; continue; }
            if (NOMAKE[out] === 1) candidates.push({ id: rid, output: out });
            else skip++;
        }

        if (candidates.length > MAX_REMOVALS || candidates.length !== outputProbeCount || outFail > 0) {
            console.log('CCSAFE ABORT dryRun=' + candidates.length +
                ' outputProbe=' + outputProbeCount + ' outFail=' + outFail +
                ' max=' + MAX_REMOVALS + ' reason=counts_do_not_match');
            return;
        }

        console.log('CCSAFE PASS total=' + totalRecipeCount + ' scanned=' + n +
            ' cc=' + list.length + ' targetRemovals=' + candidates.length +
            ' outputProbe=' + outputProbeCount);

        var rm = 0, fail = 0;
        for (var k = 0; k < candidates.length; k++) {
            try {
                event.remove({ id: candidates[k].id }); // map form ONLY — exact recipe ID.
                rm++;
            } catch (e) {
                fail++;
                if (fail <= 3) dumpErr('CCRMFAIL ' + candidates[k].id, e);
            }
        }
        console.log('CCDONE cc=' + list.length + ' rm=' + rm + ' fail=' + fail +
            ' skip=' + skip + ' outFail=' + outFail + ' expected=' + outputProbeCount);
    }
    phase2(cc);
});
