extends Control

const ITEM_BUTTON_PATHS := [
	"InventoryPanel/GridContainer/Item01",
	"InventoryPanel/GridContainer/Item02",
	"InventoryPanel/GridContainer/Item03",
	"InventoryPanel/GridContainer/Item04",
	"InventoryPanel/GridContainer/Item05",
	"InventoryPanel/GridContainer/Item06",
	"InventoryPanel/GridContainer/Item07",
	"InventoryPanel/GridContainer/Item08",
	"InventoryPanel/GridContainer/Item09",
	"InventoryPanel/GridContainer/Item10",
	"InventoryPanel/GridContainer/Item11",
	"InventoryPanel/GridContainer/Item12"
]

const TAB_BUTTON_PATHS := [
	"Tabs/TabEquipment",
	"Tabs/TabItem",
	"Tabs/TabMaterial",
	"Tabs/TabCurrency"
]

const TAB_CATEGORY_BY_NAME := {
	"TabEquipment": "equipment",
	"TabItem": "item",
	"TabMaterial": "material",
	"TabCurrency": "currency"
}

const TAB_ICON_BY_NAME := {
	"TabEquipment": "res://assets/icons/tab_equipment.png",
	"TabItem": "res://assets/icons/tab_item.png",
	"TabMaterial": "res://assets/icons/tab_material.png",
	"TabCurrency": "res://assets/icons/tab_currency.png"
}

const TEXTURE_PATHS := {
	"scene_bg": "res://assets/ui/scene_bg.png",
	"capacity_plate": "res://assets/ui/capacity_plate.png",
	"close_button": "res://assets/ui/close_button_bg.png",
	"inventory_panel": "res://assets/ui/inventory_panel_bg.png",
	"tab_idle": "res://assets/ui/tab_idle.png",
	"tab_active": "res://assets/ui/tab_active.png",
	"item_card": "res://assets/ui/item_card_bg.png",
	"item_selected": "res://assets/ui/item_card_selected.png"
}

const ITEM_ICON_CHILD_NAME := "ItemIcon"
const ITEM_QUANTITY_CHILD_NAME := "QuantityLabel"

const ITEMS := [
	{
		"title": "龙雀古剑",
		"subtitle": "装备 · 战刃",
		"category": "equipment",
		"quantity": 1,
		"icon_path": "res://assets/icons/item_sword.png",
		"stats": "攻击力 +248 / 会心 +12%",
		"detail": "主战用的暗纹长剑。"
	},
	{
		"title": "回灵丹",
		"subtitle": "道具 · 恢复",
		"category": "item",
		"quantity": 18,
		"icon_path": "res://assets/icons/item_potion.png",
		"stats": "恢复 1200 气血 / 持有 18",
		"detail": "用于续航的常备丹药。"
	},
	{
		"title": "离火符卷",
		"subtitle": "道具 · 卷轴",
		"category": "item",
		"quantity": 6,
		"icon_path": "res://assets/icons/item_scroll.png",
		"stats": "范围爆散 / 持有 6",
		"detail": "攻伐型法符卷轴。"
	},
	{
		"title": "玄甲护心盾",
		"subtitle": "装备 · 防具",
		"category": "equipment",
		"quantity": 1,
		"icon_path": "res://assets/icons/item_shield.png",
		"stats": "格挡 +18% / 生命 +520",
		"detail": "偏重稳固的护心盾。"
	},
	{
		"title": "踏云羽令",
		"subtitle": "材料 · 灵羽",
		"category": "material",
		"quantity": 3,
		"icon_path": "res://assets/icons/item_feather.png",
		"stats": "轻灵材料 / 持有 3",
		"detail": "用于轻甲与灵饰制作。"
	},
	{
		"title": "遗迹门钥",
		"subtitle": "材料 · 钥匙",
		"category": "material",
		"quantity": 1,
		"icon_path": "res://assets/icons/item_key.png",
		"stats": "遗迹开启 / 持有 1",
		"detail": "开启密门的关键门钥。"
	},
	{
		"title": "风行灵弓",
		"subtitle": "装备 · 远袭",
		"category": "equipment",
		"quantity": 1,
		"icon_path": "res://assets/icons/item_bow.png",
		"stats": "攻击 +176 / 攻速 +9%",
		"detail": "轻快的追风灵弓。"
	},
	{
		"title": "魂银钱匣",
		"subtitle": "通货 · 钱匣",
		"category": "currency",
		"quantity": 12840,
		"icon_path": "res://assets/icons/item_coin.png",
		"stats": "流通货币 / 持有 12840",
		"detail": "用于交易与锻造的标准通货。"
	}
]

