// Remove crafting recipes for TACZ guns only (guns drop from bosses).
// Ammo, attachments, ammo boxes and the gun smith table stay craftable.
//
// KubeJS 1802.5.5 safety: never use a plain string filter with event.remove().
// Collect IDs first, enforce a conservative budget, then remove exact map-form IDs.
onEvent('recipes', event => {
    var scanned = 0;
    var gunIds = [];
    var scanFailed = false;

    try {
        event.forEachRecipe({}, recipe => {
            scanned++;
            var rid = '';
            try { rid = '' + recipe.getId(); } catch (e) { }
            if (rid.indexOf('tacz:gun/') === 0) gunIds.push(rid);
        });
    } catch (e) {
        scanFailed = true;
        console.log('TACZSAFE scan-error=' + e);
        try { console.log('TACZSAFE stack=' + e.stack); } catch (x) { }
    }

    // Current profile: 11,172 total recipes and 37 gun recipes.
    // If a future mod update changes the registry unexpectedly, do not mutate it.
    if (scanFailed || scanned < 1 || scanned > 30000 || gunIds.length > 100) {
        console.log('TACZSAFE ABORT scanned=' + scanned + ' gunRecipes=' + gunIds.length +
            ' scanFailed=' + scanFailed + ' reason=unexpected_recipe_registry');
        return;
    }

    var removed = 0;
    var failed = 0;
    for (var i = 0; i < gunIds.length; i++) {
        try {
            event.remove({ id: gunIds[i] }); // exact ID, map-form filter only.
            removed++;
        } catch (e) {
            failed++;
            if (failed <= 3) console.log('TACZSAFE remove-error id=' + gunIds[i] + ' error=' + e);
        }
    }

    console.log('TACZSAFE PASS scanned=' + scanned + ' gunRecipes=' + gunIds.length +
        ' removed=' + removed + ' failed=' + failed);
});
