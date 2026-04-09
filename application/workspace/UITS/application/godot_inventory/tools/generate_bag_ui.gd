extends SceneTree

const OUTPUT_SCENE_PATH := "res://scenes/bag_ui.tscn"
const BLUEPRINT_PATH := "res://bag.bp"
const MAIN_SCRIPT := "res://scripts/main.gd"
const LAYOUT_PATH := "res://layout/bag_dark_layout.json"

const BUTTON_TEXTS := {
	"TabEquipment": "装备",
	"TabItem": "道具",
	"TabMaterial": "材料",
	"TabCurrency": "通货",
	"Item01": "x01",
	"Item02": "x18",
	"Item03": "x06",
	"Item04": "x01",
	"Item05": "x03",
	"Item06": "x01",
	"Item07": "x01",
	"Item08": "x12840",
	"Item09": "",
	"Item10": "",
	"Item11": "",
	"Item12": "",
	"CapacityLabel": "08 / 12",
	"CloseButton": "×"
}

const TEXTURE_PATHS := {
	"BackdropArt": "res://assets/ui/scene_bg.png",
	"CapacityPlate": "res://assets/ui/capacity_plate.png",
	"CloseButton": "res://assets/ui/close_button_bg.png",
	"InventoryPanelArt": "res://assets/ui/inventory_panel_bg.png"
}

const TAB_ICON_PATHS := {
	"TabEquipment": "res://assets/icons/tab_equipment.png",
	"TabItem": "res://assets/icons/tab_item.png",
	"TabMaterial": "res://assets/icons/tab_material.png",
	"TabCurrency": "res://assets/icons/tab_currency.png"
}

const TAB_IDLE_TEXTURE := "res://assets/ui/tab_idle.png"
const TAB_ACTIVE_TEXTURE := "res://assets/ui/tab_active.png"
const ITEM_CARD_TEXTURE := "res://assets/ui/item_card_bg.png"

const ITEM_BUTTON_NAMES := [
	"Item01",
	"Item02",
	"Item03",
	"Item04",
	"Item05",
	"Item06",
	"Item07",
	"Item08",
	"Item09",
	"Item10",
	"Item11",
	"Item12"
]

const ITEM_ICON_CHILD_NAME := "ItemIcon"
const ITEM_QUANTITY_CHILD_NAME := "QuantityLabel"

func _init() -> void:
	var blueprint_nodes := _parse_blueprint(BLUEPRINT_PATH)
	if blueprint_nodes.is_empty():
		push_error("bag.bp did not produce any scene nodes.")
		quit(1)
		return

	var layout := _load_layout(LAYOUT_PATH)
	if layout.is_empty():
		push_error("Failed to load layout JSON: %s" % LAYOUT_PATH)
		quit(1)
		return

	var root := _build_scene(blueprint_nodes, layout)
	var packed := PackedScene.new()
	var pack_result := packed.pack(root)
	if pack_result != OK:
		push_error("Failed to pack generated scene.")
		root.free()
		quit(1)
		return

	var save_result := ResourceSaver.save(packed, OUTPUT_SCENE_PATH)
	root.free()
	if save_result != OK:
		push_error("Failed to save generated scene to %s" % OUTPUT_SCENE_PATH)
		quit(1)
		return

	var loaded_scene: PackedScene = load(OUTPUT_SCENE_PATH)
	if loaded_scene == null:
		push_error("Failed to reload generated scene.")
		quit(1)
		return

	var instance := loaded_scene.instantiate()
	var missing := _find_missing_paths(instance, blueprint_nodes)
	instance.free()
	if not missing.is_empty():
		push_error("Generated scene is missing blueprint nodes: %s" % ", ".join(missing))
		quit(1)
		return

	print("Generated Godot UI scene: %s" % OUTPUT_SCENE_PATH)
	quit()