@onready var background: ColorRect = $Background
@onready var backdrop_art: TextureRect = $BackdropArt
@onready var capacity_plate: TextureRect = $CapacityPlate
@onready var capacity_label: Label = $CapacityLabel
@onready var close_button: Button = $CloseButton
@onready var inventory_panel_art: TextureRect = $InventoryPanel/InventoryPanelArt

var item_buttons: Array[Button] = []
var item_icon_nodes: Array[TextureRect] = []
var item_quantity_labels: Array[Label] = []
var tab_buttons: Array[Button] = []
var visible_items: Array[Dictionary] = []
var active_category := "equipment"
var selected_item_index := 0


func _ready() -> void:
	_cache_nodes()
	_apply_dark_theme()
	_bind_tabs()
	_bind_item_buttons()
	close_button.pressed.connect(_on_close_pressed)
	_render_inventory()


func _cache_nodes() -> void:
	for path in ITEM_BUTTON_PATHS:
		var button := get_node(path) as Button
		item_buttons.append(button)
		item_icon_nodes.append(button.get_node(ITEM_ICON_CHILD_NAME) as TextureRect)
		item_quantity_labels.append(button.get_node(ITEM_QUANTITY_CHILD_NAME) as Label)

	for path in TAB_BUTTON_PATHS:
		tab_buttons.append(get_node(path) as Button)


func _apply_dark_theme() -> void:
	background.color = Color(0.027451, 0.031373, 0.047059, 1)
	backdrop_art.texture = load(TEXTURE_PATHS["scene_bg"])
	capacity_plate.texture = load(TEXTURE_PATHS["capacity_plate"])
	inventory_panel_art.texture = load(TEXTURE_PATHS["inventory_panel"])

	capacity_label.add_theme_font_size_override("font_size", 20)
	capacity_label.add_theme_color_override("font_color", Color(0.901961, 0.929412, 0.984314, 1))
	capacity_label.add_theme_color_override("font_outline_color", Color(0.0431373, 0.0627451, 0.101961, 1))
	capacity_label.add_theme_constant_override("outline_size", 2)

	close_button.text = "×"
	close_button.add_theme_font_size_override("font_size", 26)
	close_button.add_theme_color_override("font_color", Color(0.941176, 0.956863, 0.992157, 1))
	close_button.add_theme_color_override("font_hover_color", Color(1, 1, 1, 1))
	close_button.add_theme_color_override("font_pressed_color", Color(0.878431, 0.909804, 0.980392, 1))
	close_button.add_theme_stylebox_override("normal", _stylebox(TEXTURE_PATHS["close_button"], 16))
	close_button.add_theme_stylebox_override("hover", _stylebox(TEXTURE_PATHS["close_button"], 16, Color(1, 1, 1, 1)))
	close_button.add_theme_stylebox_override("pressed", _stylebox(TEXTURE_PATHS["close_button"], 16, Color(0.88, 0.91, 0.98, 1)))
	close_button.add_theme_stylebox_override("focus", _stylebox(TEXTURE_PATHS["close_button"], 16, Color(1, 1, 1, 1)))

	_apply_tab_styles()
	_apply_item_styles()


