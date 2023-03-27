const KEEP_LIST = 12

/**
 * Returns the food penalty of given food.
 * 
 * If update is true, also insert this food to eaten list
 * 
 * @param {Internal.ItemStack} food 
 * @param {Internal.Player} player 
 * @param {boolean} update 
 * @returns {[number, number]}
 */
function getFoodPenalty(food, player) {
    /**
     * @type {Special.Item[]}
     */
    let foodPreviousEaten = []
    let foodEatenTimes = 0

    if (player == null) { return [0, 0] }

    player.persistentData.getList("naive_food_previous", 8).forEach(tag => {
        let foodId = tag.getAsString()
        if (food.id == foodId)
            foodEatenTimes++
        foodPreviousEaten.push(foodId)
    })

    if (foodPreviousEaten.length < KEEP_LIST)
        return [1, -1]

    return [(KEEP_LIST - foodEatenTimes) / KEEP_LIST, foodEatenTimes]
}

ItemEvents.tooltip(event => {
    event.addAdvanced("#naive:edible", (stack, advanced, lines) => {
        let [penalty, times] = getFoodPenalty(stack, Client.player)
        let color = Color.GREEN
        if (penalty < 0.7)
            color = Color.YELLOW
        if (penalty < 0.4)
            color = Color.ORANGE_DYE
        if (penalty == 0)
            color = Color.DARK_RED
        if (times == -1)
            lines.add(Component.of("Eat 12 times to start suffering.").darkAqua())
        else {
            lines.add(Component.join(Component.of(" "), [Component.of("Food eaten:"), Component.of(`${times}/${KEEP_LIST}`).color(color)]))
            lines.add(Component.join(Component.of(" "), [Component.of("Efficiency:"), Component.of(`${(penalty * 100).toFixed(2)}%`).color(color)]))
        }
    })
})

NetworkEvents.fromServer("naive_food_list", event => {
    event.player.persistentData.put("naive_food_previous", event.data.get("naive_food_previous"))
})