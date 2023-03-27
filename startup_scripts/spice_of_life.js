const $FoodValues = Java.loadClass("squeek.appleskin.api.food.FoodValues")
const KEEP_LIST = 12

/**
 * @param {Internal.Player} player 
 */
function syncFoodList(player) {
    player.sendData("naive_food_list", { naive_food_previous: player.persistentData.getList("naive_food_previous", 8) })
}

/**
 * Returns the food penalty of given food.
 * 
 * If update is true, also insert this food to eaten list
 * 
 * @param {Internal.ItemStack} food 
 * @param {Internal.Player} player 
 * @param {boolean} update 
 * @returns {number}
 */
function getFoodPenalty(food, player, update) {
    /**
     * @type {Special.Item[]}
     */
    let foodPreviousEaten = []
    let foodEatenTimes = 0
    player.persistentData.getList("naive_food_previous", 8).forEach(tag => {
        let foodId = tag.getAsString()
        if (food.id == foodId)
            foodEatenTimes++
        foodPreviousEaten.push(foodId)
    })

    if (update) {
        foodPreviousEaten.unshift(food.id)
        player.persistentData.put("naive_food_previous", NBT.toTagList(foodPreviousEaten.slice(0, KEEP_LIST)))
        syncFoodList(player)
    }

    return foodPreviousEaten.length < KEEP_LIST ? 1 : (KEEP_LIST - foodEatenTimes) / KEEP_LIST
}

if (Platform.getMods().containsKey("appleskin")) {
    ForgeEvents.onEvent("squeek.appleskin.api.event.FoodValuesEvent", event => {
        let penalty = getFoodPenalty(event.itemStack, event.player, false)
        let { hunger, saturationModifier } = event.defaultFoodValues
        event.modifiedFoodValues = new $FoodValues(hunger * penalty, saturationModifier)
    })
}

ItemEvents.foodEaten(event => {
    let player = event.player
    let item = event.item
    let foodData = player.foodData
    let { lastFoodLevel, foodLevel } = foodData
    let foodStat = item.item.foodProperties
    let { nutrition } = foodStat

    if (!foodStat.canAlwaysEat() && foodData.foodLevel == 20) {
        //Penalty: eating heavy food while having little hunger to be filled will give debuffs
        let filled = foodLevel - lastFoodLevel
        if (nutrition / filled >= 6) {
            player.tell(Component.translate("You feel dizzy after eating this much...").italic().aqua())
            player.potionEffects.add("nausea", nutrition / filled * 5 * 20, 0, false, false)
        }
    }
    let penalty = getFoodPenalty(item, player, true)
    let normed_nutrition = penalty * nutrition
    if (lastFoodLevel + normed_nutrition < foodLevel)
        foodData.setFoodLevel(lastFoodLevel + normed_nutrition)

})

PlayerEvents.loggedIn(event => {
    syncFoodList(event.player)
})

PlayerEvents.respawned(event => {
    event.player.persistentData.put("naive_food_previous", event.oldPlayer.persistentData.get("naive_food_previous"))
    syncFoodList(event.player)
})

ForgeEvents.onEvent("net.minecraftforge.event.entity.player.PlayerEvent$PlayerChangedDimensionEvent", event => {
    syncFoodList(event.entity)
})

EntityEvents.death("player", event => {
    event.player.persistentData.remove("naive_food_previous")
    syncFoodList(event.player)
})