func _apply_tab_styles() -> void:
	for button in tab_buttons:
		var is_active: bool = TAB_CATEGORY_BY_NAME[button.name] == active_category
		button.icon = load(TAB_ICON_BY_NAME[button.name])
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.expand_icon = false
		button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.add_theme_constant_override("h_separation", 8)
		button.add_theme_constant_override("icon_max_width", 24)
		button.add_theme_font_size_override("font_size", 18)
		button.add_theme_color_override("font_color", Color(0.929412, 0.945098, 0.988235, 1) if is_active else Color(0.654902, 0.729412, 0.862745, 1))
		button.add_theme_color_override("font_hover_color", Color(0.964706, 0.980392, 1, 1))
		button.add_theme_color_override("font_pressed_color", Color(0.964706, 0.980392, 1, 1))

		var texture_key: String = "tab_active" if is_active else "tab_idle"
		button.add_theme_stylebox_override("normal", _stylebox(TEXTURE_PATHS[texture_key], 18))
		button.add_theme_stylebox_override("hover", _stylebox(TEXTURE_PATHS["tab_active"], 18))
		button.add_theme_stylebox_override("pressed", _stylebox(TEXTURE_PATHS["tab_active"], 18))
		button.add_theme_stylebox_override("focus", _stylebox(TEXTURE_PATHS["tab_active"], 18))


func _apply_item_styles() -> void:
	for button in item_buttons:
		button.custom_minimum_size = Vector2(113, 108)
		button.text = ""
		button.icon = null
		button.add_theme_stylebox_override("normal", _stylebox(TEXTURE_PATHS["item_card"], 18))
		button.add_theme_stylebox_override("hover", _stylebox(TEXTURE_PATHS["item_selected"], 18))
		button.add_theme_stylebox_override("pressed", _stylebox(TEXTURE_PATHS["item_selected"], 18))
		button.add_theme_stylebox_override("disabled", _stylebox(TEXTURE_PATHS["item_selected"], 18))


func _bind_tabs() -> void:
	for button in tab_buttons:
		button.pressed.connect(_on_tab_selected.bind(TAB_CATEGORY_BY_NAME[button.name]))


func _bind_item_buttons() -> void:
	for index in item_buttons.size():
		item_buttons[index].pressed.connect(_on_item_selected.bind(index))


func _on_tab_selected(category: String) -> void:
	active_category = category
	selected_item_index = 0
	_apply_tab_styles()
	_render_inventory()


func _render_inventory() -> void:
	visible_items.clear()
	for item in ITEMS:
		if active_category == item["category"]:
			visible_items.append(item)

	selected_item_index = clamp(selected_item_index, 0, max(visible_items.size() - 1, 0))
	capacity_label.text = "%02d / %02d" % [ITEMS.size(), item_buttons.size()]

	for index in item_buttons.size():
		var button := item_buttons[index]
		var icon_node := item_icon_nodes[index]
		var quantity_label := item_quantity_labels[index]
		if index < visible_items.size():
			var item: Dictionary = visible_items[index]
			button.visible = true
			icon_node.texture = load(item["icon_path"])
			icon_node.visible = true
			quantity_label.text = "x%s" % _format_quantity(int(item["quantity"]))
			quantity_label.visible = true
			button.tooltip_text = "%s\n%s\n%s\n%s" % [item["title"], item["subtitle"], item["stats"], item["detail"]]
			button.disabled = index == selected_item_index
		else:
			button.visible = false
			button.disabled = false
			icon_node.texture = null
			icon_node.visible = false
			quantity_label.text = ""
			quantity_label.visible = false


func _on_item_selected(index: int) -> void:
	if index >= visible_items.size():
		return

	selected_item_index = index
	for button_index in item_buttons.size():
		if button_index < visible_items.size():
			item_buttons[button_index].disabled = button_index == selected_item_index


func _on_close_pressed() -> void:
	get_tree().quit()


func _stylebox(texture_path: String, margin: float, modulate_color := Color(1, 1, 1, 1)) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = load(texture_path)
	style.modulate_color = modulate_color
	style.set_texture_margin_all(margin)
	return style


func _format_quantity(quantity: int) -> String:
	if quantity >= 10000:
		return "%.1fk" % (float(quantity) / 1000.0)
	return "%02d" % quantity