func _parse_blueprint(file_path: String) -> Array:
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		return []

	var parsing_tree := false
	var stack: Array[String] = []
	var result: Array = []

	while not file.eof_reached():
		var raw_line := file.get_line()
		var line := raw_line.rstrip("\r")

		if line == "[Tree]":
			parsing_tree = true
			continue
		if parsing_tree and line.begins_with("[") and line != "[Tree]":
			break
		if not parsing_tree or line.strip_edges() == "":
			continue

		var depth := _line_depth(line)
		var cleaned := _line_without_tree_prefix(line)
		var separator := cleaned.find(":")
		if separator == -1:
			continue

		var name := cleaned.substr(0, separator).strip_edges()
		var type_name := cleaned.substr(separator + 1).strip_edges()

		while stack.size() > depth:
			stack.pop_back()

		var parent_path := "" if depth == 0 else stack[depth - 1]
		var path := name if parent_path == "" else "%s/%s" % [parent_path, name]
		stack.append(path)
		result.append({
			"name": name,
			"type": type_name,
			"path": path,
			"parent_path": parent_path,
			"depth": depth
		})

	return result


func _line_depth(line: String) -> int:
	var remaining := line
	var depth := 0

	while remaining.begins_with("│  ") or remaining.begins_with("   "):
		remaining = remaining.substr(3)
		depth += 1

	if remaining.begins_with("├─ ") or remaining.begins_with("└─ "):
		depth += 1

	return depth


func _line_without_tree_prefix(line: String) -> String:
	var remaining := line

	while remaining.begins_with("│  ") or remaining.begins_with("   "):
		remaining = remaining.substr(3)

	if remaining.begins_with("├─ ") or remaining.begins_with("└─ "):
		remaining = remaining.substr(3)

	return remaining


func _instantiate_node(type_name: String) -> Node:
	var node: Node = ClassDB.instantiate(type_name)
	if node == null:
		push_error("Unsupported node type in blueprint: %s" % type_name)
	return node


func _load_layout(file_path: String) -> Dictionary:
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		return {}

	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}

	var layout: Dictionary = parsed
	var regions: Array = layout.get("regions", [])
	var mapped := {}
	for region in regions:
		var region_dict: Dictionary = region
		mapped[region_dict.get("kind", "")] = region_dict
	layout["regions_by_kind"] = mapped
	return layout


func _build_scene(blueprint_nodes: Array, layout: Dictionary) -> Control:
	var lookup := {}
	var root_info: Dictionary = blueprint_nodes[0]
	var root := _instantiate_node(root_info["type"]) as Control
	root.name = "RootCanvas"
	root.layout_mode = 3
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.grow_horizontal = Control.GROW_DIRECTION_BOTH
	root.grow_vertical = Control.GROW_DIRECTION_BOTH
	root.script = load(MAIN_SCRIPT)
	lookup[root_info["path"]] = root

	for index in range(1, blueprint_nodes.size()):
		var node_info: Dictionary = blueprint_nodes[index]
		var node := _instantiate_node(node_info["type"])
		node.name = node_info["name"]
		var parent: Node = lookup.get(node_info["parent_path"])
		parent.add_child(node)
		node.owner = root
		lookup[node_info["path"]] = node

	_apply_scene_properties(root, lookup, layout)
	return root


func _apply_scene_properties(root: Control, lookup: Dictionary, layout: Dictionary) -> void:
	var nodes_by_name := {}
	for path in lookup.keys():
		var node: Node = lookup[path]
		nodes_by_name[node.name] = node

	var canvas: Dictionary = layout.get("canvas", {})
	root.custom_minimum_size = Vector2(canvas.get("width", 1440), canvas.get("height", 900))

	_full_rect(nodes_by_name["Background"])
	(nodes_by_name["Background"] as ColorRect).color = Color(0.027451, 0.031373, 0.047059, 1)

	_full_rect(nodes_by_name["BackdropArt"])
	var backdrop := nodes_by_name["BackdropArt"] as TextureRect
	backdrop.texture = load(TEXTURE_PATHS["BackdropArt"])
	backdrop.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	backdrop.stretch_mode = TextureRect.STRETCH_SCALE
	backdrop.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.move_child(backdrop, 1)

	var capacity_region := _require_region(layout, "capacity")
	var tabs_region := _require_region(layout, "tabs")
	var grid_region := _require_region(layout, "grid")
	var close_region := _require_region(layout, "close")

	_texture_rect_region(nodes_by_name["CapacityPlate"], capacity_region, TEXTURE_PATHS["CapacityPlate"])
	_label_region(nodes_by_name["CapacityLabel"], capacity_region, BUTTON_TEXTS["CapacityLabel"], 20, HORIZONTAL_ALIGNMENT_CENTER)

	_rect_region(nodes_by_name["CloseButton"], close_region)
	var close_button := nodes_by_name["CloseButton"] as Button
	close_button.text = BUTTON_TEXTS["CloseButton"]
	close_button.focus_mode = Control.FOCUS_NONE
	close_button.add_theme_font_size_override("font_size", 26)
	close_button.add_theme_stylebox_override("normal", _make_stylebox(TEXTURE_PATHS["CloseButton"], 16))
	close_button.add_theme_stylebox_override("hover", _make_stylebox(TEXTURE_PATHS["CloseButton"], 16))
	close_button.add_theme_stylebox_override("pressed", _make_stylebox(TEXTURE_PATHS["CloseButton"], 16))
	close_button.add_theme_stylebox_override("focus", _make_stylebox(TEXTURE_PATHS["CloseButton"], 16))

	_rect_region(nodes_by_name["Tabs"], tabs_region)
	var tabs := nodes_by_name["Tabs"] as VBoxContainer
	tabs.add_theme_constant_override("separation", 9)

	for tab_name in ["TabEquipment", "TabItem", "TabMaterial", "TabCurrency"]:
		var tab_button := nodes_by_name[tab_name] as Button
		tab_button.custom_minimum_size = Vector2(tabs_region["width"], 80)
		tab_button.text = BUTTON_TEXTS[tab_name]
		tab_button.focus_mode = Control.FOCUS_NONE
		tab_button.icon = load(TAB_ICON_PATHS[tab_name])
		tab_button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		tab_button.icon_alignment = HORIZONTAL_ALIGNMENT_LEFT
		tab_button.expand_icon = false
		tab_button.add_theme_constant_override("h_separation", 8)
		tab_button.add_theme_constant_override("icon_max_width", 24)
		tab_button.add_theme_font_size_override("font_size", 18)
		var is_first: bool = tab_name == "TabEquipment"
		var tab_tex := TAB_ACTIVE_TEXTURE if is_first else TAB_IDLE_TEXTURE
		tab_button.add_theme_stylebox_override("normal", _make_stylebox(tab_tex, 18))
		tab_button.add_theme_stylebox_override("hover", _make_stylebox(TAB_ACTIVE_TEXTURE, 18))
		tab_button.add_theme_stylebox_override("pressed", _make_stylebox(TAB_ACTIVE_TEXTURE, 18))
		tab_button.add_theme_stylebox_override("focus", _make_stylebox(TAB_ACTIVE_TEXTURE, 18))

	_rect_region(nodes_by_name["InventoryPanel"], grid_region)
	_full_rect(nodes_by_name["InventoryPanelArt"])
	(nodes_by_name["InventoryPanelArt"] as TextureRect).texture = load(TEXTURE_PATHS["InventoryPanelArt"])
	(nodes_by_name["InventoryPanelArt"] as TextureRect).stretch_mode = TextureRect.STRETCH_SCALE
	(nodes_by_name["InventoryPanelArt"] as TextureRect).mouse_filter = Control.MOUSE_FILTER_IGNORE

	var grid := nodes_by_name["GridContainer"] as GridContainer
	_rect(grid, 12, 12, int(grid_region["width"]) - 12, int(grid_region["height"]) - 12)
	grid.columns = 3
	grid.add_theme_constant_override("h_separation", 11)
	grid.add_theme_constant_override("v_separation", 10)

	for item_name in ITEM_BUTTON_NAMES:
		var item_button := nodes_by_name[item_name] as Button
		item_button.custom_minimum_size = Vector2(113, 108)
		item_button.text = ""
		item_button.focus_mode = Control.FOCUS_NONE
		item_button.add_theme_stylebox_override("normal", _make_stylebox(ITEM_CARD_TEXTURE, 18))
		item_button.add_theme_stylebox_override("hover", _make_stylebox(ITEM_CARD_TEXTURE, 18))
		item_button.add_theme_stylebox_override("pressed", _make_stylebox(ITEM_CARD_TEXTURE, 18))
		_prepare_item_button(root, item_button)


func _require_region(layout: Dictionary, kind: String) -> Dictionary:
	var regions_by_kind: Dictionary = layout.get("regions_by_kind", {})
	return regions_by_kind.get(kind, {"x": 0, "y": 0, "width": 0, "height": 0})


func _full_rect(node: Control) -> void:
	node.layout_mode = 1
	node.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


func _rect_region(node: Control, region: Dictionary) -> void:
	_rect(node, int(region["x"]), int(region["y"]), int(region["x"]) + int(region["width"]), int(region["y"]) + int(region["height"]))


func _texture_rect_region(node: TextureRect, region: Dictionary, texture_path: String) -> void:
	_rect_region(node, region)
	node.texture = load(texture_path)
	node.stretch_mode = TextureRect.STRETCH_SCALE
	node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	node.mouse_filter = Control.MOUSE_FILTER_IGNORE


func _label_region(node: Label, region: Dictionary, text: String, font_size: int, alignment: HorizontalAlignment) -> void:
	_rect_region(node, region)
	node.text = text
	node.horizontal_alignment = alignment
	node.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	node.add_theme_font_size_override("font_size", font_size)


func _prepare_item_button(root: Node, button: Button) -> void:
	var icon_node := button.get_node_or_null(ITEM_ICON_CHILD_NAME) as TextureRect
	if icon_node == null:
		icon_node = TextureRect.new()
		icon_node.name = ITEM_ICON_CHILD_NAME
		button.add_child(icon_node)
		icon_node.owner = root
	icon_node.mouse_filter = Control.MOUSE_FILTER_IGNORE
	icon_node.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon_node.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_rect(icon_node, 18, 14, 72, 68)

	var quantity_label := button.get_node_or_null(ITEM_QUANTITY_CHILD_NAME) as Label
	if quantity_label == null:
		quantity_label = Label.new()
		quantity_label.name = ITEM_QUANTITY_CHILD_NAME
		button.add_child(quantity_label)
		quantity_label.owner = root
	quantity_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	quantity_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	quantity_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	quantity_label.add_theme_font_size_override("font_size", 12)
	quantity_label.add_theme_color_override("font_color", Color(0.94902, 0.960784, 0.996078, 1))
	quantity_label.add_theme_color_override("font_outline_color", Color(0.0313725, 0.0470588, 0.0784314, 1))
	quantity_label.add_theme_constant_override("outline_size", 2)
	_rect(quantity_label, 54, 78, 101, 102)


func _rect(node: Control, left: int, top: int, right: int, bottom: int) -> void:
	node.layout_mode = 1
	node.anchor_left = 0
	node.anchor_top = 0
	node.anchor_right = 0
	node.anchor_bottom = 0
	node.offset_left = left
	node.offset_top = top
	node.offset_right = right
	node.offset_bottom = bottom


func _make_stylebox(texture_path: String, margin: float) -> StyleBoxTexture:
	var style := StyleBoxTexture.new()
	style.texture = load(texture_path)
	style.set_texture_margin_all(margin)
	return style


func _find_missing_paths(instance: Node, blueprint_nodes: Array) -> Array[String]:
	var missing: Array[String] = []
	for node_info in blueprint_nodes:
		var expected_path: String = node_info["path"]
		var query_path := expected_path
		if query_path.begins_with("%s/" % instance.name):
			query_path = query_path.substr(instance.name.length() + 1)
		elif query_path == instance.name:
			query_path = ""

		var target: Node = instance if query_path == "" else instance.get_node_or_null(query_path)
		if target == null:
			missing.append(expected_path)
	return missing
